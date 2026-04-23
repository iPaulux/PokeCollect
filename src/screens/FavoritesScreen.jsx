import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, ScrollView, useFocusEffect,
} from '../components/rn-web';
import {
  getFavoriteCards, getFavoriteSets, toggleFavoriteCard, toggleFavoriteSet,
  getOwnedCards, toggleCard, setCardGrading, getGradingInfo,
  getFavoriteProducts, toggleFavoriteProduct,
} from '../utils/storage';
import { fonts } from '../utils/theme';
import CardDetailModal from '../components/CardDetailModal';

const PRODUCT_IMG_FALLBACK = (setId) => `https://images.pokemontcg.io/${setId}/logo.png`;

// ─── Section déroulante ───────────────────────────────────────────────────────
function Section({ title, count, icon, open, onToggle, children }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
        <Text style={styles.sectionChevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FavoritesScreen() {
  const navigate = useNavigate();
  const [favCards, setFavCards]       = useState({});
  const [favSets, setFavSets]         = useState({});
  const [favProducts, setFavProducts] = useState({});
  const [owned, setOwned]             = useState({});
  const [selectedCard, setSelectedCard] = useState(null);

  // Sections ouvertes par défaut
  const [openSets, setOpenSets]         = useState(true);
  const [openCards, setOpenCards]       = useState(true);
  const [openProducts, setOpenProducts] = useState(true);

  useFocusEffect(useCallback(() => {
    getFavoriteCards().then(setFavCards);
    getFavoriteSets().then(setFavSets);
    getFavoriteProducts().then(setFavProducts);
    getOwnedCards().then(setOwned);
  }, []));

  const handleToggleFavoriteCard = async (card) => {
    setFavCards(await toggleFavoriteCard(card));
  };
  const handleToggleFavoriteSet = async (set) => {
    setFavSets(await toggleFavoriteSet(set));
  };
  const handleToggleFavoriteProduct = async (product) => {
    setFavProducts(await toggleFavoriteProduct(product));
  };
  const handleToggleOwned = async (cardId) => {
    setOwned(await toggleCard(cardId));
  };
  const handleSetGrading = async (cardId, data) => {
    setOwned(await setCardGrading(cardId, data));
  };

  const cardList    = Object.values(favCards);
  const setList     = Object.values(favSets);
  const productList = Object.values(favProducts);
  const totalFavs   = cardList.length + setList.length + productList.length;

  if (totalFavs === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>☆</Text>
        <Text style={styles.emptyTitle}>Aucun favori</Text>
        <Text style={styles.emptyText}>
          Appuie sur ☆ sur un set, une carte ou un produit pour l'ajouter ici.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Sets ── */}
        {setList.length > 0 && (
          <Section
            title="Sets"
            icon="🗂️"
            count={setList.length}
            open={openSets}
            onToggle={() => setOpenSets((v) => !v)}
          >
            {setList.map((item) => {
              const isFav = !!favSets[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.setRow}
                  onPress={() => navigate(`/sets/${item.id}`, { state: { set: item } })}
                >
                  <Image source={{ uri: item.images?.logo }} style={styles.setLogo} resizeMode="contain" />
                  <View style={styles.setInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>{item.series} · {item.total} cartes</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.favBtn, isFav && styles.favBtnActive]}
                    onPress={(e) => { e.stopPropagation(); handleToggleFavoriteSet(item); }}
                  >
                    <Text style={[styles.favStar, isFav && styles.favStarActive]}>★</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </Section>
        )}

        {/* ── Cartes ── */}
        {cardList.length > 0 && (
          <Section
            title="Cartes"
            icon="🃏"
            count={cardList.length}
            open={openCards}
            onToggle={() => setOpenCards((v) => !v)}
          >
            {cardList.map((item) => {
              const isFav   = !!favCards[item.id];
              const isOwned = !!owned[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.cardRow}
                  onPress={() => setSelectedCard(item)}
                >
                  <Image source={{ uri: item.images?.small }} style={styles.cardThumb} resizeMode="contain" />
                  <View style={styles.cardInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      #{item.number}{item.set?.name ? `  ·  ${item.set.name}` : ''}
                    </Text>
                    {isOwned && <Text style={styles.ownedTag}>✓ Possédée</Text>}
                  </View>
                  <TouchableOpacity
                    style={[styles.favBtn, isFav && styles.favBtnActive]}
                    onPress={(e) => { e.stopPropagation(); handleToggleFavoriteCard(item); }}
                  >
                    <Text style={[styles.favStar, isFav && styles.favStarActive]}>★</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </Section>
        )}

        {/* ── Produits ── */}
        {productList.length > 0 && (
          <Section
            title="Produits"
            icon="🛍️"
            count={productList.length}
            open={openProducts}
            onToggle={() => setOpenProducts((v) => !v)}
          >
            {productList.map((item) => {
              const isFav = !!favProducts[item.id];
              return (
                <View key={item.id} style={styles.productRow}>
                  <img
                    src={item.image || PRODUCT_IMG_FALLBACK(item.setId)}
                    alt={item.nameFr || item.name}
                    style={{ width: 52, height: 64, objectFit: 'contain', borderRadius: 6, flexShrink: 0, marginRight: 12 }}
                    onError={(e) => { e.target.src = PRODUCT_IMG_FALLBACK(item.setId); }}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.nameFr || item.name}</Text>
                    <Text style={styles.itemMeta}>{item.setName}</Text>
                    <Text style={styles.productPrice}>{item.price}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.favBtn, isFav && styles.favBtnActive]}
                    onPress={() => handleToggleFavoriteProduct(item)}
                  >
                    <Text style={[styles.favStar, isFav && styles.favStarActive]}>★</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </Section>
        )}

      </ScrollView>

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
  content:   { padding: 12, paddingBottom: 30 },
  // Empty
  empty:      { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon:  { fontSize: 52, color: '#444', marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontFamily: fonts.bold, marginBottom: 8 },
  emptyText:  { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: '20px' },
  // Section déroulante
  section:        { marginBottom: 8, borderRadius: 12, overflow: 'hidden', border: '1px solid #2a2a4a' },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', padding: '12px 14px', gap: 8 },
  sectionIcon:    { fontSize: 16 },
  sectionTitle:   { color: '#fff', fontSize: 14, fontFamily: fonts.bold, flex: 1 },
  sectionBadge:   { backgroundColor: '#2a2a4a', borderRadius: 10, paddingLeft: 7, paddingRight: 7, paddingTop: 2, paddingBottom: 2 },
  sectionBadgeText: { color: '#aaa', fontSize: 11, fontFamily: fonts.bold },
  sectionChevron: { color: '#E63F00', fontSize: 16, fontFamily: fonts.bold, marginLeft: 2 },
  sectionBody:    { backgroundColor: '#1a1a2e', padding: '6px 10px 10px' },
  // Rows
  setRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, marginTop: 6, padding: 10, border: '1px solid #2a2a4a' },
  setLogo:   { width: 72, height: 40, marginRight: 12 },
  setInfo:   { flex: 1 },
  cardRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, marginTop: 6, padding: 10, border: '1px solid #2a2a4a' },
  cardThumb: { width: 44, height: 62, borderRadius: 4, marginRight: 12 },
  cardInfo:  { flex: 1 },
  productRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, marginTop: 6, padding: 10, border: '1px solid #2a2a4a' },
  productInfo:  { flex: 1 },
  productPrice: { color: '#E63F00', fontSize: 13, fontFamily: fonts.extrabold, marginTop: 3 },
  // Shared
  itemName: { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
  itemMeta: { color: '#888', fontSize: 11, marginTop: 2 },
  ownedTag: { color: '#4caf50', fontSize: 11, marginTop: 3, fontFamily: fonts.semibold },
  favBtn:       { padding: 6, borderRadius: 8, flexShrink: 0, marginLeft: 4 },
  favBtnActive: { backgroundColor: '#2e1f00' },
  favStar:       { fontSize: 20, color: '#444' },
  favStarActive: { color: '#f1c40f' },
});
