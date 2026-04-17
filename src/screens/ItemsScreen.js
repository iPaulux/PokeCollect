import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { PRODUCTS, PRODUCT_TYPES } from '../data/products';
import { getCached } from '../utils/cache';

const TYPE_COLORS = {
  booster:   '#1a3a5c',
  display:   '#1a3a2a',
  etb:       '#3a1a3a',
  tin:       '#3a2a1a',
  coffret:   '#2a1a3a',
  deck:      '#1a2a3a',
};

const TYPE_LABELS = {
  booster:  'Booster',
  display:  'Display',
  etb:      'ETB',
  tin:      'Tin',
  coffret:  'Coffret',
  deck:     'Deck',
};

export default function ItemsScreen({ navigation }) {
  const [activeType, setActiveType] = useState('all');
  const [search, setSearch]         = useState('');
  const [setLogos, setSetLogos]     = useState({});

  // Charger les logos depuis le cache sets
  useEffect(() => {
    (async () => {
      const cached = await getCached('sets:en');
      if (cached) {
        const map = {};
        for (const s of cached) map[s.id] = s.images?.logo;
        setSetLogos(map);
      }
    })();
  }, []);

  const displayed = PRODUCTS.filter((p) => {
    const matchType = activeType === 'all' || p.type === activeType;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.nameFr.toLowerCase().includes(q) ||
      p.setName.toLowerCase().includes(q) ||
      p.series.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <TextInput
        style={styles.search}
        placeholder="Rechercher un produit..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />

      {/* Filtres type */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {PRODUCT_TYPES.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.filterBtn, activeType === t.id && styles.filterBtnActive]}
            onPress={() => setActiveType(t.id)}
          >
            <Text style={[styles.filterText, activeType === t.id && styles.filterTextActive]}>
              {t.emoji} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.count}>{displayed.length} produit{displayed.length !== 1 ? 's' : ''}</Text>

      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const logo = setLogos[item.setId];
          const typeColor = TYPE_COLORS[item.type] || '#1a2a3a';
          return (
            <TouchableOpacity
              style={[styles.card, { borderLeftColor: '#E63F00' }]}
              onPress={() => navigation.navigate('ItemDetail', { product: item, logo })}
            >
              {/* Logo du set */}
              <View style={[styles.logoWrap, { backgroundColor: typeColor }]}>
                {logo ? (
                  <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" />
                ) : (
                  <Text style={styles.logoFallback}>🎴</Text>
                )}
                <View style={[styles.typeBadge, { backgroundColor: '#E63F00' }]}>
                  <Text style={styles.typeBadgeText}>{TYPE_LABELS[item.type]}</Text>
                </View>
              </View>

              {/* Infos */}
              <View style={styles.info}>
                <Text style={styles.productName} numberOfLines={2}>{item.nameFr}</Text>
                <Text style={styles.setName}>{item.setName} · {item.series}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.price}>{item.price}</Text>
                  {item.contents.packs && (
                    <Text style={styles.packs}>
                      {item.contents.packs > 1
                        ? `${item.contents.packs} boosters`
                        : item.contents.totalCards
                          ? `${item.contents.totalCards} cartes`
                          : '1 booster'}
                    </Text>
                  )}
                </View>
                <Text style={styles.date}>{item.releaseDate}</Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  search: {
    margin: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#16213e', borderRadius: 10,
    color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10, gap: 6, alignItems: 'flex-start' },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#16213e',
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  filterBtnActive: { backgroundColor: '#E63F00', borderColor: '#E63F00' },
  filterText: { color: '#888', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  count: { color: '#555', fontSize: 11, paddingHorizontal: 14, paddingBottom: 4 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2a4a',
    borderLeftWidth: 3, overflow: 'hidden',
  },
  logoWrap: {
    width: 90, height: 75,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  logo: { width: 80, height: 45 },
  logoFallback: { fontSize: 30 },
  typeBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingVertical: 2,
  },
  typeBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  productName: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  setName: { color: '#888', fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 5, alignItems: 'center' },
  price: { color: '#E63F00', fontSize: 12, fontWeight: '700' },
  packs: { color: '#666', fontSize: 11 },
  date: { color: '#444', fontSize: 10, marginTop: 3 },
  arrow: { color: '#444', fontSize: 22, paddingRight: 12 },
});
