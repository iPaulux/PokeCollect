import React from 'react';
import {
  View, Text, Image, StyleSheet,
  ScrollView, TouchableOpacity, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PRICE_SOURCE, PRICE_UPDATED } from '../data/products';
import { fonts } from '../utils/theme';

const TYPE_LABELS = {
  booster:  'Booster',
  display:  'Display',
  etb:      'Elite Trainer Box',
  tin:      'Boîte Métal',
  coffret:  'Coffret',
  deck:     'Deck de Combat',
};

const TYPE_COLORS = {
  booster:  '#1a3a5c',
  display:  '#1a3a2a',
  etb:      '#3a1a3a',
  tin:      '#3a2a1a',
  coffret:  '#2a1a3a',
  deck:     '#1a2a3a',
};

function Row({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ItemDetailScreen({ route }) {
  const { product, logo } = route.params;
  const navigation = useNavigation();
  const typeColor = TYPE_COLORS[product.type] || '#16213e';

  const { contents } = product;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header visuel */}
      <View style={[styles.hero, { backgroundColor: typeColor }]}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.heroLogo} resizeMode="contain" />
        ) : (
          <Text style={styles.heroFallback}>🎴</Text>
        )}
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{TYPE_LABELS[product.type]}</Text>
        </View>
      </View>

      {/* Titre & prix */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{product.nameFr}</Text>
        {product.name !== product.nameFr && (
          <Text style={styles.titleEn}>{product.name}</Text>
        )}
        <Text style={styles.price}>{product.price}</Text>
        <Text style={styles.priceSource}>
          Prix indicatif · {PRICE_SOURCE} · {PRICE_UPDATED}
        </Text>
      </View>

      {/* Description */}
      <View style={styles.descBlock}>
        <Text style={styles.desc}>{product.description}</Text>
      </View>

      {/* Infos set */}
      <Section title="📦 Set & Série">
        <Row label="Set"       value={product.setName} />
        <Row label="Série"     value={product.series} />
        <Row label="Sortie"    value={product.releaseDate} />
      </Section>

      {/* Contenu */}
      <Section title="🎴 Contenu">
        {contents.packs > 0 && (
          <Row
            label={contents.packs === 1 ? 'Booster' : 'Boosters'}
            value={`${contents.packs} × ${contents.cardsPerPack} cartes`}
          />
        )}
        {contents.totalCards && !contents.packs && (
          <Row label="Cartes totales" value={`${contents.totalCards} cartes`} />
        )}
        {contents.promoCards > 0 && (
          <Row label="Carte(s) promo" value={`${contents.promoCards} carte${contents.promoCards > 1 ? 's' : ''} exclusive${contents.promoCards > 1 ? 's' : ''}`} />
        )}
        {contents.extras && contents.extras.map((extra, i) => (
          <View key={i} style={styles.extraRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.extraText}>{extra}</Text>
          </View>
        ))}
      </Section>

      {/* Boutons */}
      <TouchableOpacity
        style={styles.cardmarketBtn}
        onPress={() => Linking.openURL(
          `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(product.name)}`
        )}
      >
        <Text style={styles.cardmarketBtnText}>🛒  Voir sur Cardmarket</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.setBtn}
        onPress={() => navigation.navigate('SetsTab', {
          screen: 'Cards',
          params: { set: { id: product.setId, name: product.setName } },
        })}
      >
        <Text style={styles.setBtnText}>Voir les cartes du set →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { paddingBottom: 40 },

  hero: {
    height: 160, justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  heroLogo: { width: 220, height: 100 },
  heroFallback: { fontSize: 60 },
  typePill: {
    position: 'absolute', bottom: 10, right: 14,
    backgroundColor: '#E63F00', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typePillText: { color: '#fff', fontSize: 11, fontFamily: fonts.bold },

  titleBlock: {
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#2a2a4a',
  },
  title: { color: '#fff', fontSize: 20, fontFamily: fonts.extrabold, lineHeight: 26 },
  titleEn: { color: '#666', fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  price: { color: '#E63F00', fontSize: 18, fontFamily: fonts.bold, marginTop: 8 },
  priceSource: { color: '#444', fontSize: 10, marginTop: 3, fontStyle: 'italic' },

  descBlock: {
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2a2a4a',
  },
  desc: { color: '#aaa', fontSize: 14, lineHeight: 21 },

  section: {
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#2a2a4a',
  },
  sectionTitle: { color: '#fff', fontSize: 14, fontFamily: fonts.bold, marginBottom: 12 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#1e2a3a',
  },
  rowLabel: { color: '#888', fontSize: 13 },
  rowValue: { color: '#ddd', fontSize: 13, fontFamily: fonts.semibold, textAlign: 'right', flex: 1, marginLeft: 12 },
  extraRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  bullet: { color: '#E63F00', fontSize: 14, marginRight: 8, lineHeight: 20 },
  extraText: { color: '#ccc', fontSize: 13, flex: 1, lineHeight: 20 },

  cardmarketBtn: {
    marginHorizontal: 18, marginTop: 18, marginBottom: 0,
    padding: 14, borderRadius: 12,
    backgroundColor: '#1a2e1a', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a5c2a',
  },
  cardmarketBtnText: { color: '#4caf50', fontSize: 14, fontFamily: fonts.bold },
  setBtn: {
    margin: 18, marginTop: 10, padding: 14, borderRadius: 12,
    backgroundColor: '#16213e', alignItems: 'center',
    borderWidth: 1, borderColor: '#E63F00',
  },
  setBtnText: { color: '#E63F00', fontSize: 14, fontFamily: fonts.bold },
});
