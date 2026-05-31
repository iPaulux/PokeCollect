import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScanLine, CameraOff, Search, X, RotateCcw, ZapOff } from 'lucide-react';
import { getOwnedCards, toggleCard, getFavoriteCards, toggleFavoriteCard } from '../utils/storage';
import CardDetailModal from '../components/CardDetailModal';
import { pokemonApiUrl } from '../utils/api';

const P = 'Poppins, sans-serif';

// ─── OCR worker (lazy — chargé à la première utilisation) ─────────────────────
let _ocrWorker     = null;
let _ocrInitPromise = null;
let _ocrStatus     = 'idle'; // 'idle' | 'loading' | 'ready' | 'error'

async function getOcrWorker(onStatus) {
  if (_ocrWorker) return _ocrWorker;
  if (_ocrInitPromise) return _ocrInitPromise;

  _ocrStatus = 'loading';
  onStatus?.('loading');

  _ocrInitPromise = (async () => {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        // Désactive les logs verbeux
        logger: () => {},
      });
      await worker.setParameters({
        // Whitelist chiffres + slash → lecture rapide du numéro de carte
        tessedit_char_whitelist: '0123456789/',
        // PSM 7 : single line of text  — parfait pour le numéro "025/197"
        tessedit_pageseg_mode: '7',
      });
      _ocrWorker  = worker;
      _ocrStatus  = 'ready';
      onStatus?.('ready');
      return worker;
    } catch (e) {
      _ocrStatus = 'error';
      onStatus?.('error');
      throw e;
    }
  })();
  return _ocrInitPromise;
}

// ─── Prétraitement canvas avant OCR ──────────────────────────────────────────
// Grayscale + contraste + échelle ×2 pour améliorer la précision d'OCR
function preprocessCanvas(srcCanvas) {
  const scale = 2;
  const dst   = document.createElement('canvas');
  dst.width   = srcCanvas.width  * scale;
  dst.height  = srcCanvas.height * scale;
  const ctx   = dst.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0, dst.width, dst.height);

  // Grayscale + contraste
  const img = ctx.getImageData(0, 0, dst.width, dst.height);
  const d   = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g   = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    // Contraste : mappage linéaire [50..200] → [0..255]
    const c   = Math.max(0, Math.min(255, Math.round((g - 50) * (255 / 150))));
    d[i] = d[i + 1] = d[i + 2] = c;
  }
  ctx.putImageData(img, 0, 0);
  return dst;
}

// ─── Crop sur la zone de scan + bande du bas (numéro de carte) ───────────────
function cropNumberArea(video, invertColors = false) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  // Calcul des coordonnées du cadre de scan (identique à l'overlay CSS)
  const frameW = vw * 0.65;
  const frameH = frameW * (4 / 3);
  const frameX = (vw - frameW) / 2;
  const frameY = (vh - frameH) / 2;

  // Bande du bas : 18 % du cadre (zone où se trouve le numéro "025/197")
  const stripH = frameH * 0.18;
  const stripY = frameY + frameH - stripH;

  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(frameW);
  canvas.height = Math.round(stripH);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, frameX, stripY, frameW, stripH, 0, 0, canvas.width, canvas.height);

  if (invertColors) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i]     = 255 - img.data[i];
      img.data[i + 1] = 255 - img.data[i + 1];
      img.data[i + 2] = 255 - img.data[i + 2];
    }
    ctx.putImageData(img, 0, 0);
  }
  return canvas;
}

// ─── Extraction du pattern "NNN" ou "NNN/NNN" dans un texte OCR ──────────────
function extractCardNumber(text) {
  // ex: " 025/197 " → "025" / "025/197"
  const match = text.match(/\b(\d{1,4}(?:\/\d{1,4})?)\b/);
  return match ? match[1] : null;
}

// ─── Recherche API ─────────────────────────────────────────────────────────────
async function searchCards(query) {
  const q = query.trim();
  // Détermine si c'est un numéro (ex: "025", "163/193") ou un nom
  const isNumber = /^\d{1,4}(\/\d{1,4})?$/.test(q);

  if (isNumber) {
    const num = q.includes('/') ? q.split('/')[0] : q;
    const url = pokemonApiUrl('/cards', {
      q: `number:${num}`,
      pageSize: 30,
      select: 'id,name,number,rarity,set,images',
    });
    const res  = await fetch(url);
    const json = await res.json();
    return json.data ?? [];
  } else {
    // Recherche par nom
    const url = pokemonApiUrl('/cards', {
      q: `name:"*${q}*"`,
      orderBy: 'name',
      pageSize: 20,
      select: 'id,name,number,rarity,set,images',
    });
    const res  = await fetch(url);
    const json = await res.json();
    return json.data ?? [];
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const detectorRef = useRef(null);
  const rafRef      = useRef(null);
  // Fix stale closure : utiliser useRef au lieu de state pour le dernier scan
  const lastScanRef     = useRef(null);
  const lastScanTimeRef = useRef(0);

  const [camState, setCamState]     = useState('idle');
  const [facingMode, setFacingMode] = useState('environment');
  const [manualInput, setManualInput] = useState('');
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [owned, setOwned]           = useState({});
  const [favorites, setFavorites]   = useState({});

  // États OCR
  const [ocrState, setOcrState]     = useState('idle'); // 'idle'|'loading'|'ready'|'running'|'error'
  const [snapPreview, setSnapPreview] = useState(null); // base64 du crop affiché brièvement
  const [detectedText, setDetectedText] = useState(null); // numéro détecté

  // ─── Possessions ────────────────────────────────────────────────────────────
  const refreshState = useCallback(async () => {
    const [o, f] = await Promise.all([getOwnedCards(), getFavoriteCards()]);
    setOwned(o);
    setFavorites(f);
  }, []);
  useEffect(() => { refreshState(); }, [refreshState]);

  // ─── Caméra ──────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode = facingMode) => {
    setCamState('starting');
    setError(null);
    setResults([]);
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState('active');

      // BarcodeDetector (Chrome 83+, Safari 17.4+) — fix stale closure via ref
      if ('BarcodeDetector' in window) {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'data_matrix'],
        });
        scheduleBarcodeLoop();
      }
    } catch (e) {
      if (e.name === 'NotAllowedError') setCamState('denied');
      else { setCamState('unsupported'); setError(e.message); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ─── BarcodeDetector loop (corrigé : useRef → pas de stale closure) ──────────
  const scheduleBarcodeLoop = useCallback(() => {
    rafRef.current = requestAnimationFrame(async () => {
      if (!videoRef.current || !detectorRef.current) return;
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          const now  = Date.now();
          // Cooldown 5 s par code pour éviter les doublons
          if (code !== lastScanRef.current || now - lastScanTimeRef.current > 5000) {
            lastScanRef.current     = code;
            lastScanTimeRef.current = now;
            handleSearch(code);
          }
        }
      } catch (_) {}
      scheduleBarcodeLoop();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCamState('idle');
    setSnapPreview(null);
  }, []);

  useEffect(() => () => stopCamera(), []);

  const flipCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (camState === 'active') startCamera(next);
  }, [facingMode, camState, startCamera]);

  // ─── Recherche (numéro ou nom) ───────────────────────────────────────────────
  const handleSearch = useCallback(async (query) => {
    const q = (query ?? manualInput).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const cards = await searchCards(q);
      if (!cards.length) setError(`Aucune carte trouvée pour "${q}"`);
      else setResults(cards);
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.');
    } finally {
      setLoading(false);
    }
  }, [manualInput]);

  // ─── Snap → OCR ──────────────────────────────────────────────────────────────
  const handleSnap = useCallback(async () => {
    if (!videoRef.current || ocrState === 'running') return;

    setOcrState('running');
    setDetectedText(null);
    setSnapPreview(null);
    setError(null);

    // 1. Crop la bande du bas du cadre de scan
    const crop = cropNumberArea(videoRef.current, false);
    if (!crop) { setOcrState('idle'); return; }

    // Affiche le crop brièvement
    setSnapPreview(crop.toDataURL());

    // 2. Prétraitement
    const processed = preprocessCanvas(crop);

    // 3. OCR (lazy load)
    try {
      const worker = await getOcrWorker((s) => {
        if (s === 'loading') setOcrState('loading');
        if (s === 'ready')   setOcrState('running');
        if (s === 'error')   setOcrState('error');
      });

      const { data } = await worker.recognize(processed);
      let number = extractCardNumber(data.text);

      // Deuxième essai avec couleurs inversées si pas de résultat
      if (!number) {
        const cropInv = cropNumberArea(videoRef.current, true);
        if (cropInv) {
          const procInv     = preprocessCanvas(cropInv);
          const { data: d2 } = await worker.recognize(procInv);
          number = extractCardNumber(d2.text);
        }
      }

      if (number) {
        setDetectedText(number);
        setManualInput(number);
        handleSearch(number);
      } else {
        setError('Numéro non détecté — ajuste le cadrage ou saisis-le manuellement.');
      }
    } catch {
      setError('OCR indisponible — saisis le numéro manuellement.');
    } finally {
      setOcrState('ready');
      setTimeout(() => setSnapPreview(null), 1500);
    }
  }, [ocrState, handleSearch]);

  // ─── Toggle owned/fav ────────────────────────────────────────────────────────
  const handleToggleOwned = useCallback(async (card) => { await toggleCard(card); refreshState(); }, [refreshState]);
  const handleToggleFav   = useCallback(async (card) => { await toggleFavoriteCard(card); refreshState(); }, [refreshState]);

  // ─── Rendu caméra ────────────────────────────────────────────────────────────
  const renderCamera = () => {
    if (camState === 'idle') return (
      <div style={S.camPlaceholder} onClick={() => startCamera()}>
        <ScanLine size={48} color="#E63F00" strokeWidth={1.5} />
        <p style={S.camHint}>Appuyer pour activer la caméra</p>
        <p style={S.camSub}>Scan automatique · OCR · Saisie manuelle</p>
      </div>
    );
    if (camState === 'starting') return (
      <div style={S.camPlaceholder}>
        <div style={S.spinner} />
        <p style={S.camHint}>Activation…</p>
      </div>
    );
    if (camState === 'denied') return (
      <div style={S.camPlaceholder}>
        <CameraOff size={40} color="#e74c3c" />
        <p style={{ ...S.camHint, color: '#e74c3c' }}>Accès caméra refusé</p>
        <p style={S.camSub}>Utilise la recherche manuelle ci-dessous</p>
      </div>
    );
    if (camState === 'unsupported') return (
      <div style={S.camPlaceholder}>
        <ZapOff size={40} color="#888" />
        <p style={{ ...S.camHint, color: '#888' }}>Caméra non disponible</p>
        <p style={S.camSub}>Utilise la recherche manuelle ci-dessous</p>
      </div>
    );

    // Active
    const isOcrBusy  = ocrState === 'loading' || ocrState === 'running';
    const barcodeOk  = 'BarcodeDetector' in window;

    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' }}>
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Preview OCR crop */}
        {snapPreview && (
          <div style={{
            position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 8, overflow: 'hidden',
            border: '2px solid #E63F00', maxWidth: '80%',
          }}>
            <img src={snapPreview} alt="crop" style={{ display: 'block', height: 40, width: 'auto' }} />
          </div>
        )}

        {/* Overlay cadre de scan */}
        <div style={S.scanOverlay}>
          <div style={S.scanFrame}>
            <div style={{ ...S.corner, top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }} />
            <div style={{ ...S.corner, top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }} />
            <div style={{ ...S.corner, bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }} />
            <div style={{ ...S.corner, bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }} />
            {!isOcrBusy && <div style={S.scanLineAnim} />}
            {/* Indicateur zone numéro */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '18%',
              border: '1px dashed rgba(230,63,0,0.5)',
              borderBottom: 'none',
              borderLeft: 'none',
              borderRight: 'none',
            }} />
            <p style={{
              position: 'absolute', bottom: '2%', left: 0, right: 0,
              textAlign: 'center', color: 'rgba(230,63,0,0.8)',
              fontFamily: P, fontSize: 9, margin: 0, pointerEvents: 'none',
            }}>numéro</p>
          </div>
        </div>

        {/* Boutons contrôle */}
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
          <button onClick={flipCamera} style={S.camBtn}><RotateCcw size={18} /></button>
          <button onClick={stopCamera} style={S.camBtn}><X size={18} /></button>
        </div>

        {/* Bouton SNAP central */}
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
          <button
            onClick={handleSnap}
            disabled={isOcrBusy}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              backgroundColor: isOcrBusy ? '#555' : '#E63F00',
              border: '3px solid rgba(255,255,255,0.8)',
              cursor: isOcrBusy ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
              transition: 'background-color 0.2s',
            }}
          >
            {isOcrBusy
              ? <div style={{ width: 22, height: 22, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              : <ScanLine size={24} color="#fff" />
            }
          </button>
        </div>

        {/* Bannière statut */}
        <div style={S.scanHintBanner}>
          {ocrState === 'loading' && '⏳ Chargement OCR (1ère fois)…'}
          {ocrState === 'running' && '🔍 Lecture du numéro…'}
          {ocrState === 'ready'   && (barcodeOk ? '📷 Code-barres auto · Appuie sur ◉ pour scanner le numéro' : '◉ Appuie sur le bouton pour scanner le numéro')}
          {ocrState === 'idle'    && (barcodeOk ? '📷 Code-barres détecté automatiquement · ◉ pour OCR' : '◉ Appuie sur le bouton central pour scanner')}
          {ocrState === 'error'   && '⚠️ OCR indisponible'}
        </div>
      </div>
    );
  };

  // ─── Rendu résultats ─────────────────────────────────────────────────────────
  const renderResults = () => {
    if (loading) return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={S.spinner} />
        <p style={{ color: '#888', fontFamily: P, fontSize: 13, marginTop: 12 }}>Recherche…</p>
      </div>
    );
    if (error) return (
      <p style={{ color: '#e74c3c', fontFamily: P, fontSize: 13, textAlign: 'center', padding: '12px 0' }}>{error}</p>
    );
    if (!results.length) return null;
    return (
      <div>
        {detectedText && (
          <p style={{ fontFamily: P, fontSize: 12, color: '#E63F00', marginBottom: 6 }}>
            🎯 Numéro détecté : <strong>{detectedText}</strong>
          </p>
        )}
        <p style={{ fontFamily: P, fontSize: 12, color: '#888', marginBottom: 10 }}>
          {results.length} résultat{results.length > 1 ? 's' : ''}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {results.map((card) => (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card)}
              style={{
                borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                backgroundColor: '#16213e',
                border: `1px solid ${owned[card.id] ? '#E63F00' : '#2a2a4a'}`,
                position: 'relative',
              }}
            >
              <img src={card.images?.small} alt={card.name} style={{ width: '100%', display: 'block' }} loading="lazy" />
              <p style={{ fontFamily: P, fontSize: 9, color: '#888', textAlign: 'center', margin: '3px 2px', lineHeight: '12px' }}>
                #{card.number} · {card.set?.name}
              </p>
              {owned[card.id] && (
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  backgroundColor: '#E63F00', borderRadius: 10,
                  padding: '1px 6px',
                  fontFamily: P, fontSize: 9, fontWeight: 700, color: '#fff',
                }}>✓</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: '#1a1a2e' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>

        {renderCamera()}

        {/* Barre de recherche manuelle (numéro OU nom) */}
        <div style={{ display: 'flex', gap: 8, margin: '14px 0 0' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Numéro (025) ou nom (Pikachu)…"
              style={{
                width: '100%', padding: '11px 12px', borderRadius: 10, boxSizing: 'border-box',
                backgroundColor: '#16213e', border: '1px solid #2a2a4a',
                color: '#fff', fontFamily: P, fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={!manualInput.trim() || loading}
            style={{
              padding: '11px 14px', borderRadius: 10, flexShrink: 0,
              backgroundColor: (!manualInput.trim() || loading) ? '#2a2a4a' : '#E63F00',
              border: 'none', color: '#fff',
              cursor: (!manualInput.trim() || loading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <Search size={18} />
          </button>
        </div>
        <p style={{ fontFamily: P, fontSize: 11, color: '#444', marginTop: 5, marginBottom: 14 }}>
          Numéro de carte (ex : 025, 163/193) ou nom du Pokémon
        </p>

        {renderResults()}
      </div>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          visible={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          owned={owned}
          favorites={favorites}
          onToggleOwned={handleToggleOwned}
          onToggleFavorite={handleToggleFav}
        />
      )}

      <style>{`
        @keyframes scanLine { 0% { top: 8px; } 50% { top: calc(100% - 8px); } 100% { top: 8px; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  camPlaceholder: {
    width: '100%', aspectRatio: '4/3',
    backgroundColor: '#16213e', borderRadius: 16,
    border: '1px solid #2a2a4a',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 10, cursor: 'pointer',
  },
  camHint: { fontFamily: P, fontSize: 14, fontWeight: 600, color: '#aaa', margin: 0 },
  camSub:  { fontFamily: P, fontSize: 11, color: '#555', margin: 0 },
  scanOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  scanFrame: { width: '65%', aspectRatio: '3/4', position: 'relative' },
  corner: {
    position: 'absolute', width: 22, height: 22,
    borderColor: '#E63F00', borderStyle: 'solid',
    borderTopWidth: 0, borderRightWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0,
  },
  scanLineAnim: {
    position: 'absolute', left: 4, right: 4, height: 2,
    backgroundColor: 'rgba(230,63,0,0.7)',
    animation: 'scanLine 2s ease-in-out infinite',
    borderRadius: 1,
  },
  scanHintBanner: {
    position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center',
    fontFamily: P, fontSize: 11, color: 'rgba(255,255,255,0.7)',
  },
  camBtn: {
    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 8,
    padding: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
  spinner: {
    width: 28, height: 28, borderRadius: '50%',
    border: '3px solid #2a2a4a', borderTopColor: '#E63F00',
    animation: 'spin 0.8s linear infinite', margin: '0 auto',
  },
};
