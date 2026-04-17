import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  FlatList,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import { getOwnedCards, toggleCard } from '../utils/storage';
import CardDetailModal from '../components/CardDetailModal';
import { fonts } from '../utils/theme';
import TextRecognition from '@react-native-ml-kit/text-recognition';

// Extrait le nom probable de la carte depuis les blocs ML Kit
// Les cartes Pokémon ont le nom en gros en haut — c'est le premier bloc avec une maj
function extractCardName(result) {
  const allLines = [];
  for (const block of result.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const txt = line.text?.trim();
      if (txt && txt.length > 1 && txt.length < 40 && !/^\d+$/.test(txt)) {
        allLines.push({ txt, y: line.frame?.top ?? 999 });
      }
    }
  }
  // Trier par position verticale (le nom est en haut de la carte)
  allLines.sort((a, b) => a.y - b.y);
  // Prendre la première ligne qui commence par une majuscule
  const candidate = allLines.find((l) => /^[A-ZÁÀÉÈÊËÎÏÔÙÛ]/.test(l.txt));
  return candidate?.txt ?? allLines[0]?.txt ?? '';
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState('camera'); // 'camera' | 'loading' | 'results'
  const [photoUri, setPhotoUri] = useState(null);
  const [ocrStatus, setOcrStatus] = useState(''); // '' | 'scanning' | 'done' | 'failed'
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState([]);
  const [searching, setSearching] = useState(false);
  const [owned, setOwned] = useState({});
  const [selectedCard, setSelectedCard] = useState(null);
  const cameraRef = useRef(null);
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 16 - 24) / 3;

  useFocusEffect(
    useCallback(() => {
      getOwnedCards().then(setOwned);
    }, [])
  );

  const handleToggle = async (cardId) => {
    const updated = await toggleCard(cardId);
    setOwned({ ...updated });
  };

  // ── Capture ──────────────────────────────────────────────────────────────
  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const raw = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.9 });

      // Recadrer le tiers supérieur de l'image (zone du nom sur la carte)
      const cropped = await manipulateAsync(
        raw.uri,
        [{ crop: { originX: 0, originY: 0, width: raw.width, height: Math.round(raw.height * 0.28) } }],
        { compress: 1, format: SaveFormat.JPEG }
      );

      setPhotoUri(raw.uri);
      setPhase('results');
      setOcrStatus('scanning');
      setCards([]);
      setSearchQuery('');

      await runOCR(cropped.uri);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de prendre la photo.');
    }
  };

  // ── OCR — Google ML Kit on-device (offline, gratuit) ─────────────────────
  const runOCR = async (imageUri) => {
    try {
      const result = await TextRecognition.recognize(imageUri);
      const name = extractCardName(result);

      if (name) {
        setSearchQuery(name);
        setOcrStatus('done');
        await searchCards(name);
      } else {
        setOcrStatus('failed');
      }
    } catch {
      setOcrStatus('failed');
    }
  };

  // ── Recherche ─────────────────────────────────────────────────────────────
  const searchCards = async (q) => {
    const term = q.trim();
    if (!term) return;
    setSearching(true);
    try {
      const url = `https://api.pokemontcg.io/v2/cards?q=name:"*${term}*"&pageSize=24&select=id,name,number,rarity,set.name,images`;
      const res = await fetch(url);
      const data = await res.json();
      setCards(data.data || []);
    } catch {
      setCards([]);
    } finally {
      setSearching(false);
    }
  };

  const reset = () => {
    setPhase('camera');
    setPhotoUri(null);
    setOcrStatus('');
    setSearchQuery('');
    setCards([]);
  };

  // ── Permissions ──────────────────────────────────────────────────────────
  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Accès caméra requis</Text>
        <Text style={styles.permDesc}>
          L'accès à la caméra est nécessaire pour scanner tes cartes.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Vue résultats ─────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <View style={styles.container}>

        {/* Miniature + contrôles */}
        <View style={styles.resultHeader}>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.thumb} resizeMode="cover" />
          )}
          <View style={styles.resultHeaderInfo}>
            <Text style={styles.resultTitle}>Carte scannée</Text>
            {ocrStatus === 'scanning' && (
              <View style={styles.ocrRow}>
                <ActivityIndicator size="small" color="#E63F00" />
                <Text style={styles.ocrText}>Identification…</Text>
              </View>
            )}
            {ocrStatus === 'done' && (
              <Text style={styles.ocrDone}>✓ Nom détecté</Text>
            )}
            {ocrStatus === 'failed' && (
              <Text style={styles.ocrFailed}>OCR échoué — entre le nom</Text>
            )}
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetText}>↩ Rescanner</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Champ de recherche */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Nom de la carte…"
            placeholderTextColor="#555"
            onSubmitEditing={() => searchCards(searchQuery)}
            returnKeyType="search"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => searchCards(searchQuery)}
          >
            <Text style={styles.searchBtnIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Résultats */}
        {searching ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#E63F00" />
            <Text style={styles.hint}>Recherche en cours…</Text>
          </View>
        ) : cards.length > 0 ? (
          <>
            <Text style={styles.count}>{cards.length} résultat{cards.length > 1 ? 's' : ''}</Text>
            <FlatList
              data={cards}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => {
                const isOwned = !!owned[item.id];
                return (
                  <TouchableOpacity
                    style={[styles.cardCell, isOwned && styles.cardOwned, { width: CARD_WIDTH }]}
                    onPress={() => setSelectedCard(item)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.images?.small }}
                      style={[styles.cardImage, !isOwned && styles.cardImageGray]}
                      resizeMode="contain"
                    />
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardSet} numberOfLines={1}>{item.set?.name}</Text>
                    {isOwned && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </>
        ) : ocrStatus !== 'scanning' && !searching ? (
          <View style={styles.center}>
            <Text style={styles.hint}>
              {ocrStatus === 'failed'
                ? 'Entre le nom de la carte puis appuie sur 🔍'
                : 'Aucune carte trouvée — affine le nom'}
            </Text>
          </View>
        ) : null}

        <CardDetailModal
          visible={!!selectedCard}
          card={selectedCard}
          owned={!!owned[selectedCard?.id]}
          onToggle={() => selectedCard && handleToggle(selectedCard.id)}
          onClose={() => setSelectedCard(null)}
        />
      </View>
    );
  }

  // ── Vue caméra ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">

        {/* Cadre de visée carte */}
        <View style={styles.overlay}>
          <View style={styles.dimTop} />
          <View style={styles.middleRow}>
            <View style={styles.dimSide} />
            <View style={styles.cardFrame}>
              {/* Coins */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.dimSide} />
          </View>
          <View style={styles.dimBottom}>
            <Text style={styles.overlayHint}>Centre la carte dans le cadre</Text>
          </View>
        </View>

        {/* Bouton capture */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.captureBtn} onPress={takePicture} activeOpacity={0.8}>
            <View style={styles.captureRing}>
              <View style={styles.captureInner} />
            </View>
          </TouchableOpacity>
        </View>

      </CameraView>
    </View>
  );
}

const FRAME_W = 240;
const FRAME_H = 336; // ratio carte Pokémon ≈ 0.714

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  // ── Permissions
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, backgroundColor: '#1a1a2e' },
  permIcon: { fontSize: 52, marginBottom: 16 },
  permTitle: { color: '#fff', fontSize: 18, fontFamily: fonts.bold, marginBottom: 8, textAlign: 'center' },
  permDesc: { color: '#666', fontSize: 13, fontFamily: fonts.regular, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  permBtn: { backgroundColor: '#E63F00', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  permBtnText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },

  // ── Caméra
  camera: { flex: 1 },
  overlay: { flex: 1 },
  dimTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  middleRow: { flexDirection: 'row', height: FRAME_H },
  dimSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  dimBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14 },
  cardFrame: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: 12,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 22, height: 22,
    borderColor: '#E63F00',
    borderRadius: 3,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  overlayHint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: fonts.medium },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0, right: 0,
    alignItems: 'center',
  },
  captureBtn: { alignItems: 'center', justifyContent: 'center' },
  captureRing: {
    width: 74, height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 58, height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },

  // ── Résultats
  resultHeader: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  thumb: {
    width: 64, height: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  resultHeaderInfo: { flex: 1, gap: 4 },
  resultTitle: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
  ocrRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ocrText: { color: '#888', fontSize: 12, fontFamily: fonts.regular },
  ocrDone: { color: '#4caf50', fontSize: 12, fontFamily: fonts.semibold },
  ocrFailed: { color: '#E63F00', fontSize: 12, fontFamily: fonts.regular },
  resetBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  resetText: { color: '#aaa', fontSize: 12, fontFamily: fonts.semibold },

  searchRow: {
    flexDirection: 'row',
    margin: 12,
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.regular,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  searchBtn: {
    backgroundColor: '#E63F00',
    borderRadius: 10,
    width: 44, height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnIcon: { fontSize: 18 },
  count: { color: '#555', fontSize: 11, fontFamily: fonts.regular, paddingHorizontal: 14, paddingBottom: 4 },
  hint: { color: '#555', fontSize: 13, fontFamily: fonts.regular, textAlign: 'center', paddingHorizontal: 24 },

  // ── Grille cartes
  grid: { padding: 8 },
  cardCell: {
    margin: 4, borderRadius: 8, overflow: 'hidden',
    backgroundColor: '#16213e', alignItems: 'center', paddingBottom: 6,
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  cardOwned: { borderColor: '#E63F00', borderWidth: 2 },
  cardImage: { width: '100%', aspectRatio: 0.72 },
  cardImageGray: { opacity: 0.35 },
  cardName: { color: '#ddd', fontSize: 10, fontFamily: fonts.semibold, marginTop: 3, paddingHorizontal: 4, textAlign: 'center' },
  cardSet: { color: '#555', fontSize: 9, fontFamily: fonts.regular, paddingHorizontal: 4, textAlign: 'center' },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#E63F00', borderRadius: 10,
    width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.bold },
});
