import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getOwnedCards, toggleCard } from '../utils/storage';
import { fonts } from '../utils/theme';
import { getCached, setCached } from '../utils/cache';
import CardDetailModal from '../components/CardDetailModal';

// Tri correct des cartes : numérique d'abord, puis alphanumériques (SV, TG, GG…)
function sortCards(cards) {
  return [...cards].sort((a, b) => {
    const parse = (n) => {
      const m = String(n).match(/^([a-zA-Z]*)(\d+)([a-zA-Z]*)$/);
      if (!m) return { prefix: String(n), num: 0, suffix: '' };
      return { prefix: m[1].toUpperCase(), num: parseInt(m[2], 10), suffix: m[3] };
    };
    const pa = parse(a.number);
    const pb = parse(b.number);
    if (pa.prefix !== pb.prefix) {
      // Cartes sans préfixe (numéros purs) en premier
      if (!pa.prefix) return -1;
      if (!pb.prefix) return 1;
      return pa.prefix.localeCompare(pb.prefix);
    }
    if (pa.num !== pb.num) return pa.num - pb.num;
    return pa.suffix.localeCompare(pb.suffix);
  });
}

export default function CardsScreen({ route }) {
  const { set } = route.params;
  const { width } = useWindowDimensions();
  // grid padding 8px each side + card margin 4px each side × 3 cols
  const CARD_WIDTH = (width - 16 - 24) / 3;
  const [cards, setCards] = useState([]);
  const [owned, setOwned] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    const cacheKey = `cards:${set.id}`;
    (async () => {
      const cached = await getCached(cacheKey);
      if (cached) { setCards(sortCards(cached)); setLoading(false); return; }
      const res = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=set.id:${set.id}&pageSize=500`
      );
      const data = await res.json();
      const result = sortCards(data.data || []);
      await setCached(cacheKey, result);
      setCards(result);
      setLoading(false);
    })();
  }, [set.id]);

  useFocusEffect(useCallback(() => { getOwnedCards().then(setOwned); }, []));

  const handleToggle = async (cardId) => {
    const updated = await toggleCard(cardId);
    setOwned({ ...updated });
  };

  const ownedCount = cards.filter((c) => owned[c.id]).length;
  const displayed = cards.filter((c) => {
    if (filter === 'owned') return owned[c.id];
    if (filter === 'missing') return !owned[c.id];
    return true;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E63F00" />
        <Text style={styles.loadingText}>Chargement des cartes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{ownedCount} / {cards.length} cartes</Text>
          <Text style={styles.progressPct}>
            {cards.length > 0 ? Math.round((ownedCount / cards.length) * 100) : 0}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {
            width: cards.length > 0 ? `${(ownedCount / cards.length) * 100}%` : '0%',
          }]} />
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {['all', 'owned', 'missing'].map((f) => (
          <TouchableOpacity key={f} style={[styles.tab, filter === f && styles.tabActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
              {f === 'all' ? 'Toutes' : f === 'owned' ? 'Possédées' : 'Manquantes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const isOwned = !!owned[item.id];
          return (
            <TouchableOpacity
              style={[styles.cardCell, isOwned && styles.cardOwned, { width: CARD_WIDTH }]}
              onPress={() => setSelectedCard(item)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: item.images?.small }}
                style={[styles.cardImage, !isOwned && styles.cardImageGray]}
                resizeMode="contain"
              />
              <Text style={styles.cardNumber}>#{item.number}</Text>
              {isOwned && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <CardDetailModal
        visible={!!selectedCard}
        card={selectedCard}
        owned={!!owned[selectedCard?.id]}
        onToggle={async () => {
          const updated = await handleToggle(selectedCard.id);
          // owned state is updated inside handleToggle already
        }}
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  loadingText: { color: '#ccc', marginTop: 12, fontSize: 14 },
  progressContainer: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#16213e',
    borderBottomWidth: 1, borderBottomColor: '#2a2a4a',
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { color: '#ccc', fontSize: 13 },
  progressPct: { color: '#E63F00', fontSize: 13, fontFamily: fonts.bold },
  progressBar: { height: 6, backgroundColor: '#2a2a4a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E63F00', borderRadius: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#16213e', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  tabActive: { backgroundColor: '#E63F00', borderColor: '#E63F00' },
  tabText: { color: '#888', fontSize: 12, fontFamily: fonts.semibold },
  tabTextActive: { color: '#fff' },
  grid: { padding: 8 },
  cardCell: {
    margin: 4, borderRadius: 8, overflow: 'hidden',
    backgroundColor: '#16213e', alignItems: 'center', paddingBottom: 4,
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  cardOwned: { borderColor: '#E63F00', borderWidth: 2 },
  cardImage: { width: '100%', aspectRatio: 0.72 },
  cardImageGray: { opacity: 0.35 },
  cardNumber: { color: '#888', fontSize: 10, marginTop: 2 },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#E63F00', borderRadius: 10,
    width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.bold },
});
