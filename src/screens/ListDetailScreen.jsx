import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, Alert, useWindowDimensions, useFocusEffect,
} from '../components/rn-web';
import { getLists, removeCardFromList } from '../utils/lists';
import { fonts } from '../utils/theme';
import { getOwnedCards, toggleCard, getGradingInfo, getFavoriteCards, toggleFavoriteCard, setCardGrading } from '../utils/storage';
import CardDetailModal from '../components/CardDetailModal';

export default function ListDetailScreen({ onTitleChange }) {
  const { state } = useLocation();
  const initialList = state?.list;
  const { width } = useWindowDimensions();
  const CARD_WIDTH = Math.floor((Math.min(width, 600) - 16 - 24) / 3);
  const [cards, setCards] = useState(Object.values(initialList?.cards || {}));
  const [owned, setOwned] = useState({});
  const [favoriteCards, setFavoriteCards] = useState({});
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCard, setSelectedCard] = useState(null);

  useFocusEffect(useCallback(() => {
    getOwnedCards().then(setOwned);
    getFavoriteCards().then(setFavoriteCards);
    if (!initialList?.id) return;
    getLists().then((lists) => {
      const updated = lists[initialList.id];
      if (updated) {
        setCards(Object.values(updated.cards || {}));
        onTitleChange?.(updated.name);
      }
    });
  }, [initialList?.id]));

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

  const handleRemove = (card) => {
    Alert.alert('Retirer de la liste', `Retirer "${card.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive',
        onPress: async () => {
          await removeCardFromList(initialList.id, card.id);
          setCards((prev) => prev.filter((c) => c.id !== card.id));
        },
      },
    ]);
  };

  const ownedCount = cards.filter((c) => owned[c.id]).length;
  const displayed = cards.filter((c) => {
    if (filter === 'owned') return owned[c.id];
    if (filter === 'missing') return !owned[c.id];
    return true;
  });

  if (!initialList) return (
    <View style={styles.center}>
      <Text style={{ color: '#888' }}>Liste introuvable. Retourne en arrière.</Text>
    </View>
  );

  if (cards.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.empty}>Liste vide</Text>
      <Text style={styles.emptySub}>Ajoute des cartes depuis l'onglet Collection ou Recherche</Text>
    </View>
  );

  const renderGridItem = ({ item }) => {
    const isOwned = !!owned[item.id];
    const grading = getGradingInfo(owned[item.id]);
    return (
      <TouchableOpacity
        style={[styles.cardCell, isOwned && styles.cardOwned, { width: CARD_WIDTH }]}
        onPress={() => setSelectedCard(item)}
        onLongPress={() => handleRemove(item)}
      >
        <Image source={{ uri: item.images?.small }} style={[styles.cardImage, !isOwned && styles.cardImageGray]} resizeMode="contain" />
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSet} numberOfLines={1}>{item.set?.name}</Text>
        {isOwned && <View style={styles.badge}><Text style={styles.badgeText}>✓</Text></View>}
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
        onLongPress={() => handleRemove(item)}
      >
        <Image source={{ uri: item.images?.small }} style={[styles.listThumb, !isOwned && styles.cardImageGray]} resizeMode="contain" />
        <View style={styles.listInfo}>
          <Text style={styles.listName}>{item.name}</Text>
          <Text style={styles.listMeta}>{item.set?.name}</Text>
          {grading && (
            <View style={styles.gradePill}>
              <Text style={styles.gradePillText}>🏆 {grading.company} {grading.grade}</Text>
            </View>
          )}
        </View>
        {isOwned && <Text style={styles.listOwned}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{ownedCount} / {cards.length} cartes</Text>
          <Text style={styles.progressPct}>{Math.round((ownedCount / cards.length) * 100)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(ownedCount / cards.length) * 100}%` }]} />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 30 },
  empty: { color: '#888', fontSize: 15, fontFamily: fonts.semibold },
  emptySub: { color: '#555', fontSize: 13, marginTop: 8, textAlign: 'center' },
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
  cardCell: { margin: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: '#16213e', alignItems: 'center', paddingBottom: 6, border: '1px solid #2a2a4a', position: 'relative' },
  cardOwned: { border: '2px solid #E63F00' },
  cardImage: { width: '100%', aspectRatio: '0.72' },
  cardImageGray: { opacity: 0.35 },
  cardName: { color: '#ddd', fontSize: 10, marginTop: 3, paddingHorizontal: 4, textAlign: 'center', fontFamily: fonts.regular },
  cardSet: { color: '#666', fontSize: 9, paddingHorizontal: 4, textAlign: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#E63F00', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.bold },
  gradeBadge: { position: 'absolute', bottom: 24, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', paddingTop: 2, paddingBottom: 2, alignItems: 'center' },
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
  listOwned: { color: '#E63F00', fontSize: 18, fontFamily: fonts.bold },
});
