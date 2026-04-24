import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, useWindowDimensions, useFocusEffect,
} from '../components/rn-web';
import { fonts } from '../utils/theme';
import {
  getOwnedCards, getGradingInfo, getFavoriteCards,
  toggleFavoriteCard, toggleCard, setCardGrading,
} from '../utils/storage';
import { getApiCache, setApiCache, SETS_TTL, CARDS_TTL } from '../utils/sharedCache';
import { pokemonApiUrl } from '../utils/api';
import CardDetailModal from '../components/CardDetailModal';

/** Extrait le setId depuis un cardId (ex: "sv3pt5-152" → "sv3pt5", "sv1-1" → "sv1") */
function extractSetId(cardId) {
  const parts = cardId.split('-');
  let numIdx = parts.length - 1;
  while (numIdx > 0 && !/^\d+$/.test(parts[numIdx])) numIdx--;
  return parts.slice(0, numIdx).join('-') || parts[0];
}

export default function PokedexListScreen() {
  const { width } = useWindowDimensions();
  const CARD_WIDTH = Math.floor((Math.min(width, 600) - 16 - 24) / 3);

  const [cards, setCards]             = useState([]);
  const [owned, setOwned]             = useState({});
  const [favoriteCards, setFavoriteCards] = useState({});
  const [loading, setLoading]         = useState(true);
  const [viewMode, setViewMode]       = useState('grid');
  const [selectedCard, setSelectedCard] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ownedMap, favMap] = await Promise.all([getOwnedCards(), getFavoriteCards()]);
    setOwned(ownedMap);
    setFavoriteCards(favMap);

    const cardIds = Object.keys(ownedMap);
    if (cardIds.length === 0) { setCards([]); setLoading(false); return; }

    // Regrouper par setId
    const bySet = {};
    for (const id of cardIds) {
      const sid = extractSetId(id);
      if (!bySet[sid]) bySet[sid] = [];
      bySet[sid].push(id);
    }

    // Récupérer les dates de sortie des sets pour le tri (cache 7j)
    let setDates = {};
    try {
      let setsData = await getApiCache('sets:en', SETS_TTL);
      if (!setsData) {
        const setsRes = await fetch(pokemonApiUrl('/sets', { orderBy: '-releaseDate', pageSize: 250 })).then((r) => r.json());
        setsData = setsRes.data || [];
        await setApiCache('sets:en', setsData);
      }
      setsData.forEach((s) => { setDates[s.id] = s.releaseDate; });
    } catch (_) { /* fallback : tri lexicographique */ }

    // Trier les sets par releaseDate croissante
    const sortedSetIds = Object.keys(bySet).sort((a, b) => {
      const da = setDates[a] || a;
      const db = setDates[b] || b;
      return da.localeCompare(db);
    });

    // Récupérer les cartes pour chaque set et filtrer aux possédées (cache 30j)
    const allCards = [];
    for (const sid of sortedSetIds) {
      const ownedSet = new Set(bySet[sid]);
      try {
        let allSetCards = await getApiCache(`cards:${sid}`, CARDS_TTL);
        if (!allSetCards) {
          const res = await fetch(
            pokemonApiUrl('/cards', { q: `set.id:${sid}`, pageSize: 500, orderBy: 'number' })
          ).then((r) => r.json());
          allSetCards = res.data || [];
          await setApiCache(`cards:${sid}`, allSetCards);
        }
        const filtered = allSetCards.filter((c) => ownedSet.has(c.id));
        allCards.push(...filtered);
      } catch (_) { /* skip set si erreur */ }
    }

    setCards(allCards);
    setLoading(false);
  }, []);

  useFocusEffect(loadData);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Chargement de ta collection…</Text>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Aucune carte possédée</Text>
        <Text style={styles.emptySub}>
          Marque des cartes comme possédées depuis l'onglet Collection
        </Text>
      </View>
    );
  }

  const renderGridItem = ({ item }) => {
    const isOwned = !!owned[item.id];
    const grading = getGradingInfo(owned[item.id]);
    return (
      <TouchableOpacity
        style={[styles.cardCell, isOwned && styles.cardOwned, { width: CARD_WIDTH }]}
        onPress={() => setSelectedCard(item)}
      >
        <Image
          source={{ uri: item.images?.small }}
          style={[styles.cardImage, !isOwned && styles.cardImageGray]}
          resizeMode="contain"
        />
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSet} numberOfLines={1}>{item.set?.name}</Text>
        {isOwned && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        )}
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
    const grading = getGradingInfo(owned[item.id]);
    return (
      <TouchableOpacity
        style={[styles.listRow, isOwned && styles.listRowOwned]}
        onPress={() => setSelectedCard(item)}
      >
        <Image
          source={{ uri: item.images?.small }}
          style={[styles.listThumb, !isOwned && styles.cardImageGray]}
          resizeMode="contain"
        />
        <View style={styles.listInfo}>
          <Text style={styles.listName}>{item.name}</Text>
          <Text style={styles.listMeta}>
            #{item.number} · {item.set?.name}
          </Text>
          {grading && (
            <View style={styles.gradePill}>
              <Text style={styles.gradePillText}>🏆 {grading.company} {grading.grade}</Text>
            </View>
          )}
        </View>
        {isOwned && <Text style={styles.listOwnedMark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header info + toggle */}
      <View style={styles.header}>
        <Text style={styles.headerText}>{cards.length} carte{cards.length !== 1 ? 's' : ''} possédée{cards.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
        >
          <Text style={styles.viewToggleText}>{viewMode === 'grid' ? '☰' : '⊞'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        key={viewMode}
        data={cards}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 3 : 1}
        contentContainerStyle={viewMode === 'grid' ? styles.grid : styles.listContainer}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
      />

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
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 30 },
  loadingText: { color: '#888', fontSize: 14, fontFamily: fonts.regular },
  empty:     { color: '#888', fontSize: 15, fontFamily: fonts.semibold },
  emptySub:  { color: '#555', fontSize: 13, marginTop: 8, textAlign: 'center' },
  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#16213e', borderBottom: '1px solid #2a2a4a' },
  headerText:   { color: '#ccc', fontSize: 13, fontFamily: fonts.semibold },
  viewToggle:   { width: 36, height: 36, backgroundColor: '#1a1a2e', borderRadius: 8, border: '1px solid #2a2a4a', justifyContent: 'center', alignItems: 'center' },
  viewToggleText: { fontSize: 18, color: '#aaa' },
  // Grid
  grid:         { padding: 8 },
  cardCell:     { margin: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: '#16213e', alignItems: 'center', paddingBottom: 6, border: '1px solid #2a2a4a', position: 'relative' },
  cardOwned:    { border: '2px solid #E63F00' },
  cardImage:    { width: '100%', aspectRatio: '0.72' },
  cardImageGray:{ opacity: 0.35 },
  cardName:     { color: '#ddd', fontSize: 10, marginTop: 3, paddingLeft: 4, paddingRight: 4, textAlign: 'center', fontFamily: fonts.regular },
  cardSet:      { color: '#666', fontSize: 9, paddingLeft: 4, paddingRight: 4, textAlign: 'center' },
  badge:        { position: 'absolute', top: 4, right: 4, backgroundColor: '#E63F00', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText:    { color: '#fff', fontSize: 10, fontFamily: fonts.bold },
  gradeBadge:   { position: 'absolute', bottom: 24, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', paddingTop: 2, paddingBottom: 2, alignItems: 'center' },
  gradeBadgeText: { color: '#f1c40f', fontSize: 9, fontFamily: fonts.bold },
  // List
  listContainer: { paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8 },
  listRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, marginBottom: 8, padding: 10, border: '1px solid #2a2a4a' },
  listRowOwned: { border: '1px solid #E63F00' },
  listThumb:    { width: 50, height: 70, borderRadius: 4, marginRight: 12 },
  listInfo:     { flex: 1 },
  listName:     { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
  listMeta:     { color: '#666', fontSize: 11, marginTop: 2 },
  gradePill:    { marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#2e1f00', borderRadius: 6, paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2 },
  gradePillText:{ color: '#f1c40f', fontSize: 10, fontFamily: fonts.bold },
  listOwnedMark:{ color: '#E63F00', fontSize: 18, fontFamily: fonts.bold },
});
