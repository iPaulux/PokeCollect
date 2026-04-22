import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, TextInput, useFocusEffect,
} from '../components/rn-web';
import { useLang, LANGUAGES } from '../utils/LanguageContext.jsx';
import { fonts } from '../utils/theme';
import { getCached, setCached } from '../utils/cache';
import { filterSets, resolveSetQuery, getLocalizedSetName } from '../utils/setNames';
import { getFavoriteSets, toggleFavoriteSet, getOwnedCards } from '../utils/storage';

const LANG_NOTE = {
  fr: "🇫🇷 Les sets FR ne sont pas dans l'API — les visuels sont en anglais mais les numéros de cartes sont identiques.",
  ja: "🇯🇵 Les sets JA ne sont pas dans l'API — les visuels sont en anglais mais les numéros de cartes sont identiques.",
};

function ProgressBar({ value, total }) {
  if (!total) return null;
  const pct = Math.round((value / total) * 100);
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.progressPct}>{pct}%</Text>
    </View>
  );
}

export default function SetsScreen() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [sets, setSets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [translatedSet, setTranslatedSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteSets, setFavoriteSets] = useState({});
  const [owned, setOwned] = useState({});
  const [viewMode, setViewMode] = useState('list');

  useFocusEffect(useCallback(() => {
    getFavoriteSets().then(setFavoriteSets);
    getOwnedCards().then(setOwned);
  }, []));

  const handleToggleFavoriteSet = async (set) => {
    const updated = await toggleFavoriteSet(set);
    setFavoriteSets({ ...updated });
  };

  const getSetOwnedCount = useCallback(
    (setId) => Object.keys(owned).filter((id) => id.startsWith(setId + '-')).length,
    [owned]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSearch('');
    const cacheKey = `sets:${lang}`;
    (async () => {
      try {
        const cached = await getCached(cacheKey);
        if (cached) { setSets(cached); setFiltered(cached); setLoading(false); return; }
        const res = await fetch(`https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const result = data.data || [];
        await setCached(cacheKey, result);
        setSets(result);
        setFiltered(result);
      } catch (e) {
        setError(e.message || 'Erreur réseau');
      } finally {
        setLoading(false);
      }
    })();
  }, [lang]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(sets); setTranslatedSet(null); }
    else {
      const { translated, wasFrench } = resolveSetQuery(search);
      setTranslatedSet(wasFrench ? translated : null);
      setFiltered(filterSets(sets, search));
    }
  }, [search, sets]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#E63F00" />
      <Text style={styles.loadingText}>Chargement des sets...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>Erreur : {error}</Text>
      <Text style={styles.emptyText}>Vérifiez votre connexion internet.</Text>
    </View>
  );

  const renderListItem = ({ item }) => {
    const isFav = !!favoriteSets[item.id];
    const ownedCount = getSetOwnedCount(item.id);
    const localName = getLocalizedSetName(item.name, lang);
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigate(`/sets/${item.id}`, { state: { set: item } })}>
        <Image source={{ uri: item.images?.logo }} style={styles.logo} resizeMode="contain" />
        <View style={styles.info}>
          <View style={styles.setNameRow}>
            <Text style={styles.setName} numberOfLines={1}>{localName}</Text>
            {item.id && <Text style={styles.ptcgoTag}>{item.id.toUpperCase()}</Text>}
          </View>
          <Text style={styles.setMeta}>{item.series} · {item.total} cartes</Text>
          <Text style={styles.setDate}>{item.releaseDate}</Text>
          <ProgressBar value={ownedCount} total={item.total} />
        </View>
        <TouchableOpacity
          style={[styles.favBtn, isFav && styles.favBtnActive]}
          onPress={(e) => { e.stopPropagation(); handleToggleFavoriteSet(item); }}
        >
          <Text style={[styles.favStar, isFav && styles.favStarActive]}>{isFav ? '★' : '☆'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderGridItem = ({ item }) => {
    const isFav = !!favoriteSets[item.id];
    const ownedCount = getSetOwnedCount(item.id);
    const pct = item.total ? Math.round((ownedCount / item.total) * 100) : 0;
    const localName = getLocalizedSetName(item.name, lang);
    return (
      <TouchableOpacity style={styles.gridCell} onPress={() => navigate(`/sets/${item.id}`, { state: { set: item } })}>
        <TouchableOpacity style={[styles.gridFavBtn, isFav && styles.favBtnActive]} onPress={(e) => { e.stopPropagation(); handleToggleFavoriteSet(item); }}>
          <Text style={[styles.favStar, isFav && styles.favStarActive, { fontSize: 16 }]}>{isFav ? '★' : '☆'}</Text>
        </TouchableOpacity>
        <Image source={{ uri: item.images?.logo }} style={styles.gridLogo} resizeMode="contain" />
        <Text style={styles.gridName} numberOfLines={2}>{localName}</Text>
        {item.id && <Text style={styles.gridCode}>{item.id.toUpperCase()}</Text>}
        <View style={styles.gridProgressBg}>
          <View style={[styles.gridProgressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.gridPct}>{ownedCount}/{item.total}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {LANG_NOTE[lang] && (
        <View style={styles.note}>
          <Text style={styles.noteText}>{LANG_NOTE[lang]}</Text>
        </View>
      )}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Rechercher un set..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.viewToggle} onPress={() => setViewMode((v) => v === 'list' ? 'grid' : 'list')}>
          <Text style={styles.viewToggleText}>{viewMode === 'list' ? '⊞' : '☰'}</Text>
        </TouchableOpacity>
      </View>
      {translatedSet && (
        <Text style={styles.translatedNote}>
          🔄 Recherche traduite : <Text style={styles.translatedWord}>{translatedSet}</Text>
        </Text>
      )}
      <FlatList
        key={viewMode}
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        contentContainerStyle={viewMode === 'grid' ? styles.gridList : styles.list}
        renderItem={viewMode === 'list' ? renderListItem : renderGridItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  loadingText: { color: '#ccc', marginTop: 12, fontSize: 14, fontFamily: fonts.regular },
  emptyText: { color: '#888', fontSize: 14 },
  note: { marginHorizontal: 12, marginTop: 10, padding: 10, backgroundColor: '#1e2a1e', borderRadius: 8, borderLeft: '3px solid #4caf50' },
  noteText: { color: '#aaa', fontSize: 12, lineHeight: '16px' },
  searchRow: { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, gap: 8 },
  search: {
    flex: 1, padding: '10px 14px',
    backgroundColor: '#16213e', borderRadius: 10,
    color: '#fff', fontSize: 15,
    border: '1px solid #2a2a4a',
  },
  viewToggle: {
    width: 42, height: 42,
    backgroundColor: '#16213e', borderRadius: 10,
    border: '1px solid #2a2a4a',
    justifyContent: 'center', alignItems: 'center',
  },
  viewToggleText: { fontSize: 20, color: '#aaa' },
  translatedNote: { color: '#888', fontSize: 11, paddingHorizontal: 14, marginTop: 4, marginBottom: 2 },
  translatedWord: { color: '#E63F00', fontFamily: fonts.bold },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213e', borderRadius: 12,
    marginBottom: 10, padding: 12,
    border: '1px solid #2a2a4a',
  },
  logo: { width: 80, height: 45, marginRight: 14 },
  info: { flex: 1 },
  setNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  setName: { color: '#fff', fontSize: 15, fontFamily: fonts.bold, flexShrink: 1 },
  ptcgoTag: { color: '#888', fontSize: 10, fontFamily: fonts.bold, backgroundColor: '#2a2a4a', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, letterSpacing: 0.5 },
  setMeta: { color: '#aaa', fontSize: 12, marginTop: 3 },
  setDate: { color: '#666', fontSize: 11, marginTop: 2 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  progressBg: { flex: 1, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E63F00', borderRadius: 2 },
  progressPct: { color: '#E63F00', fontSize: 10, fontFamily: fonts.bold, minWidth: 28, textAlign: 'right' },
  favBtn: { padding: 6, borderRadius: 8 },
  favBtnActive: { backgroundColor: '#2e1f00' },
  favStar: { fontSize: 22, color: '#444' },
  favStarActive: { color: '#f1c40f' },
  gridList: { padding: 8, paddingBottom: 20 },
  gridCell: {
    flex: 1, margin: 5,
    backgroundColor: '#16213e', borderRadius: 12,
    padding: 10, alignItems: 'center',
    border: '1px solid #2a2a4a', position: 'relative',
  },
  gridFavBtn: { position: 'absolute', top: 6, right: 6, padding: 4, borderRadius: 6, zIndex: 1 },
  gridLogo: { width: '100%', height: 50, marginBottom: 6 },
  gridName: { color: '#fff', fontSize: 11, fontFamily: fonts.bold, textAlign: 'center', marginBottom: 3 },
  gridCode: { color: '#666', fontSize: 9, fontFamily: fonts.bold, letterSpacing: 0.5, marginBottom: 5 },
  gridProgressBg: { width: '100%', height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  gridProgressFill: { height: '100%', backgroundColor: '#E63F00', borderRadius: 2 },
  gridPct: { color: '#666', fontSize: 10 },
});
