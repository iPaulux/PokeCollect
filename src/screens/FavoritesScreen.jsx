import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  View, Text, SectionList, TouchableOpacity, Image,
  StyleSheet, useFocusEffect,
} from '../components/rn-web';
import {
  getFavoriteCards, getFavoriteSets, toggleFavoriteCard, toggleFavoriteSet,
  getOwnedCards, toggleCard, setCardGrading, getGradingInfo,
} from '../utils/storage';
import { fonts } from '../utils/theme';
import CardDetailModal from '../components/CardDetailModal';

export default function FavoritesScreen() {
  const navigate = useNavigate();
  const [favCards, setFavCards] = useState({});
  const [favSets, setFavSets] = useState({});
  const [owned, setOwned] = useState({});
  const [selectedCard, setSelectedCard] = useState(null);

  useFocusEffect(useCallback(() => {
    getFavoriteCards().then(setFavCards);
    getFavoriteSets().then(setFavSets);
    getOwnedCards().then(setOwned);
  }, []));

  const handleToggleFavoriteCard = async (card) => {
    const updated = await toggleFavoriteCard(card);
    setFavCards({ ...updated });
  };

  const handleToggleFavoriteSet = async (set) => {
    const updated = await toggleFavoriteSet(set);
    setFavSets({ ...updated });
  };

  const handleToggleOwned = async (cardId) => {
    const updated = await toggleCard(cardId);
    setOwned({ ...updated });
  };

  const handleSetGrading = async (cardId, gradingData) => {
    const updated = await setCardGrading(cardId, gradingData);
    setOwned({ ...updated });
  };

  const cardList = Object.values(favCards);
  const setList = Object.values(favSets);

  if (cardList.length === 0 && setList.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>☆</Text>
        <Text style={styles.emptyTitle}>Aucun favori</Text>
        <Text style={styles.emptyText}>Appuie sur ☆ sur un set ou une carte pour l'ajouter ici.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={[
          ...(setList.length > 0 ? [{ title: 'Sets favoris', data: setList, type: 'sets' }] : []),
          ...(cardList.length > 0 ? [{ title: 'Cartes favorites', data: cardList, type: 'cards' }] : []),
        ]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item, section }) => {
          if (section.type === 'sets') {
            const isFav = !!favSets[item.id];
            return (
              <TouchableOpacity
                style={styles.setRow}
                onPress={() => navigate(`/sets/${item.id}`, { state: { set: item } })}
              >
                <Image source={{ uri: item.images?.logo }} style={styles.setLogo} resizeMode="contain" />
                <View style={styles.setInfo}>
                  <Text style={styles.setName}>{item.name}</Text>
                  <Text style={styles.setMeta}>{item.series} · {item.total} cartes</Text>
                </View>
                <TouchableOpacity style={[styles.favBtn, isFav && styles.favBtnActive]} onPress={() => handleToggleFavoriteSet(item)}>
                  <Text style={[styles.favStar, isFav && styles.favStarActive]}>★</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }
          const isFav = !!favCards[item.id];
          const isOwned = !!owned[item.id];
          return (
            <TouchableOpacity style={styles.cardRow} onPress={() => setSelectedCard(item)}>
              <Image source={{ uri: item.images?.small }} style={styles.cardThumb} resizeMode="contain" />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>#{item.number}{item.set?.name ? `  ·  ${item.set.name}` : ''}</Text>
                {isOwned && <Text style={styles.ownedTag}>✓ Possédée</Text>}
              </View>
              <TouchableOpacity style={[styles.favBtn, isFav && styles.favBtnActive]} onPress={() => handleToggleFavoriteCard(item)}>
                <Text style={[styles.favStar, isFav && styles.favStarActive]}>★</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <CardDetailModal
        visible={!!selectedCard}
        card={selectedCard}
        owned={!!owned[selectedCard?.id]}
        onToggle={() => handleToggleOwned(selectedCard.id)}
        favorited={!!favCards[selectedCard?.id]}
        onToggleFavorite={() => handleToggleFavoriteCard(selectedCard)}
        gradingData={getGradingInfo(owned[selectedCard?.id])}
        onSetGrading={(data) => selectedCard && handleSetGrading(selectedCard.id, data)}
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 12, paddingBottom: 30 },
  empty: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 52, color: '#444', marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontFamily: fonts.bold, marginBottom: 8 },
  emptyText: { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: '20px' },
  sectionTitle: { color: '#E63F00', fontSize: 12, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 12, marginBottom: 8, padding: 12, border: '1px solid #2a2a4a' },
  setLogo: { width: 72, height: 40, marginRight: 12 },
  setInfo: { flex: 1 },
  setName: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
  setMeta: { color: '#888', fontSize: 11, marginTop: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 12, marginBottom: 8, padding: 10, border: '1px solid #2a2a4a' },
  cardThumb: { width: 52, height: 72, borderRadius: 4, marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
  cardMeta: { color: '#888', fontSize: 11, marginTop: 2 },
  ownedTag: { color: '#4caf50', fontSize: 11, marginTop: 4, fontFamily: fonts.semibold },
  favBtn: { padding: 6, borderRadius: 8 },
  favBtnActive: { backgroundColor: '#2e1f00' },
  favStar: { fontSize: 22, color: '#f1c40f' },
  favStarActive: { color: '#f1c40f' },
});
