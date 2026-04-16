import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getLists, removeCardFromList } from '../utils/lists';
import { getOwnedCards, toggleCard } from '../utils/storage';

export default function ListDetailScreen({ route, navigation }) {
  const { list: initialList } = route.params;
  const [cards, setCards] = useState(Object.values(initialList.cards || {}));
  const [owned, setOwned] = useState({});
  const [filter, setFilter] = useState('all');

  useFocusEffect(
    useCallback(() => {
      getOwnedCards().then(setOwned);
      // refresh list cards in case new ones were added
      getLists().then((lists) => {
        const updated = lists[initialList.id];
        if (updated) {
          setCards(Object.values(updated.cards || {}));
          navigation.setOptions({ title: updated.name });
        }
      });
    }, [initialList.id])
  );

  const handleToggle = async (cardId) => {
    const updated = await toggleCard(cardId);
    setOwned({ ...updated });
  };

  const handleRemove = (card) => {
    Alert.alert('Retirer de la liste', `Retirer "${card.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
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

  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Liste vide</Text>
        <Text style={styles.emptySub}>
          Ajoute des cartes depuis l'onglet Collection ou Recherche
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {ownedCount} / {cards.length} cartes
          </Text>
          <Text style={styles.progressPct}>
            {Math.round((ownedCount / cards.length) * 100)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(ownedCount / cards.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {['all', 'owned', 'missing'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.tabActive]}
            onPress={() => setFilter(f)}
          >
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
              style={[styles.cardCell, isOwned && styles.cardOwned]}
              onPress={() => handleToggle(item.id)}
              onLongPress={() => handleRemove(item)}
            >
              <Image
                source={{ uri: item.images?.small }}
                style={[styles.cardImage, !isOwned && styles.cardImageGray]}
                resizeMode="contain"
              />
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardSet} numberOfLines={1}>
                {item.set?.name}
              </Text>
              {isOwned && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 30,
  },
  empty: { color: '#888', fontSize: 15, fontWeight: '600' },
  emptySub: { color: '#555', fontSize: 13, marginTop: 8, textAlign: 'center' },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { color: '#ccc', fontSize: 13 },
  progressPct: { color: '#E63F00', fontSize: 13, fontWeight: '700' },
  progressBar: { height: 6, backgroundColor: '#2a2a4a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E63F00', borderRadius: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#16213e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  tabActive: { backgroundColor: '#E63F00', borderColor: '#E63F00' },
  tabText: { color: '#888', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  grid: { padding: 8 },
  cardCell: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#16213e',
    alignItems: 'center',
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardOwned: { borderColor: '#E63F00', borderWidth: 2 },
  cardImage: { width: '100%', aspectRatio: 0.72 },
  cardImageGray: { opacity: 0.35 },
  cardName: { color: '#ddd', fontSize: 10, marginTop: 3, paddingHorizontal: 4, textAlign: 'center' },
  cardSet: { color: '#666', fontSize: 9, paddingHorizontal: 4, textAlign: 'center' },
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
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
