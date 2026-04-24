import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  View, Text, Image, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Linking,
} from './rn-web';
import { getCached, setCached } from '../utils/cache';
import { fonts } from '../utils/theme';
import AddToListModal from './AddToListModal';

// { tag: affiché sur le bouton (≤3 car.), name: valeur stockée }
const GRADING_COMPANIES = [
  { tag: 'PSA', name: 'PSA' },
  { tag: 'PCA', name: 'PCA' },
  { tag: 'CA',  name: 'CA'  },
  { tag: 'COL', name: 'CollectAura' },
  { tag: 'CCC', name: 'CCC' },
  { tag: 'CGC', name: 'CGC' },
  { tag: 'BEC', name: 'Beckett' },
  { tag: 'AUT', name: 'Autres' },  // → saisie libre
];
const KNOWN_NAMES = new Set(GRADING_COMPANIES.filter((c) => c.tag !== 'AUT').map((c) => c.name));

const RARITY_SHORT = {
  'Common': { label: 'C', color: '#888' },
  'Uncommon': { label: 'U', color: '#7ec8e3' },
  'Rare': { label: 'R', color: '#f1c40f' },
  'Rare Holo': { label: 'H', color: '#f1c40f' },
  'Rare Holo EX': { label: 'EX', color: '#e67e22' },
  'Rare Holo GX': { label: 'GX', color: '#e67e22' },
  'Rare Holo V': { label: 'V', color: '#e67e22' },
  'Rare Holo VMAX': { label: 'VMAX', color: '#e74c3c' },
  'Rare Holo VSTAR': { label: 'VSTAR', color: '#e74c3c' },
  'Double Rare': { label: 'RR', color: '#e67e22' },
  'Illustration Rare': { label: 'AR', color: '#9b59b6' },
  'Special Illustration Rare': { label: 'SAR', color: '#e91e8c' },
  'Hyper Rare': { label: 'HR', color: '#f39c12' },
  'Ultra Rare': { label: 'UR', color: '#e74c3c' },
  'Rare Ultra': { label: 'UR', color: '#e74c3c' },
  'Rare Secret': { label: 'SR', color: '#e74c3c' },
  'Rare Rainbow': { label: 'RR', color: '#e91e8c' },
  'Shiny Rare': { label: 'S', color: '#3498db' },
  'Shiny Ultra Rare': { label: 'SSR', color: '#9b59b6' },
  'ACE SPEC Rare': { label: 'ACE', color: '#e74c3c' },
  'Trainer Gallery Rare Holo': { label: 'TGH', color: '#9b59b6' },
  'Rare Shining': { label: 'S', color: '#3498db' },
  'Amazing Rare': { label: 'A', color: '#27ae60' },
  'Promo': { label: 'PR', color: '#2ecc71' },
};

const TYPE_COLORS = {
  Fire: '#c0392b', Water: '#2980b9', Grass: '#27ae60', Lightning: '#f39c12',
  Psychic: '#8e44ad', Fighting: '#d35400', Darkness: '#2c3e50', Metal: '#7f8c8d',
  Fairy: '#e91e8c', Dragon: '#1a5276', Colorless: '#555',
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

export default function CardDetailModal({ visible, card, owned, onToggle, favorited, onToggleFavorite, gradingData, onSetGrading, onClose }) {
  const [fullCard, setFullCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');   // tag sélectionné
  const [gradingCustom, setGradingCustom]   = useState('');       // saisie libre (Autres)
  const [gradingGrade, setGradingGrade]     = useState('');

  useEffect(() => {
    if (!visible) return;
    setShowGrading(false);
    if (gradingData?.graded) {
      const stored = gradingData.company || 'PSA';
      if (KNOWN_NAMES.has(stored)) {
        // retrouver le tag correspondant au name stocké
        const match = GRADING_COMPANIES.find((c) => c.name === stored);
        setGradingCompany(match ? match.tag : 'AUT');
        setGradingCustom(match ? '' : stored);
      } else {
        // ancienne valeur inconnue (BGS, TAG, ACE…) → Autres
        setGradingCompany('AUT');
        setGradingCustom(stored);
      }
      setGradingGrade(gradingData.grade || '');
    } else {
      setGradingCompany('PSA');
      setGradingCustom('');
      setGradingGrade('');
    }
  }, [visible, gradingData]);

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

  if (!visible || !card) return null;

  const display = fullCard || card;
  const cm = fullCard?.cardmarket?.prices;
  const tcp = fullCard?.tcgplayer?.prices;
  const tcpVariant = tcp?.holofoil ?? tcp?.normal ?? tcp?.['1stEditionHolofoil'] ?? tcp?.reverseHolofoil ?? null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop"
        style={{ zIndex: 900, backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Sheet — hauteur fixe 90vh pour que flex:1 sur l'inner div soit défini */}
      <div
        className="modal-sheet"
        style={{
          zIndex: 901,
          backgroundColor: '#16213e',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          height: '90vh',
          border: '1px solid #2a2a4a',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, margin: '10px auto 0', flexShrink: 0 }} />

        {/* Outer div : scrollable, contraint par flex:1 dans le sheet */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        {/* Inner wrapper : ne rétrécit jamais, pousse le scroll vers l'outer div */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 40px', flexShrink: 0 }}>
          {/* Image */}
          <img
            src={display.images?.large ?? display.images?.small}
            alt={display.name}
            style={{ width: 220, height: 308, objectFit: 'contain', marginBottom: 16 }}
          />

          {/* Bloc infos */}
          <div style={{ width: '100%', padding: '12px 16px 0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          <Text style={styles.cardName}>{display.name}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>#{display.number}</Text></View>
            {display.rarity && <View style={styles.badge}><Text style={styles.badgeText}>{display.rarity}</Text></View>}
            {display.supertype && <View style={styles.badge}><Text style={styles.badgeText}>{display.supertype}</Text></View>}
            {display.types?.map((t) => (
              <View key={t} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t] ?? '#555' }]}>
                <Text style={styles.typeBadgeText}>{t}</Text>
              </View>
            ))}
          </View>

          {display.set && (
            <Text style={styles.setLine}>
              {display.set.name}
              {display.set.id ? <Text style={styles.setId}>{`  ${display.set.id.toUpperCase()}`}</Text> : null}
              {display.set.series ? `  ·  ${display.set.series}` : ''}
            </Text>
          )}

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

          {/* Prix */}
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
                  <PriceRow label="Tendance" value={cm.trendPrice} highlight />
                  <PriceRow label="Vente moy." value={cm.averageSellPrice} />
                  <PriceRow label="Prix bas" value={cm.lowPrice} />
                  <PriceRow label="Moy. 7 j" value={cm.avg7} />
                  <PriceRow label="Moy. 30 j" value={cm.avg30} />
                </View>
              )}
              {tcpVariant && (
                <View style={styles.priceBlock}>
                  <Text style={styles.priceSource}>TCGPlayer</Text>
                  <PriceRow label="Market" value={tcpVariant.market} unit="$" highlight />
                  <PriceRow label="Bas" value={tcpVariant.low} unit="$" />
                  <PriceRow label="Haut" value={tcpVariant.high} unit="$" />
                  <PriceRow label="Mi-prix" value={tcpVariant.mid} unit="$" />
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
              <TouchableOpacity style={[styles.btnPrimary, styles.btnFlex, owned && styles.btnOwned]} onPress={onToggle}>
                <Text style={styles.btnPrimaryText}>{owned ? '✓  Possédée' : '+  Ma collection'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnFavorite, favorited && styles.btnFavorited]} onPress={onToggleFavorite}>
                <Text style={styles.btnFavoriteText}>{favorited ? '★' : '☆'}</Text>
              </TouchableOpacity>
            </View>

            {owned && (
              <View style={styles.gradingSection}>
                <TouchableOpacity style={styles.gradingHeader} onPress={() => setShowGrading((v) => !v)}>
                  <Text style={styles.gradingHeaderText}>
                    {gradingData?.graded ? `🏆  ${gradingData.company}  ${gradingData.grade}` : '🏆  Ajouter un grade'}
                  </Text>
                  <Text style={styles.gradingChevron}>{showGrading ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showGrading && (
                  <View style={styles.gradingBody}>
                    {/* Ligne 1 : PSA · PCA · CA · COL */}
                    <View style={styles.companyRow}>
                      {GRADING_COMPANIES.slice(0, 4).map((co) => (
                        <TouchableOpacity
                          key={co.tag}
                          style={[styles.companyBtn, gradingCompany === co.tag && styles.companyBtnActive]}
                          onPress={() => setGradingCompany(co.tag)}
                        >
                          <Text style={[styles.companyText, gradingCompany === co.tag && styles.companyTextActive]}>{co.tag}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* Ligne 2 : CCC · CGC · BEC · AUT */}
                    <View style={styles.companyRow}>
                      {GRADING_COMPANIES.slice(4).map((co) => (
                        <TouchableOpacity
                          key={co.tag}
                          style={[styles.companyBtn, gradingCompany === co.tag && styles.companyBtnActive]}
                          onPress={() => setGradingCompany(co.tag)}
                        >
                          <Text style={[styles.companyText, gradingCompany === co.tag && styles.companyTextActive]}>{co.tag}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* Champ libre pour "Autres" */}
                    {gradingCompany === 'AUT' && (
                      <TextInput
                        style={styles.gradeInput}
                        placeholder="Nom de la société…"
                        placeholderTextColor="#555"
                        value={gradingCustom}
                        onChangeText={setGradingCustom}
                      />
                    )}
                    <TextInput
                      style={styles.gradeInput}
                      placeholder="Note (ex: 10, 9.5, 8...)"
                      placeholderTextColor="#555"
                      value={gradingGrade}
                      onChangeText={setGradingGrade}
                      keyboardType="decimal-pad"
                    />
                    <View style={styles.gradingActions}>
                      {gradingData?.graded && (
                        <TouchableOpacity style={styles.removeGradeBtn} onPress={() => { onSetGrading?.({ graded: false }); setShowGrading(false); }}>
                          <Text style={styles.removeGradeBtnText}>Supprimer</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.saveGradeBtn, { flex: gradingData?.graded ? 1 : undefined, width: gradingData?.graded ? undefined : '100%' }]}
                        onPress={() => {
                          if (!gradingGrade.trim()) return;
                          const co = GRADING_COMPANIES.find((c) => c.tag === gradingCompany);
                          const companyToStore = gradingCompany === 'AUT'
                            ? (gradingCustom.trim() || 'Autres')
                            : (co?.name ?? gradingCompany);
                          onSetGrading?.({ graded: true, company: companyToStore, grade: gradingGrade.trim() });
                          setShowGrading(false);
                        }}
                      >
                        <Text style={styles.saveGradeBtnText}>Enregistrer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowListModal(true)}>
              <Text style={styles.btnSecondaryText}>📋  Ajouter à une liste</Text>
            </TouchableOpacity>

            {fullCard?.cardmarket?.url && (
              <TouchableOpacity style={styles.btnCardmarket} onPress={() => Linking.openURL(fullCard.cardmarket.url)}>
                <Text style={styles.btnCardmarketText}>🛒  Voir sur Cardmarket</Text>
              </TouchableOpacity>
            )}
          </View>

          </div>{/* end infos block */}
        </div>{/* end inner wrapper */}
        </div>{/* end outer scrollable */}
      </div>

      <AddToListModal visible={showListModal} card={display} onClose={() => setShowListModal(false)} />
    </>,
    document.body
  );
}

const styles = StyleSheet.create({
  cardName: { color: '#fff', fontSize: 20, fontFamily: fonts.extrabold, textAlign: 'center', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 10 },
  badge: { backgroundColor: '#1a1a2e', borderRadius: 8, paddingLeft: 10, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: '1px solid #2a2a4a' },
  badgeText: { color: '#aaa', fontSize: 11, fontFamily: fonts.semibold },
  typeBadge: { borderRadius: 8, paddingLeft: 10, paddingRight: 10, paddingTop: 6, paddingBottom: 6 },
  typeBadgeText: { color: '#fff', fontSize: 11, fontFamily: fonts.bold },
  setLine: { color: '#666', fontSize: 12, marginBottom: 14, textAlign: 'center' },
  setId: { color: '#E63F00', fontFamily: fonts.bold },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' },
  statCell: { backgroundColor: '#1a1a2e', borderRadius: 10, paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 10, alignItems: 'center', border: '1px solid #2a2a4a' },
  rarityCell: { borderWidth: 2 },
  statLabel: { color: '#666', fontSize: 10, marginBottom: 2 },
  statValue: { color: '#ddd', fontSize: 13, fontFamily: fonts.bold },
  priceSection: { width: '100%', backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14, marginBottom: 16, border: '1px solid #2a2a4a', alignItems: 'center' },
  priceLoading: { color: '#666', fontSize: 12, marginTop: 6 },
  priceSectionTitle: { color: '#fff', fontSize: 14, fontFamily: fonts.bold, marginBottom: 12, alignSelf: 'flex-start' },
  priceBlock: { width: '100%', marginBottom: 10 },
  priceSource: { color: '#E63F00', fontSize: 11, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5, paddingBottom: 5, borderBottom: '1px solid #2a2a4a' },
  priceLabel: { color: '#888', fontSize: 13 },
  priceValue: { color: '#ddd', fontSize: 13, fontFamily: fonts.semibold },
  priceHighlight: { color: '#E63F00', fontSize: 14, fontFamily: fonts.extrabold },
  noPrice: { color: '#555', fontSize: 13 },
  actions: { width: '100%', gap: 10, display: 'flex', flexDirection: 'column' },
  actionsRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  btnFlex: { flex: 1, minWidth: 0 },
  btnPrimary: { backgroundColor: '#E63F00', borderRadius: 12, paddingTop: 14, paddingBottom: 14, alignItems: 'center', justifyContent: 'center' },
  btnOwned: { backgroundColor: '#1a4a1a', border: '1px solid #2a7a2a' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
  btnFavorite: { backgroundColor: '#16213e', borderRadius: 12, width: 52, height: 52, alignItems: 'center', justifyContent: 'center', border: '1px solid #2a2a4a', flexShrink: 0 },
  btnFavorited: { backgroundColor: '#2e1f00', border: '1px solid #f1c40f' },
  btnFavoriteText: { fontSize: 22, color: '#f1c40f' },
  btnSecondary: { backgroundColor: '#1a1a2e', borderRadius: 12, paddingTop: 13, paddingBottom: 13, alignItems: 'center', border: '1px solid #2a2a4a' },
  btnSecondaryText: { color: '#aaa', fontSize: 14, fontFamily: fonts.semibold },
  gradingSection: { borderRadius: 12, border: '1px solid #2a2a4a', overflow: 'hidden' },
  gradingHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 13, paddingBottom: 13, paddingLeft: 16, paddingRight: 16, backgroundColor: '#1a1a2e' },
  gradingHeaderText: { color: '#aaa', fontSize: 14, fontFamily: fonts.semibold, textAlign: 'center' },
  gradingChevron: { color: '#555', fontSize: 12 },
  gradingBody: { backgroundColor: '#111827', padding: 14, gap: 10, display: 'flex', flexDirection: 'column' },
  companyRow: { flexDirection: 'row', gap: 8 },
  companyBtn: { flex: 1, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: '1px solid #2a2a4a', alignItems: 'center', backgroundColor: '#16213e' },
  companyBtnActive: { backgroundColor: '#E63F00', border: '1px solid #E63F00' },
  companyText: { color: '#888', fontSize: 12, fontFamily: fonts.bold },
  companyTextActive: { color: '#fff' },
  gradeInput: { backgroundColor: '#16213e', borderRadius: 8, border: '1px solid #2a2a4a', padding: '10px 12px', color: '#fff', fontSize: 16, fontFamily: fonts.bold, textAlign: 'center', width: '100%' },
  gradingActions: { flexDirection: 'row', gap: 8 },
  removeGradeBtn: { flex: 1, paddingTop: 10, paddingBottom: 10, borderRadius: 8, backgroundColor: '#2a1a1a', border: '1px solid #5a2a2a', alignItems: 'center' },
  removeGradeBtnText: { color: '#e74c3c', fontSize: 13, fontFamily: fonts.semibold },
  saveGradeBtn: { paddingTop: 10, paddingBottom: 10, borderRadius: 8, backgroundColor: '#E63F00', alignItems: 'center' },
  saveGradeBtnText: { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
  btnCardmarket: { backgroundColor: '#1a2e1a', borderRadius: 12, paddingTop: 13, paddingBottom: 13, alignItems: 'center', border: '1px solid #2a5c2a' },
  btnCardmarketText: { color: '#4caf50', fontSize: 14, fontFamily: fonts.semibold },
});
