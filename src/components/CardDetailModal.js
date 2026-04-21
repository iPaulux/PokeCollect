import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { getCached, setCached } from '../utils/cache';
import { fonts } from '../utils/theme';
import AddToListModal from './AddToListModal';

const RARITY_SHORT = {
  'Common':                        { label: 'C',    color: '#888' },
  'Uncommon':                      { label: 'U',    color: '#7ec8e3' },
  'Rare':                          { label: 'R',    color: '#f1c40f' },
  'Rare Holo':                     { label: 'H',    color: '#f1c40f' },
  'Rare Holo EX':                  { label: 'EX',   color: '#e67e22' },
  'Rare Holo GX':                  { label: 'GX',   color: '#e67e22' },
  'Rare Holo V':                   { label: 'V',    color: '#e67e22' },
  'Rare Holo VMAX':                { label: 'VMAX', color: '#e74c3c' },
  'Rare Holo VSTAR':               { label: 'VSTAR',color: '#e74c3c' },
  'Double Rare':                   { label: 'RR',   color: '#e67e22' },
  'Illustration Rare':             { label: 'AR',   color: '#9b59b6' },
  'Special Illustration Rare':     { label: 'SAR',  color: '#e91e8c' },
  'Hyper Rare':                    { label: 'HR',   color: '#f39c12' },
  'Ultra Rare':                    { label: 'UR',   color: '#e74c3c' },
  'Rare Ultra':                    { label: 'UR',   color: '#e74c3c' },
  'Rare Secret':                   { label: 'SR',   color: '#e74c3c' },
  'Rare Rainbow':                  { label: 'RR',   color: '#e91e8c' },
  'Shiny Rare':                    { label: 'S',    color: '#3498db' },
  'Shiny Ultra Rare':              { label: 'SSR',  color: '#9b59b6' },
  'ACE SPEC Rare':                 { label: 'ACE',  color: '#e74c3c' },
  'Trainer Gallery Rare Holo':     { label: 'TGH',  color: '#9b59b6' },
  'Rare Shining':                  { label: 'S',    color: '#3498db' },
  'Amazing Rare':                  { label: 'A',    color: '#27ae60' },
  'Promo':                         { label: 'PR',   color: '#2ecc71' },
};

const TYPE_COLORS = {
  Fire: '#c0392b',
  Water: '#2980b9',
  Grass: '#27ae60',
  Lightning: '#f39c12',
  Psychic: '#8e44ad',
  Fighting: '#d35400',
  Darkness: '#2c3e50',
  Metal: '#7f8c8d',
  Fairy: '#e91e8c',
  Dragon: '#1a5276',
  Colorless: '#555',
};

function PriceRow({ label, value, unit = '€', highlight }) {
  if (value == null) return null;
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, highlight && styles.priceHighlight]}>
        {Number(value).toFixed(2)} {unit}
      </Text>
    </View>
  );
}

export default function CardDetailModal({ visible, card, owned, onToggle, favorited, onToggleFavorite, onClose }) {
  const { width } = useWindowDimensions();
  const [fullCard, setFullCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  useEffect(() => {
    if (!visible || !card) return;
    setFullCard(null);
    setLoading(true);
    (async () => {
      const cacheKey = `fullcard:${card.id}`;
      const cached = await getCached(cacheKey);
      if (cached) { setFullCard(cached); setLoading(false); return; }
      try {
        const res = await fetch(`https://api.pokemontcg.io/v2/cards/${card.id}`);
        const data = await res.json();
        await setCached(cacheKey, data.data);
        setFullCard(data.data);
      } catch {}
      setLoading(false);
    })();
  }, [visible, card?.id]);

  if (!card) return null;

  const display = fullCard || card;
  const cm = fullCard?.cardmarket?.prices;
  const tcp = fullCard?.tcgplayer?.prices;

  // TCGPlayer : holofoil > normal > 1stEdition > reverseHolofoil
  const tcpVariant =
    tcp?.holofoil ?? tcp?.normal ?? tcp?.['1stEditionHolofoil'] ?? tcp?.reverseHolofoil ?? null;

  const typeColor = TYPE_COLORS[display.types?.[0]] ?? '#E63F00';

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { width }]}>
          {/* Handle */}
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Image */}
            <Image
              source={{ uri: display.images?.large ?? display.images?.small }}
              style={styles.cardImage}
              resizeMode="contain"
            />

            {/* Nom + badges */}
            <Text style={styles.cardName}>{display.name}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>#{display.number}</Text>
              </View>
              {display.rarity && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{display.rarity}</Text>
                </View>
              )}
              {display.supertype && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{display.supertype}</Text>
                </View>
              )}
              {display.types?.map((t) => (
                <View key={t} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t] ?? '#555' }]}>
                  <Text style={styles.typeBadgeText}>{t}</Text>
                </View>
              ))}
            </View>

            {/* Set */}
            {display.set && (
              <Text style={styles.setLine}>
                {display.set.name}
                {display.set.series ? ` · ${display.set.series}` : ''}
              </Text>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              {display.rarity && (() => {
                const r = RARITY_SHORT[display.rarity];
                return (
                  <View style={[styles.statCell, styles.rarityCell, { borderColor: r?.color ?? '#444' }]}>
                    <Text style={styles.statLabel}>Rareté</Text>
                    <Text style={[styles.statValue, { color: r?.color ?? '#ddd', fontSize: 15, fontFamily: fonts.extrabold }]}>
                      {r?.label ?? display.rarity}
                    </Text>
                  </View>
                );
              })()}
              {display.artist && (
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>Artiste</Text>
                  <Text style={styles.statValue}>{display.artist}</Text>
                </View>
              )}
              {fullCard?.set?.printedTotal && (
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>N° dans le set</Text>
                  <Text style={styles.statValue}>{display.number} / {fullCard.set.printedTotal}</Text>
                </View>
              )}
            </View>

            {/* PRIX */}
            {loading ? (
              <View style={styles.priceSection}>
                <ActivityIndicator color="#E63F00" />
                <Text style={styles.priceLoading}>Chargement des prix...</Text>
              </View>
            ) : (cm || tcpVariant) ? (
              <View style={styles.priceSection}>
                <Text style={styles.priceSectionTitle}>💶 Prix du marché</Text>

                {cm && (
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceSource}>Cardmarket</Text>
                    <PriceRow label="Tendance"    value={cm.trendPrice}        highlight />
                    <PriceRow label="Vente moy."  value={cm.averageSellPrice} />
                    <PriceRow label="Prix bas"    value={cm.lowPrice} />
                    <PriceRow label="Moy. 7 j"    value={cm.avg7} />
                    <PriceRow label="Moy. 30 j"   value={cm.avg30} />
                  </View>
                )}

                {tcpVariant && (
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceSource}>TCGPlayer</Text>
                    <PriceRow label="Market"  value={tcpVariant.market}  unit="$" highlight />
                    <PriceRow label="Bas"     value={tcpVariant.low}     unit="$" />
                    <PriceRow label="Haut"    value={tcpVariant.high}    unit="$" />
                    <PriceRow label="Mi-prix" value={tcpVariant.mid}     unit="$" />
                  </View>
                )}
              </View>
            ) : fullCard ? (
              <View style={styles.priceSection}>
                <Text style={styles.noPrice}>Prix non disponible</Text>
              </View>
            ) : null}

            {/* Boutons */}
            <View style={styles.actions}>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btnPrimary, styles.btnFlex, owned && styles.btnOwned]}
                  onPress={onToggle}
                >
                  <Text style={styles.btnPrimaryText}>
                    {owned ? '✓  Possédée' : '+  Ma collection'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnFavorite, favorited && styles.btnFavorited]}
                  onPress={onToggleFavorite}
                >
                  <Text style={styles.btnFavoriteText}>{favorited ? '★' : '☆'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setShowListModal(true)}
              >
                <Text style={styles.btnSecondaryText}>📋  Ajouter à une liste</Text>
              </TouchableOpacity>

              {(fullCard?.cardmarket?.url) && (
                <TouchableOpacity
                  style={styles.btnCardmarket}
                  onPress={() => Linking.openURL(fullCard.cardmarket.url)}
                >
                  <Text style={styles.btnCardmarketText}>🛒  Voir sur Cardmarket</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* AddToListModal géré en interne */}
      <AddToListModal
        visible={showListModal}
        card={display}
        onClose={() => setShowListModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#16213e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    paddingTop: 10,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: '#2a2a4a',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  cardImage: {
    width: 220,
    height: 308,
    marginBottom: 16,
  },

  cardName: {
    color: '#fff',
    fontSize: 20,
    fontFamily: fonts.extrabold,
    textAlign: 'center',
    marginBottom: 10,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  badgeText: { color: '#aaa', fontSize: 11, fontFamily: fonts.semibold },
  typeBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: { color: '#fff', fontSize: 11, fontFamily: fonts.bold },

  setLine: {
    color: '#666',
    fontSize: 12,
    marginBottom: 14,
    textAlign: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statCell: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  rarityCell: {
    borderWidth: 2,
  },
  statLabel: { color: '#666', fontSize: 10, marginBottom: 2 },
  statValue: { color: '#ddd', fontSize: 13, fontFamily: fonts.bold },

  /* Prix */
  priceSection: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    alignItems: 'center',
  },
  priceLoading: { color: '#666', fontSize: 12, marginTop: 6 },
  priceSectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.bold,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  priceBlock: {
    width: '100%',
    marginBottom: 10,
  },
  priceSource: {
    color: '#E63F00',
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  priceLabel: { color: '#888', fontSize: 13 },
  priceValue: { color: '#ddd', fontSize: 13, fontFamily: fonts.semibold },
  priceHighlight: { color: '#E63F00', fontSize: 14, fontFamily: fonts.extrabold },
  noPrice: { color: '#555', fontSize: 13 },

  /* Boutons */
  actions: { width: '100%', gap: 10 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  btnFlex: { flex: 1 },
  btnPrimary: {
    backgroundColor: '#E63F00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnOwned: { backgroundColor: '#1a4a1a', borderWidth: 1, borderColor: '#2a7a2a' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
  btnFavorite: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  btnFavorited: { backgroundColor: '#2e1f00', borderColor: '#f1c40f' },
  btnFavoriteText: { fontSize: 22, color: '#f1c40f' },
  btnSecondary: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  btnSecondaryText: { color: '#aaa', fontSize: 14, fontFamily: fonts.semibold },
  btnCardmarket: {
    backgroundColor: '#1a2e1a',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a5c2a',
  },
  btnCardmarketText: { color: '#4caf50', fontSize: 14, fontFamily: fonts.semibold },
});
