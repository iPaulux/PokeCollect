import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, TextInput, useFocusEffect, ScrollView,
} from '../components/rn-web';
import { useLang, LANGUAGES } from '../utils/LanguageContext.jsx';
import { fonts } from '../utils/theme';
import { getApiCache, setApiCache, SETS_TTL } from '../utils/sharedCache';
import { pokemonApiUrl } from '../utils/api';
import { filterSets, resolveSetQuery, getLocalizedSetName } from '../utils/setNames';
import { getFavoriteSets, toggleFavoriteSet, getOwnedCards, getGradingInfo } from '../utils/storage';
import ArticlesModal from '../components/ArticlesModal';
import ConventionsModal from '../components/ConventionsModal';

// ─── Modale "Ma collection" ───────────────────────────────────────────────────
function CollectionModal({ visible, owned, onClose }) {
  if (!visible) return null;

  // Groupe les cartes par setId (ex: 'sv3pt5-152' → setId 'sv3pt5')
  const bySet = useMemo(() => {
    const map = {};
    Object.entries(owned).forEach(([cardId, val]) => {
      // Le setId est tout ce qui précède le dernier segment numérique
      const parts = cardId.split('-');
      // Cherche le dernier segment qui est numérique pour isoler le setId
      let numIdx = parts.length - 1;
      while (numIdx > 0 && !/^\d+$/.test(parts[numIdx])) numIdx--;
      const setId = parts.slice(0, numIdx).join('-') || parts[0];
      if (!map[setId]) map[setId] = { setId, owned: 0, graded: 0 };
      map[setId].owned += 1;
      if (val && typeof val === 'object' && val.graded) map[setId].graded += 1;
    });
    return Object.values(map).sort((a, b) => b.owned - a.owned);
  }, [owned]);

  const total = Object.keys(owned).length;
  const gradedTotal = Object.values(owned).filter((v) => v && typeof v === 'object' && v.graded).length;

  return createPortal(
    <>
      <div className="modal-backdrop" style={{ zIndex: 900, backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="modal-sheet" style={{ zIndex: 901, backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '88vh', border: '1px solid #2a2a4a', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.25s ease' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, margin: '10px auto 0', flexShrink: 0 }} />
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '16px 16px 40px' }}>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 18, color: '#fff', margin: '0 0 4px' }}>🃏 Ma collection</p>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#888', margin: '0 0 16px' }}>
              {total} carte{total > 1 ? 's' : ''} possédée{total > 1 ? 's' : ''}
              {gradedTotal > 0 ? `  ·  ${gradedTotal} gradée${gradedTotal > 1 ? 's' : ''}` : ''}
            </p>
            {bySet.length === 0 ? (
              <p style={{ fontFamily: 'Poppins, sans-serif', color: '#555', textAlign: 'center', marginTop: 40 }}>Aucune carte dans la collection</p>
            ) : bySet.map(({ setId, owned: count, graded }) => (
              <div key={setId} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #2a2a4a' }}>
                <img src={`https://images.pokemontcg.io/${setId}/logo.png`} alt={setId} style={{ height: 30, width: 60, objectFit: 'contain', marginRight: 12 }} onError={(e) => { e.target.style.opacity = 0; }} />
                <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>{setId.toUpperCase()}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15, color: '#E63F00' }}>{count}</span>
                  {graded > 0 && <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 10, color: '#f1c40f' }}>★ {graded} gradée{graded > 1 ? 's' : ''}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Modale "Statistiques" ────────────────────────────────────────────────────
function StatsModal({ visible, owned, onClose }) {
  if (!visible) return null;

  const allCards = Object.entries(owned);
  const total    = allCards.length;

  // Grading
  const graded    = allCards.filter(([, v]) => v && typeof v === 'object' && v.graded);
  const notGraded = total - graded.length;
  const byCompany = graded.reduce((acc, [, v]) => {
    acc[v.company] = (acc[v.company] || 0) + 1; return acc;
  }, {});

  // Sets couverts
  const setIds = new Set(allCards.map(([id]) => {
    const parts = id.split('-');
    let i = parts.length - 1;
    while (i > 0 && !/^\d+$/.test(parts[i])) i--;
    return parts.slice(0, i).join('-') || parts[0];
  }));

  const StatRow = ({ label, value, accent }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 10, borderBottom: '1px solid #2a2a4a' }}>
      <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#aaa' }}>{label}</span>
      <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15, color: accent || '#fff' }}>{value}</span>
    </div>
  );

  return createPortal(
    <>
      <div className="modal-backdrop" style={{ zIndex: 900, backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="modal-sheet" style={{ zIndex: 901, backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80vh', border: '1px solid #2a2a4a', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.25s ease' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, margin: '10px auto 0', flexShrink: 0 }} />
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '16px 16px 40px' }}>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 18, color: '#fff', margin: '0 0 18px' }}>📊 Statistiques</p>

            {/* Bloc général */}
            <div style={{ backgroundColor: '#1a1a2e', borderRadius: 14, padding: '6px 14px 2px', marginBottom: 16, border: '1px solid #2a2a4a' }}>
              <StatRow label="Cartes possédées" value={total} accent="#E63F00" />
              <StatRow label="Sets couverts" value={setIds.size} />
              <StatRow label="Cartes non gradées" value={notGraded} />
              <StatRow label="Cartes gradées" value={graded.length} accent="#f1c40f" />
            </div>

            {/* Grading par compagnie */}
            {graded.length > 0 && (
              <>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 12, color: '#E63F00', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Grading par compagnie</p>
                <div style={{ backgroundColor: '#1a1a2e', borderRadius: 14, padding: '6px 14px 2px', marginBottom: 16, border: '1px solid #2a2a4a' }}>
                  {Object.entries(byCompany).sort((a, b) => b[1] - a[1]).map(([company, count]) => (
                    <StatRow key={company} label={company} value={count} />
                  ))}
                </div>
              </>
            )}

            {/* Grades distribués */}
            {graded.length > 0 && (() => {
              const byGrade = graded.reduce((acc, [, v]) => {
                const key = `${v.company} ${v.grade}`;
                acc[key] = (acc[key] || 0) + 1; return acc;
              }, {});
              const sorted = Object.entries(byGrade).sort((a, b) => b[1] - a[1]);
              return (
                <>
                  <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 12, color: '#E63F00', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Top grades</p>
                  <div style={{ backgroundColor: '#1a1a2e', borderRadius: 14, padding: '6px 14px 2px', border: '1px solid #2a2a4a' }}>
                    {sorted.map(([grade, count]) => (
                      <StatRow key={grade} label={grade} value={`× ${count}`} />
                    ))}
                  </div>
                </>
              );
            })()}

            {total === 0 && (
              <p style={{ fontFamily: 'Poppins, sans-serif', color: '#555', textAlign: 'center', marginTop: 40 }}>Aucune donnée — commence à collecter !</p>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

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
  const [collectionVisible, setCollectionVisible]   = useState(false);
  const [statsVisible, setStatsVisible]             = useState(false);
  const [articlesVisible, setArticlesVisible]       = useState(false);
  const [conventionsVisible, setConventionsVisible] = useState(false);

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
        // 3-tiers : local SQLite → Supabase → API
        const cached = await getApiCache(cacheKey, SETS_TTL);
        if (cached) { setSets(cached); setFiltered(cached); setLoading(false); return; }
        const res = await fetch(pokemonApiUrl('/sets', { orderBy: '-releaseDate', pageSize: 250 }));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const result = data.data || [];
        await setApiCache(cacheKey, result); // écrit en local + Supabase
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

  const totalOwned  = Object.keys(owned).length;
  const gradedCount = Object.values(owned).filter((v) => v && typeof v === 'object' && v.graded).length;
  const setsCount   = new Set(Object.keys(owned).map((id) => {
    const p = id.split('-'); let i = p.length - 1;
    while (i > 0 && !/^\d+$/.test(p[i])) i--;
    return p.slice(0, i).join('-') || p[0];
  })).size;

  return (
    <View style={styles.container}>
      {LANG_NOTE[lang] && (
        <View style={styles.note}>
          <Text style={styles.noteText}>{LANG_NOTE[lang]}</Text>
        </View>
      )}

      {/* ── Blocs rapides ── */}
      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickCard} onPress={() => setCollectionVisible(true)}>
          <Text style={styles.quickIcon}>🃏</Text>
          <Text style={styles.quickValue}>{totalOwned}</Text>
          <Text style={styles.quickLabel}>Ma collection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => setStatsVisible(true)}>
          <Text style={styles.quickIcon}>📊</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={styles.quickValue}>{setsCount}</Text>
            <Text style={[styles.quickLabel, { fontSize: 10, marginBottom: 1 }]}>sets</Text>
          </View>
          <Text style={styles.quickLabel}>Statistiques</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickCard} onPress={() => setArticlesVisible(true)}>
          <Text style={styles.quickIcon}>📰</Text>
          <Text style={styles.quickLabel} numberOfLines={1}>Actualités TCG</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => setConventionsVisible(true)}>
          <Text style={styles.quickIcon}>📅</Text>
          <Text style={styles.quickLabel} numberOfLines={1}>Conventions FR</Text>
        </TouchableOpacity>
      </View>

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

      <CollectionModal  visible={collectionVisible}   owned={owned} onClose={() => setCollectionVisible(false)} />
      <StatsModal       visible={statsVisible}        owned={owned} onClose={() => setStatsVisible(false)} />
      <ArticlesModal    visible={articlesVisible}               onClose={() => setArticlesVisible(false)} />
      <ConventionsModal visible={conventionsVisible}            onClose={() => setConventionsVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  // Blocs rapides home
  quickRow: { flexDirection: 'row', marginLeft: 12, marginRight: 12, marginTop: 10, marginBottom: 0, gap: 10 },
  quickCard: {
    flex: 1, backgroundColor: '#16213e', borderRadius: 14,
    padding: '12px 10px', alignItems: 'center', justifyContent: 'center',
    border: '1px solid #2a2a4a', minHeight: 72,
  },
  quickIcon:  { fontSize: 22, marginBottom: 4 },
  quickValue: { color: '#E63F00', fontSize: 22, fontFamily: fonts.extrabold, lineHeight: '26px' },
  quickLabel: { color: '#888', fontSize: 11, fontFamily: fonts.semibold, marginTop: 2, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  loadingText: { color: '#ccc', marginTop: 12, fontSize: 14, fontFamily: fonts.regular },
  emptyText: { color: '#888', fontSize: 14 },
  note: { marginLeft: 12, marginRight: 12, marginTop: 10, padding: 10, backgroundColor: '#1e2a1e', borderRadius: 8, borderLeft: '3px solid #4caf50' },
  noteText: { color: '#aaa', fontSize: 12, lineHeight: '16px' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 12, marginRight: 12, marginTop: 12, marginBottom: 6, gap: 8 },
  search: {
    flex: 1, padding: '10px 14px',
    backgroundColor: '#16213e', borderRadius: 10,
    color: '#fff', fontSize: 15,
    border: '1px solid #2a2a4a',
    fontFamily: fonts.regular,
  },
  viewToggle: {
    width: 42, height: 42, flexShrink: 0,
    backgroundColor: '#16213e', borderRadius: 10,
    border: '1px solid #2a2a4a',
    justifyContent: 'center', alignItems: 'center',
  },
  viewToggleText: { fontSize: 20, color: '#aaa' },
  translatedNote: { color: '#888', fontSize: 11, paddingLeft: 12, paddingRight: 12, marginTop: 2, marginBottom: 4 },
  translatedWord: { color: '#E63F00', fontFamily: fonts.bold },
  list: { paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213e', borderRadius: 12,
    marginBottom: 8, padding: 12,
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
  gridList: { paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 20 },
  gridCell: {
    flex: 1, margin: 4,
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
