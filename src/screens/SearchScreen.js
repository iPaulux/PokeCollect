import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { getOwnedCards, toggleCard } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import AddToListModal from '../components/AddToListModal';
import { getFrToEnMap, resolveSearchTerm } from '../utils/pokemonNames';

const RARITIES = [
  { label: 'Toutes', value: null },
  { label: 'Commune', value: 'Common' },
  { label: 'Peu Commune', value: 'Uncommon' },
  { label: 'Rare', value: 'Rare' },
  { label: 'Rare Holo', value: 'Rare Holo' },
  { label: 'Rare Holo EX', value: 'Rare Holo EX' },
  { label: 'Rare Holo GX', value: 'Rare Holo GX' },
  { label: 'Rare Holo V', value: 'Rare Holo V' },
  { label: 'Ultra Rare', value: 'Rare Ultra' },
  { label: 'Promo', value: 'Promo' },
];

export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 16 - 24) / 3;
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState(null);
  const [cards, setCards] = useState([]);
  const [owned, setOwned] = useState({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [listModalCard, setListModalCard] = useState(null);
  const [translatedTerm, setTranslatedTerm] = useState(null); // pour afficher "Résultats pour X"
  const debounceRef = useRef(null);

  // Précharger la map FR→EN en arrière-plan dès l'ouverture de l'onglet
  useFocusEffect(
    useCallback(() => {
      getOwnedCards().then(setOwned);
      getFrToEnMap(); // warm-up du cache silencieux
    }, [])
  );

  const doSearch = useCallback(async (q, r) => {
    if (!q.trim() && !r) {
      setCards([]);
      setSearched(false);
      setTranslatedTerm(null);
      return;
    }
    setLoading(true);
    setSearched(true);

    // Résolution FR → EN
    let resolvedQ = q.trim();
    if (q.trim()) {
      const resolved = await resolveSearchTerm(q.trim());
      if (resolved.toLowerCase() !== q.trim().toLowerCase()) {
        setTranslatedTerm(resolved); // on va afficher "Résultats pour Charmander"
        resolvedQ = resolved;
      } else {
        setTranslatedTerm(null);
      }
    }

    const parts = [];
    if (resolvedQ) parts.push(`name:"*${resolvedQ}*"`);
    if (r) parts.push(`rarity:"${r}"`);

    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(
      parts.join(' ')
    )}&orderBy=name&pageSize=60&select=id,name,number,rarity,set.name,images`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setCards(data.data || []);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text, rarity), 600);
  };

  const handleRarityChange = (r) => {
    setRarity(r);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query, r);
  };

  const handleToggle = async (cardId) => {
    const updated = await toggleCard(cardId);
    setOwned({ ...updated });
  };

  return (
    <View style={styles.container}>
      {/* Search input */}
      <TextInput
        style={styles.search}
        placeholder="Rechercher par nom..."
        placeholderTextColor="#888"
        value={query}
        onChangeText={handleQueryChange}
        returnKeyType="search"
      />

      {/* Rarity filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rarityScroll}
        contentContainerStyle={styles.rarityRow}
      >
        {RARITIES.map((r) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.rarityBtn, rarity === r.value && styles.rarityBtnActive]}
            onPress={() => handleRarityChange(r.value)}
          >
            <Text
              style={[
                styles.rarityText,
                rarity === r.value && styles.rarityTextActive,
              ]}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E63F00" />
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Tape un nom ou sélectionne une rareté</Text>
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Aucun résultat</Text>
        </View>
      ) : (
        <>
          {translatedTerm && (
            <Text style={styles.translatedNote}>
              🔄 Recherche traduite : <Text style={styles.translatedWord}>{translatedTerm}</Text>
            </Text>
          )}
          <Text style={styles.resultCount}>{cards.length} carte(s) trouvée(s)</Text>
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => {
              const isOwned = !!owned[item.id];
              return (
                <View style={[styles.cardCell, isOwned && styles.cardOwned, { width: CARD_WIDTH }]}>
                  <TouchableOpacity style={styles.imgWrapper} onPress={() => handleToggle(item.id)}>
                    <Image
                      source={{ uri: item.images?.small }}
                      style={[styles.cardImage, !isOwned && styles.cardImageGray]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardSet} numberOfLines={1}>{item.set?.name}</Text>
                  {isOwned && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>✓</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.listBtn}
                    onPress={() => setListModalCard(item)}
                  >
                    <Text style={styles.listBtnText}>📋</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </>
      )}

      <AddToListModal
        visible={!!listModalCard}
        card={listModalCard}
        onClose={() => setListModalCard(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  search: {
    margin: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#16213e',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  rarityScroll: {
    flexGrow: 0,
  },
  rarityRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
    alignItems: 'center',
  },
  rarityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    alignSelf: 'flex-start',
  },
  rarityBtnActive: {
    backgroundColor: '#E63F00',
    borderColor: '#E63F00',
  },
  rarityText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  rarityTextActive: {
    color: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    color: '#555',
    fontSize: 14,
  },
  translatedNote: {
    color: '#888',
    fontSize: 11,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 2,
  },
  translatedWord: {
    color: '#E63F00',
    fontWeight: '700',
  },
  resultCount: {
    color: '#666',
    fontSize: 12,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  grid: {
    padding: 8,
  },
  cardCell: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#16213e',
    alignItems: 'center',
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardOwned: {
    borderColor: '#E63F00',
    borderWidth: 2,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 0.72,
  },
  imgWrapper: { width: '100%' },
  cardImageGray: {
    opacity: 0.35,
  },
  cardName: {
    color: '#ddd',
    fontSize: 10,
    marginTop: 3,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  cardSet: {
    color: '#666',
    fontSize: 9,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E63F00',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  listBtn: {
    position: 'absolute',
    bottom: 22,
    right: 2,
    padding: 2,
  },
  listBtnText: { fontSize: 12 },
});
