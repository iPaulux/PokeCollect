import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, ScrollView, useWindowDimensions, useFocusEffect,
} from '../components/rn-web';
import { getOwnedCards, toggleCard, getFavoriteCards, toggleFavoriteCard, setCardGrading, getGradingInfo } from '../utils/storage';
import { fonts } from '../utils/theme';
import CardDetailModal from '../components/CardDetailModal';
import { getFrToEnMap, resolveSearchTerm } from '../utils/pokemonNames';
import { pokemonApiUrl } from '../utils/api';

const PAGE_SIZE = 60;

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
  const CARD_WIDTH = Math.floor((Math.min(width, 600) - 16 - 24) / 3);

  const [query, setQuery]               = useState('');
  const [rarity, setRarity]             = useState(null);
  const [cards, setCards]               = useState([]);
  const [owned, setOwned]               = useState({});
  const [favoriteCards, setFavoriteCards] = useState({});
  const [loading, setLoading]           = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [searched, setSearched]         = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [translatedTerm, setTranslatedTerm] = useState(null);
  const [totalCount, setTotalCount]     = useState(0);
  const [page, setPage]                 = useState(1);
  // Mémorise la query résolue et la rareté courantes pour la pagination
  const activeQ = useRef('');
  const activeR = useRef(null);
  const debounceRef = useRef(null);

  useFocusEffect(useCallback(() => {
    getOwnedCards().then(setOwned);
    getFavoriteCards().then(setFavoriteCards);
    getFrToEnMap();
  }, []));

  // ─── Recherche initiale ────────────────────────────────────────────────────
  const doSearch = useCallback(async (q, r) => {
    if (!q.trim() && !r) {
      setCards([]); setSearched(false); setTranslatedTerm(null);
      setTotalCount(0); setPage(1);
      return;
    }
    setLoading(true);
    setSearched(true);
    setPage(1);

    let resolvedQ = q.trim();
    if (q.trim()) {
      const resolved = await resolveSearchTerm(q.trim());
      if (resolved.toLowerCase() !== q.trim().toLowerCase()) {
        setTranslatedTerm(resolved); resolvedQ = resolved;
      } else {
        setTranslatedTerm(null);
      }
    }

    activeQ.current = resolvedQ;
    activeR.current = r;

    const parts = [];
    if (resolvedQ) parts.push(`name:"*${resolvedQ}*"`);
    if (r) parts.push(`rarity:"${r}"`);

    const url = pokemonApiUrl('/cards', {
      q: parts.join(' '), orderBy: 'name',
      pageSize: PAGE_SIZE, page: 1,
      select: 'id,name,number,rarity,set.name,images',
    });
    try {
      const res  = await fetch(url);
      const data = await res.json();
      setCards(data.data || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      setCards([]); setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Charger la page suivante ─────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    const parts = [];
    if (activeQ.current) parts.push(`name:"*${activeQ.current}*"`);
    if (activeR.current) parts.push(`rarity:"${activeR.current}"`);

    const url = pokemonApiUrl('/cards', {
      q: parts.join(' '), orderBy: 'name',
      pageSize: PAGE_SIZE, page: nextPage,
      select: 'id,name,number,rarity,set.name,images',
    });
    try {
      const res  = await fetch(url);
      const data = await res.json();
      setCards((prev) => [...prev, ...(data.data || [])]);
      setPage(nextPage);
    } catch { /* on garde ce qu'on a */ }
    finally { setLoadingMore(false); }
  }, [loadingMore, page]);

  const handleQueryChange = (text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text, rarity), 600);
  };

  const handleRarityChange = (r) => {
    setRarity(r);
    clearTimeout(debounceRef.current);
    doSearch(query, r);
  };

  const handleToggle = async (cardId) => {
    const updated = await toggleCard(cardId);
    setOwned({ ...updated });
  };

  const handleToggleFavorite = async (card) => {
    const updated = await toggleFavoriteCard(card);
    setFavoriteCards({ ...updated });
  };

  const handleSetGrading = async (cardId, gradingData) => {
    const updated = await setCardGrading(cardId, gradingData);
    setOwned({ ...updated });
  };

  const hasMore = cards.length < totalCount;

  return (
    <View style={styles.container}>
      <input
        style={styles.search}
        placeholder="Rechercher par nom..."
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rarityScroll} contentContainerStyle={styles.rarityRow}>
        {RARITIES.map((r) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.rarityBtn, rarity === r.value && styles.rarityBtnActive]}
            onPress={() => handleRarityChange(r.value)}
          >
            <Text style={[styles.rarityText, rarity === r.value && styles.rarityTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E63F00" /></View>
      ) : !searched ? (
        <View style={styles.center}><Text style={styles.hint}>Tape un nom ou sélectionne une rareté</Text></View>
      ) : cards.length === 0 ? (
        <View style={styles.center}><Text style={styles.hint}>Aucun résultat</Text></View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          ListHeaderComponent={() => (
            <div style={{ paddingLeft: 12, paddingRight: 12 }}>
              {translatedTerm && (
                <p style={{ color: '#888', fontSize: 11, margin: '4px 0 2px', fontFamily: 'Poppins, sans-serif' }}>
                  🔄 Recherche traduite : <span style={{ color: '#E63F00', fontWeight: 700 }}>{translatedTerm}</span>
                </p>
              )}
              <p style={{ color: '#666', fontSize: 12, margin: '0 0 6px', fontFamily: 'Poppins, sans-serif' }}>
                {cards.length}{totalCount > cards.length ? ` / ${totalCount}` : ''} carte{cards.length > 1 ? 's' : ''} trouvée{cards.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
          ListFooterComponent={() =>
            hasMore ? (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  margin: '8px 16px 24px',
                  padding: '14px 0',
                  borderRadius: 12,
                  backgroundColor: 'transparent',
                  border: '1px solid #E63F00',
                  width: 'calc(100% - 32px)',
                  cursor: loadingMore ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 48, gap: 8,
                }}
              >
                {loadingMore ? (
                  <div style={{ width: 18, height: 18, border: '2px solid #E63F00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <span style={{ color: '#E63F00', fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                    Voir plus · {totalCount - cards.length} restantes
                  </span>
                )}
              </button>
            ) : null
          }
          renderItem={({ item }) => {
            const isOwned = !!owned[item.id];
            return (
              <TouchableOpacity
                style={[styles.cardCell, isOwned && styles.cardOwned, { width: CARD_WIDTH }]}
                onPress={() => setSelectedCard(item)}
              >
                <Image source={{ uri: item.images?.small }} style={[styles.cardImage, !isOwned && styles.cardImageGray]} resizeMode="contain" />
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSet} numberOfLines={1}>{item.set?.name}</Text>
                {isOwned && <View style={styles.badge}><Text style={styles.badgeText}>✓</Text></View>}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <CardDetailModal
        visible={!!selectedCard}
        card={selectedCard}
        owned={!!owned[selectedCard?.id]}
        onToggle={() => selectedCard && handleToggle(selectedCard.id)}
        favorited={!!favoriteCards[selectedCard?.id]}
        onToggleFavorite={() => selectedCard && handleToggleFavorite(selectedCard)}
        gradingData={getGradingInfo(owned[selectedCard?.id])}
        onSetGrading={(data) => selectedCard && handleSetGrading(selectedCard.id, data)}
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  search: {
    marginLeft: 12, marginRight: 12, marginTop: 12, marginBottom: 6,
    padding: '10px 14px',
    backgroundColor: '#16213e', borderRadius: 10,
    color: '#fff', fontSize: 15,
    border: '1px solid #2a2a4a',
    fontFamily: 'Poppins, sans-serif',
  },
  rarityScroll: { flexShrink: 0 },
  rarityRow: { paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 10, gap: 6, flexDirection: 'row' },
  rarityBtn: { paddingTop: 6, paddingBottom: 6, paddingLeft: 12, paddingRight: 12, borderRadius: 8, backgroundColor: '#16213e', border: '1px solid #2a2a4a' },
  rarityBtnActive: { backgroundColor: '#E63F00', border: '1px solid #E63F00' },
  rarityText: { color: '#888', fontSize: 12, fontFamily: fonts.semibold, whiteSpace: 'nowrap' },
  rarityTextActive: { color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { color: '#555', fontSize: 14 },
  grid: { paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 20 },
  cardCell: { margin: 4, borderRadius: 10, overflow: 'hidden', backgroundColor: '#16213e', alignItems: 'center', paddingBottom: 6, border: '1px solid #2a2a4a', position: 'relative' },
  cardOwned: { border: '2px solid #E63F00' },
  cardImage: { width: '100%', aspectRatio: '0.72' },
  cardImageGray: { opacity: 0.35 },
  cardName: { color: '#ddd', fontSize: 10, marginTop: 3, paddingHorizontal: 4, textAlign: 'center', fontFamily: fonts.regular },
  cardSet: { color: '#666', fontSize: 9, paddingHorizontal: 4, textAlign: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#E63F00', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.bold },
});
