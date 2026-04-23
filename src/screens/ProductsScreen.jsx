import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput,
} from '../components/rn-web';
import { PRODUCTS, PRODUCT_TYPES, PRICE_SOURCE, PRICE_UPDATED } from '../data/products';
import { fonts } from '../utils/theme';
import { Linking } from '../components/rn-web';

const TYPE_COLORS = {
  booster:  '#1a3a5c',
  display:  '#1a3a1a',
  etb:      '#3a1a3a',
  tin:      '#3a2a1a',
  coffret:  '#3a1a1a',
  deck:     '#1a1a3a',
};

// ─── Product detail bottom-sheet modal ───────────────────────────────────────
function ProductModal({ product, onClose }) {
  const navigate = useNavigate();
  if (!product) return null;

  const contents = product.contents || {};
  const extrasList = contents.extras || [];

  const cardmarketUrl = `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(product.nameFr || product.name)}`;

  return createPortal(
    <>
      <div
        className="modal-backdrop"
        style={{ zIndex: 900, backgroundColor: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
      <div
        className="modal-sheet"
        style={{
          zIndex: 901,
          backgroundColor: '#16213e',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          height: '88vh',
          border: '1px solid #2a2a4a',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, margin: '10px auto 0', flexShrink: 0 }} />

        {/* Scrollable content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px 40px', flexShrink: 0 }}>

            {/* Header coloré */}
            <div style={{ backgroundColor: product.color ?? '#16213e', borderRadius: 16, padding: '20px 16px', marginBottom: 20, textAlign: 'center', border: '1px solid #2a2a4a' }}>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', lineHeight: 1.3 }}>
                {product.nameFr || product.name}
              </span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '3px 10px', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 12, color: '#fff' }}>
                  {PRODUCT_TYPES.find((t) => t.id === product.type)?.emoji} {PRODUCT_TYPES.find((t) => t.id === product.type)?.label}
                </span>
                <span style={{ backgroundColor: 'rgba(230,63,0,0.3)', borderRadius: 8, padding: '3px 10px', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 12, color: '#E63F00' }}>
                  {product.setId?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Prix */}
            <div style={{ backgroundColor: '#1a1a2e', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: '1px solid #2a2a4a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', display: 'block' }}>Prix indicatif {PRICE_SOURCE}</span>
                <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#555', display: 'block' }}>Mis à jour {PRICE_UPDATED}</span>
              </div>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 26, color: '#E63F00' }}>{product.price}</span>
            </div>

            {/* Infos set */}
            <div style={{ backgroundColor: '#1a1a2e', borderRadius: 14, padding: '12px 16px', marginBottom: 16, border: '1px solid #2a2a4a' }}>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', display: 'block', marginBottom: 4 }}>{product.setName}</span>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#888', display: 'block' }}>{product.series} · {product.releaseDate}</span>
            </div>

            {/* Contenu */}
            <div style={{ backgroundColor: '#1a1a2e', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: '1px solid #2a2a4a' }}>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 11, color: '#E63F00', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>📦 Contenu</span>
              {contents.packs > 0 && (
                <ContentRow label="Boosters" value={`${contents.packs}${contents.cardsPerPack ? ` × ${contents.cardsPerPack} cartes` : ''}`} />
              )}
              {contents.totalCards && !contents.packs && (
                <ContentRow label="Cartes" value={`${contents.totalCards} cartes`} />
              )}
              {contents.promoCards > 0 && (
                <ContentRow label="Cartes promo" value={`${contents.promoCards}`} />
              )}
              {extrasList.map((extra, i) => (
                <ContentRow key={i} label="Extra" value={extra} />
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div style={{ backgroundColor: '#1a1a2e', borderRadius: 14, padding: '14px 16px', marginBottom: 20, border: '1px solid #2a2a4a' }}>
                <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>{product.description}</span>
              </div>
            )}

            {/* Actions */}
            <button
              onClick={() => Linking.openURL(cardmarketUrl)}
              style={{ width: '100%', padding: '14px', borderRadius: 12, backgroundColor: '#1a2e1a', border: '1px solid #2a5c2a', color: '#4caf50', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}
            >
              🛒  Voir sur Cardmarket
            </button>
            <button
              onClick={() => { onClose(); navigate(`/sets/${product.setId}`, { state: { set: { id: product.setId, name: product.setName } } }); }}
              style={{ width: '100%', padding: '13px', borderRadius: 12, backgroundColor: '#16213e', border: '1px solid #2a2a4a', color: '#aaa', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Voir les cartes du set →
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function ContentRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 5, paddingBottom: 5, borderBottom: '1px solid #2a2a4a' }}>
      <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#888' }}>{label}</span>
      <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#ddd', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ProductsScreen() {
  const [selectedType, setSelectedType] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filtered = PRODUCTS.filter((p) => {
    const matchType = selectedType === 'all' || p.type === selectedType;
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || p.name.toLowerCase().includes(q)
      || (p.nameFr && p.nameFr.toLowerCase().includes(q))
      || p.setName.toLowerCase().includes(q)
      || p.series.toLowerCase().includes(q)
      || (p.setId && p.setId.toLowerCase().includes(q));
    return matchType && matchSearch;
  });

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Rechercher un produit, set…"
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type filters */}
      <div style={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', overflowY: 'hidden', paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 8, gap: 8, scrollbarWidth: 'none', flexShrink: 0 }}>
        {PRODUCT_TYPES.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.filterBtn, selectedType === t.id && styles.filterBtnActive]}
            onPress={() => setSelectedType(t.id)}
          >
            <Text style={[styles.filterText, selectedType === t.id && styles.filterTextActive]}>
              {t.emoji} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </div>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun produit trouvé</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedProduct(item)}>
            <View style={[styles.colorBar, { backgroundColor: item.color ?? '#2a2a4a' }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.productName} numberOfLines={2}>{item.nameFr || item.name}</Text>
                <Text style={styles.price}>{item.price}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.typePill}>
                  {PRODUCT_TYPES.find((t) => t.id === item.type)?.emoji} {PRODUCT_TYPES.find((t) => t.id === item.type)?.label}
                </Text>
                <Text style={styles.setTag}>{item.setId?.toUpperCase()}</Text>
                <Text style={styles.setName} numberOfLines={1}>{item.setName}</Text>
              </View>
              {item.contents?.packs > 0 && (
                <Text style={styles.contentHint}>
                  {item.contents.packs} booster{item.contents.packs > 1 ? 's' : ''}
                  {item.contents.cardsPerPack ? ` · ${item.contents.packs * item.contents.cardsPerPack} cartes` : ''}
                </Text>
              )}
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  searchRow: { margin: 12, marginBottom: 6 },
  search: {
    padding: '10px 14px',
    backgroundColor: '#16213e', borderRadius: 10,
    color: '#fff', fontSize: 15,
    border: '1px solid #2a2a4a',
  },
  filters: { paddingLeft: 12, paddingBottom: 8, paddingTop: 4 },
  filterBtn: { paddingTop: 7, paddingBottom: 7, paddingLeft: 14, paddingRight: 14, borderRadius: 20, backgroundColor: '#16213e', border: '1px solid #2a2a4a', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: '#E63F00', border: '1px solid #E63F00' },
  filterText: { color: '#888', fontSize: 13, fontFamily: fonts.semibold, whiteSpace: 'nowrap' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 20, paddingTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#555', fontSize: 14, fontFamily: fonts.semibold },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 12, marginBottom: 10, border: '1px solid #2a2a4a', overflow: 'hidden' },
  colorBar: { width: 5, alignSelf: 'stretch', flexShrink: 0 },
  cardBody: { flex: 1, padding: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  productName: { flex: 1, color: '#fff', fontSize: 14, fontFamily: fonts.bold, marginRight: 10 },
  price: { color: '#E63F00', fontSize: 15, fontFamily: fonts.extrabold, flexShrink: 0 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  typePill: { color: '#aaa', fontSize: 11, fontFamily: fonts.semibold, backgroundColor: '#2a2a4a', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  setTag: { color: '#E63F00', fontSize: 10, fontFamily: fonts.bold, backgroundColor: 'rgba(230,63,0,0.12)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  setName: { color: '#666', fontSize: 11, flex: 1 },
  contentHint: { color: '#555', fontSize: 11, marginTop: 2 },
  arrow: { color: '#444', fontSize: 22, paddingRight: 12, flexShrink: 0 },
});
