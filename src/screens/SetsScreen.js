import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLang, LANGUAGES } from '../utils/LanguageContext';
import { fonts } from '../utils/theme';
import { getCached, setCached } from '../utils/cache';
import { filterSets, resolveSetQuery } from '../utils/setNames';
import { getFavoriteSets, toggleFavoriteSet } from '../utils/storage';

const LANG_NOTE = {
  fr: "🇫🇷 Les sets FR ne sont pas dans l'API — les visuels sont en anglais mais les numéros de cartes sont identiques.",
  ja: "🇯🇵 Les sets JA ne sont pas dans l'API — les visuels sont en anglais mais les numéros de cartes sont identiques.",
};

export default function SetsScreen({ navigation }) {
  const { lang } = useLang();
  const [sets, setSets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [translatedSet, setTranslatedSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteSets, setFavoriteSets] = useState({});

  useFocusEffect(useCallback(() => { getFavoriteSets().then(setFavoriteSets); }, []));

  const handleToggleFavoriteSet = async (set) => {
    const updated = await toggleFavoriteSet(set);
    setFavoriteSets({ ...updated });
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSearch('');
    const cacheKey = `sets:${lang}`;

    (async () => {
      try {
        const cached = await getCached(cacheKey);
        if (cached) {
          setSets(cached);
          setFiltered(cached);
          setLoading(false);
          return;
        }

        // L'API ne supporte que l'anglais — on charge tous les sets pour toutes les langues
        const url = `https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250`;
        const res = await fetch(url);
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
    if (!search.trim()) {
      setFiltered(sets);
      setTranslatedSet(null);
    } else {
      const { translated, wasFrench } = resolveSetQuery(search);
      setTranslatedSet(wasFrench ? translated : null);
      setFiltered(filterSets(sets, search));
    }
  }, [search, sets]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E63F00" />
        <Text style={styles.loadingText}>Chargement des sets...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Erreur : {error}</Text>
        <Text style={styles.emptyText}>Vérifiez votre connexion internet.</Text>
      </View>
    );
  }

  if (sets.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Aucun set trouvé pour cette langue.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {LANG_NOTE[lang] && (
        <View style={styles.note}>
          <Text style={styles.noteText}>{LANG_NOTE[lang]}</Text>
        </View>
      )}
      <TextInput
        style={styles.search}
        placeholder="Rechercher un set... (ex: Évolutions Prismatiques)"
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />
      {translatedSet && (
        <Text style={styles.translatedNote}>
          🔄 Recherche traduite : <Text style={styles.translatedWord}>{translatedSet}</Text>
        </Text>
      )}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isFav = !!favoriteSets[item.id];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Cards', { set: item })}
            >
              <Image
                source={{ uri: item.images?.logo }}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.info}>
                <Text style={styles.setName}>{item.name}</Text>
                <Text style={styles.setMeta}>
                  {item.series} · {item.total} cartes
                </Text>
                <Text style={styles.setDate}>{item.releaseDate}</Text>
              </View>
              <TouchableOpacity
                style={[styles.favBtn, isFav && styles.favBtnActive]}
                onPress={() => handleToggleFavoriteSet(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.favStar, isFav && styles.favStarActive]}>
                  {isFav ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#ccc',
    marginTop: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  search: {
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#16213e',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  translatedNote: {
    color: '#888',
    fontSize: 11,
    paddingHorizontal: 14,
    marginTop: -6,
    marginBottom: 6,
  },
  translatedWord: {
    color: '#E63F00',
    fontFamily: fonts.bold,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  logo: {
    width: 80,
    height: 45,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  setName: {
    color: '#fff',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  setMeta: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 3,
  },
  setDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  note: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#1e2a1e',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  noteText: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 16,
  },
  favBtn: {
    padding: 6,
    borderRadius: 8,
  },
  favBtnActive: {
    backgroundColor: '#2e1f00',
  },
  favStar: {
    fontSize: 22,
    color: '#444',
  },
  favStarActive: {
    color: '#f1c40f',
  },
});
