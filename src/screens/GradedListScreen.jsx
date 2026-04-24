import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, useFocusEffect,
} from '../components/rn-web';
import { fonts } from '../utils/theme';
import {
  getOwnedCards, getGradingInfo,
  getFavoriteCards, toggleFavoriteCard,
  toggleCard, setCardGrading,
} from '../utils/storage';
import CardDetailModal from '../components/CardDetailModal';

const API = 'https://api.pokemontcg.io/v2';

/** Extrait le setId depuis un cardId */
function extractSetId(cardId) {
  const parts = cardId.split('-');
  let numIdx = parts.length - 1;
  while (numIdx > 0 && !/^\d+$/.test(parts[numIdx])) numIdx--;
  return parts.slice(0, numIdx).join('-') || parts[0];
}

// ─── Section déroulante ───────────────────────────────────────────────────────
function Section({ company, cards, open, onToggle, onPress }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
        <Text style={styles.sectionTitle}>🏆 {company}</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{cards.length}</Text>
        </View>
        <Text style={styles.sectionChevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.sectionBody}>
          {cards.map(({ card, grade }) => (
            <TouchableOpacity
              key={card.id}
              style={styles.cardRow}
              onPress={() => onPress(card)}
            >
              <Image
                source={{ uri: card.images?.small }}
                style={styles.cardThumb}
                resizeMode="contain"
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{card.name}</Text>
                <Text style={styles.cardMeta}>
                  #{card.number} · {card.set?.name}
                </Text>
              </View>
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeValue}>{grade}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GradedListScreen() {
  const [sections, setSections]         = useState([]); // [{ company, cards:[{card,grade}] }]
  const [openMap, setOpenMap]           = useState({});
  const [owned, setOwned]               = useState({});
  const [favoriteCards, setFavoriteCards] = useState({});
  const [loading, setLoading]           = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ownedMap, favMap] = await Promise.all([getOwnedCards(), getFavoriteCards()]);
    setOwned(ownedMap);
    setFavoriteCards(favMap);

    // Filtrer uniquement les cartes gradées
    const gradedEntries = Object.entries(ownedMap).filter(
      ([, val]) => val && typeof val === 'object' && val.graded === true
    );

    if (gradedEntries.length === 0) {
      setSections([]);
      setLoading(false);
      return;
    }

    // Regrouper par setId pour les fetches API
    const idToGrading = {};
    const bySet = {};
    for (const [cardId, val] of gradedEntries) {
      idToGrading[cardId] = val;
      const sid = extractSetId(cardId);
      if (!bySet[sid]) bySet[sid] = [];
      bySet[sid].push(cardId);
    }

    // Fetch les cartes par set
    const cardMap = {}; // cardId → cardData
    for (const [sid, ids] of Object.entries(bySet)) {
      const ownedSet = new Set(ids);
      try {
        const res = await fetch(
          `${API}/cards?q=set.id:${sid}&pageSize=500&orderBy=number`
        ).then((r) => r.json());
        (res.data || []).filter((c) => ownedSet.has(c.id)).forEach((c) => { cardMap[c.id] = c; });
      } catch (_) { /* skip */ }
    }

    // Construire les sections par société
    const byCompany = {};
    for (const [cardId, grading] of gradedEntries) {
      const card = cardMap[cardId];
      if (!card) continue; // si fetch échoue on ignore
      const company = grading.company || 'Autres';
      if (!byCompany[company]) byCompany[company] = [];
      byCompany[company].push({ card, grade: grading.grade });
    }

    // Trier les sociétés alphabétiquement, cartes par grade décroissant dans chaque société
    const sorted = Object.entries(byCompany)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([company, cards]) => ({
        company,
        cards: cards.sort((x, y) => parseFloat(y.grade) - parseFloat(x.grade) || x.card.name.localeCompare(y.card.name)),
      }));

    setSections(sorted);
    // Ouvrir toutes les sections par défaut
    setOpenMap(Object.fromEntries(sorted.map(({ company }) => [company, true])));
    setLoading(false);
  }, []);

  useFocusEffect(loadData);

  const toggleSection = (company) =>
    setOpenMap((prev) => ({ ...prev, [company]: !prev[company] }));

  const handleToggle = async (cardId) => {
    setOwned(await toggleCard(cardId));
  };
  const handleToggleFavorite = async (card) => {
    setFavoriteCards(await toggleFavoriteCard(card));
  };
  const handleSetGrading = async (cardId, data) => {
    setOwned(await setCardGrading(cardId, data));
  };

  const totalGraded = sections.reduce((s, sec) => s + sec.cards.length, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Chargement des grades…</Text>
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Aucune carte gradée</Text>
        <Text style={styles.emptySub}>
          Ouvre la fiche d'une carte possédée et ajoute un grade via la section 🏆
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {totalGraded} carte{totalGraded !== 1 ? 's' : ''} gradée{totalGraded !== 1 ? 's' : ''} · {sections.length} société{sections.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sections.map(({ company, cards }) => (
          <Section
            key={company}
            company={company}
            cards={cards}
            open={!!openMap[company]}
            onToggle={() => toggleSection(company)}
            onPress={setSelectedCard}
          />
        ))}
      </ScrollView>

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
  empty:     { color: '#888', fontSize: 15, fontFamily: fonts.semibold, textAlign: 'center' },
  emptySub:  { color: '#555', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: '20px' },
  // Header
  header:     { padding: '12px 16px', backgroundColor: '#16213e', borderBottom: '1px solid #2a2a4a' },
  headerText: { color: '#ccc', fontSize: 13, fontFamily: fonts.semibold },
  content:    { padding: 10, paddingBottom: 28 },
  // Section déroulante
  section:       { marginBottom: 8, borderRadius: 12, overflow: 'hidden', border: '1px solid #2a2a4a' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', padding: '12px 14px', gap: 8 },
  sectionTitle:  { color: '#fff', fontSize: 14, fontFamily: fonts.bold, flex: 1 },
  sectionBadge:  { backgroundColor: '#2a2a4a', borderRadius: 10, paddingLeft: 7, paddingRight: 7, paddingTop: 2, paddingBottom: 2 },
  sectionBadgeText: { color: '#aaa', fontSize: 11, fontFamily: fonts.bold },
  sectionChevron:{ color: '#E63F00', fontSize: 16, fontFamily: fonts.bold, marginLeft: 2 },
  sectionBody:   { backgroundColor: '#1a1a2e', padding: '6px 10px 10px' },
  // Rangée carte
  cardRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, marginTop: 6, padding: 10, border: '1px solid #2a2a4a' },
  cardThumb: { width: 44, height: 62, borderRadius: 4, marginRight: 12, flexShrink: 0 },
  cardInfo:  { flex: 1 },
  cardName:  { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
  cardMeta:  { color: '#888', fontSize: 11, marginTop: 2 },
  // Badge grade
  gradeBadge: { backgroundColor: '#2e1f00', borderRadius: 8, paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5, marginLeft: 8, flexShrink: 0 },
  gradeValue: { color: '#f1c40f', fontSize: 15, fontFamily: fonts.extrabold },
});
