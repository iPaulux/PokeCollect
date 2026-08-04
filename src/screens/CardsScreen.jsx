import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, useWindowDimensions, useFocusEffect,
} from '../components/rn-web';
import { getOwnedCards, toggleCard, getFavoriteCards, toggleFavoriteCard, setCardGrading, getGradingInfo } from '../utils/storage';
import { fonts } from '../utils/theme';
import { getApiCache, setApiCache, CARDS_TTL } from '../utils/sharedCache';
import { pokemonApiUrl } from '../utils/api';
import CardDetailModal from '../components/CardDetailModal';

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    const parse = (n) => {
      const m = String(n).match(/^([a-zA-Z]*)(\d+)([a-zA-Z]*)$/);
      if (!m) return { prefix: String(n), num: 0, suffix: '' };
      return { prefix: m[1].toUpperCase(), num: parseInt(m[2], 10), suffix: m[3] };
    };
    const pa = parse(a.number), pb = parse(b.number);
    if (pa.prefix !== pb.prefix) {
      if (!pa.prefix) return -1;
      if (!pb.prefix) return 1;
      return pa.prefix.localeCompare(pb.prefix);
    }
    if (pa.num !== pb.num) return pa.num - pb.num;
    return pa.suffix.localeCompare(pb.suffix);
  });
}

export default function CardsScreen() {
  const { state } = useLocation();
  const set = state?.set;
  const { width } = useWindowDimensions();
  const CARD_WIDTH = Math.floor((Math.min(width, 600) - 16 - 24) / 3);
  const [cards, setCards] = useState([]);
  const [owned, setOwned] = useState({});
  const [favoriteCards, setFavoriteCards] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  const loadCards = useCallback(async () => {
    if (!set?.id) return;
    setLoading(true);
    setError(null);
    const cacheKey = `cards:${set.id}`;
    try {
      // 3-tiers : local SQLite → Supabase → API
      const cached = await getApiCache(cacheKey, CARDS_TTL);
      // Ne pas utiliser un tableau vide depuis le cache (= échec précédent mis en cache)
      if (cached && cached.length > 0) { setCards(sortCards(cached)); setLoading(false); return; }

      // pageSize max de pokemontcg.io = 250 ; on pagine si nécessaire
      const PAGE = 250;
      let page = 1;
      let all  = [];
      let total = Infinity;
      while (all.length < total) {
        const res = await fetch(pokemonApiUrl('/cards', { q: `set.id:${set.id}`, pageSize: PAGE, page }));
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`API ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`);
        }
        const data = await res.json();
        if (!Array.isArray(data.data)) throw new Error('Réponse API invalide');
        total = data.totalCount ?? data.data.length;
        all   = all.concat(data.data);
        if (data.data.length < PAGE) break;
        page++;
      }

      const result = sortCards(all);
      // Ne cacher que si on a effectivement des cartes
      if (result.length > 0) await setApiCache(cacheKey, result);
      setCards(result);
    } catch (e) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [set?.id]);

  useEffect(() => { loadCards(); }, [loadCards]);

  useFocusEffect(useCallback(() => {
    getOwnedCards().then(setOwned);
    getFavoriteCards().then(setFavoriteCards);
  }, []));

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

  const ownedCount = cards.filter((c) => owned[c.id]).length;
  const displayed = cards.filter((c) => {
    if (filter === 'owned') return owned[c.id];
    if (filter === 'missing') return !owned[c.id];
    return true;
  });

  if (!set) return (
    <View style={styles.center}>
      <Text style={{ color: '#888' }}>Set introuvable. Retourne à la collection.</Text>
    </View>
  );

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#E63F00" />
      <Text style={styles.loadingText}>Chargement des cartes...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>Impossible de charger les cartes</Text>
      <Text style={styles.errorDetail}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={loadCards}>
        <Text style={styles.retryBtnText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGridItem = ({ item }) => {
    const isOwned = !!owned[item.id];
    const isFav = !!favoriteCards[item.id];
    const grading = getGradingInfo(owned[item.id]);
    return (
      <TouchableOpacity
        style={[styles.cardCell, isOwned && styles.cardOwned, { width: CARD_WIDTH }]}
        onPress={() => setSelectedCard(item)}
      >
        <Image source={{ uri: item.images?.small }} style={[styles.cardImage, !isOwned && styles.cardImageGray]} resizeMode="contain" />
        <Text style={styles.cardNumber}>#{item.number}</Text>
        {isOwned && <View style={styles.badge}><Text style={styles.badgeText}>✓</Text></View>}
        {isFav && <View style={styles.favBadge}><Text style={styles.favBadgeText}>★</Text></View>}
        {grading && (
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeBadgeText}>{grading.company} {grading.grade}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item }) => {
    const isOwned = !!owned[item.id];
    const isFav = !!favoriteCards[item.id];
    const grading = getGradingInfo(owned[item.id]);
    return (
      <TouchableOpacity style={[styles.listRow, isOwned && styles.listRowOwned]} onPress={() => setSelectedCard(item)}>
        <Image source={{ uri: item.images?.small }} style={[styles.listThumb, !isOwned && styles.cardImageGray]} resizeMode="contain" />
        <View style={styles.listInfo}>
          <Text style={styles.listName}>{item.name}</Text>
          <Text style={styles.listMeta}>#{item.number}  ·  {item.rarity || '—'}</Text>
          {grading && (
            <View style={styles.gradePill}>
              <Text style={styles.gradePillText}>🏆 {grading.company} {grading.grade}</Text>
            </View>
          )}
        </View>
        <View style={styles.listBadges}>
          {isOwned && <Text style={styles.listOwned}>✓</Text>}
          {isFav && <Text style={styles.listFav}>★</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{ownedCount} / {cards.length} cartes</Text>
          <Text style={styles.progressPct}>{cards.length > 0 ? Math.round((ownedCount / cards.length) * 100) : 0}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: cards.length > 0 ? `${(ownedCount / cards.length) * 100}%` : '0%' }]} />
        </View>
      </View>

      <View style={styles.tabsRow}>
        <View style={styles.tabs}>
          {['all', 'owned', 'missing'].map((f) => (
            <TouchableOpacity key={f} style={[styles.tab, filter === f && styles.tabActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
                {f === 'all' ? 'Toutes' : f === 'owned' ? 'Possédées' : 'Manquantes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.viewToggle} onPress={() => setViewMode((v) => v === 'grid' ? 'list' : 'grid')}>
          <Text style={styles.viewToggleText}>{viewMode === 'grid' ? '☰' : '⊞'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        key={viewMode}
        data={displayed}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 3 : 1}
        contentContainerStyle={viewMode === 'grid' ? styles.grid : styles.listContainer}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
      />

      <CardDetailModal
        visible={!!selectedCard}
        card={selectedCard}
        owned={!!owned[selectedCard?.id]}
        onToggle={() => handleToggle(selectedCard.id)}
        favorited={!!favoriteCards[selectedCard?.id]}
        onToggleFavorite={() => handleToggleFavorite(selectedCard)}
        gradingData={getGradingInfo(owned[selectedCard?.id])}
        onSetGrading={(data) => handleSetGrading(selectedCard.id, data)}
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  loadingText: { color: '#ccc', marginTop: 12, fontSize: 14 },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { color: '#fff', fontSize: 16, fontFamily: fonts.bold, marginBottom: 6 },
  errorDetail: { color: '#888', fontSize: 12, marginBottom: 20, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { backgroundColor: '#E63F00', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
  progressContainer: { padding: '12px 16px', backgroundColor: '#16213e', borderBottom: '1px solid #2a2a4a' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { color: '#ccc', fontSize: 13 },
  progressPct: { color: '#E63F00', fontSize: 13, fontFamily: fonts.bold },
  progressBar: { height: 6, backgroundColor: '#2a2a4a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E63F00', borderRadius: 3 },
  tabsRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 8, paddingTop: 8, paddingBottom: 8, gap: 8 },
  tabs: { flex: 1, flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingTop: 7, paddingBottom: 7, borderRadius: 8, backgroundColor: '#16213e', alignItems: 'center', border: '1px solid #2a2a4a' },
  tabActive: { backgroundColor: '#E63F00', border: '1px solid #E63F00' },
  tabText: { color: '#888', fontSize: 12, fontFamily: fonts.semibold },
  tabTextActive: { color: '#fff' },
  viewToggle: { width: 36, height: 36, backgroundColor: '#16213e', borderRadius: 8, border: '1px solid #2a2a4a', justifyContent: 'center', alignItems: 'center' },
  viewToggleText: { fontSize: 18, color: '#aaa' },
  grid: { padding: 8 },
  cardCell: { margin: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: '#16213e', alignItems: 'center', paddingBottom: 4, border: '1px solid #2a2a4a', position: 'relative' },
  cardOwned: { border: '2px solid #E63F00' },
  cardImage: { width: '100%', aspectRatio: '0.72' },
  cardImageGray: { opacity: 0.35 },
  cardNumber: { color: '#888', fontSize: 10, marginTop: 2 },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#E63F00', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.bold },
  favBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: '#2e1f00', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  favBadgeText: { color: '#f1c40f', fontSize: 11 },
  gradeBadge: { position: 'absolute', bottom: 20, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', paddingTop: 2, paddingBottom: 2, alignItems: 'center' },
  gradeBadgeText: { color: '#f1c40f', fontSize: 9, fontFamily: fonts.bold },
  listContainer: { paddingHorizontal: 12, paddingVertical: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, marginBottom: 8, padding: 10, border: '1px solid #2a2a4a' },
  listRowOwned: { border: '1px solid #E63F00' },
  listThumb: { width: 50, height: 70, borderRadius: 4, marginRight: 12 },
  listInfo: { flex: 1 },
  listName: { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
  listMeta: { color: '#666', fontSize: 11, marginTop: 2 },
  gradePill: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#2e1f00', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  gradePillText: { color: '#f1c40f', fontSize: 10, fontFamily: fonts.bold },
  listBadges: { flexDirection: 'column', alignItems: 'center', gap: 4 },
  listOwned: { color: '#E63F00', fontSize: 16, fontFamily: fonts.bold },
  listFav: { color: '#f1c40f', fontSize: 16 },
});
