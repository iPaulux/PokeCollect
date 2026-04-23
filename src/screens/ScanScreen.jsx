import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScanLine, CameraOff, Search, X, RotateCcw } from 'lucide-react';
import { getOwnedCards, toggleCard, getFavoriteCards, toggleFavoriteCard } from '../utils/storage';
import CardDetailModal from '../components/CardDetailModal';

// ─── Helpers API ──────────────────────────────────────────────────────────────
async function searchByNumber(number) {
  // Cherche dans tous les sets le numéro exact (ex: "163" ou "163/193")
  const clean = number.trim().replace(/\s+/g, '');
  const num = clean.includes('/') ? clean.split('/')[0] : clean;
  const url = `https://api.pokemontcg.io/v2/cards?q=number:${encodeURIComponent(num)}&pageSize=30&select=id,name,number,rarity,set,images`;
  const res = await fetch(url);
  const json = await res.json();
  return json.data ?? [];
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ScanScreen() {
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const detectorRef  = useRef(null);
  const rafRef       = useRef(null);

  const [camState, setCamState]     = useState('idle');   // idle | starting | active | denied | unsupported
  const [facingMode, setFacingMode] = useState('environment'); // environment | user
  const [manualInput, setManualInput] = useState('');
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [lastScan, setLastScan]     = useState(null);     // dernier code détecté
  const [selectedCard, setSelectedCard] = useState(null);
  const [owned, setOwned]           = useState({});
  const [favorites, setFavorites]   = useState({});

  // ─── Chargement possessions ────────────────────────────────────────────────
  const refreshState = useCallback(async () => {
    const [o, f] = await Promise.all([getOwnedCards(), getFavoriteCards()]);
    setOwned(o);
    setFavorites(f);
  }, []);
  useEffect(() => { refreshState(); }, [refreshState]);

  // ─── Démarrage caméra ──────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode = facingMode) => {
    setCamState('starting');
    setError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState('active');

      // BarcodeDetector (Chrome 83+ / Safari 17.4+)
      if ('BarcodeDetector' in window) {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128'] });
        scheduleScan();
      }
    } catch (e) {
      if (e.name === 'NotAllowedError') setCamState('denied');
      else { setCamState('unsupported'); setError(e.message); }
    }
  }, [facingMode]);

  // ─── Scan en continu (BarcodeDetector) ────────────────────────────────────
  const scheduleScan = useCallback(() => {
    rafRef.current = requestAnimationFrame(async () => {
      if (!videoRef.current || !detectorRef.current) return;
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          if (code !== lastScan) {
            setLastScan(code);
            handleSearch(code);
          }
        }
      } catch (_) {}
      scheduleScan();
    });
  }, [lastScan]);

  // ─── Arrêt caméra ─────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCamState('idle');
  }, []);

  useEffect(() => () => stopCamera(), []);

  // ─── Retournement caméra ───────────────────────────────────────────────────
  const flipCamera = useCallback(() => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (camState === 'active') startCamera(newMode);
  }, [facingMode, camState, startCamera]);

  // ─── Recherche par numéro ──────────────────────────────────────────────────
  const handleSearch = useCallback(async (query) => {
    const q = (query ?? manualInput).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const cards = await searchByNumber(q);
      if (!cards.length) setError(`Aucune carte trouvée pour "${q}"`);
      else setResults(cards);
    } catch (e) {
      setError('Erreur réseau. Vérifie ta connexion.');
    } finally {
      setLoading(false);
    }
  }, [manualInput]);

  // ─── Toggle owned ──────────────────────────────────────────────────────────
  const handleToggleOwned = useCallback(async (card) => {
    await toggleCard(card);
    refreshState();
  }, [refreshState]);

  const handleToggleFav = useCallback(async (card) => {
    await toggleFavoriteCard(card);
    refreshState();
  }, [refreshState]);

  // ─── Rendu caméra ─────────────────────────────────────────────────────────
  const renderCamera = () => {
    if (camState === 'idle') {
      return (
        <div style={styles.camPlaceholder} onClick={() => startCamera()}>
          <ScanLine size={48} color="#E63F00" strokeWidth={1.5} />
          <p style={styles.camHint}>Appuyer pour activer la caméra</p>
        </div>
      );
    }
    if (camState === 'starting') {
      return (
        <div style={styles.camPlaceholder}>
          <div style={styles.spinner} />
          <p style={styles.camHint}>Activation…</p>
        </div>
      );
    }
    if (camState === 'denied') {
      return (
        <div style={styles.camPlaceholder}>
          <CameraOff size={40} color="#e74c3c" />
          <p style={{ ...styles.camHint, color: '#e74c3c' }}>Accès caméra refusé</p>
          <p style={styles.camSub}>Utilise la recherche manuelle ci-dessous</p>
        </div>
      );
    }
    if (camState === 'unsupported') {
      return (
        <div style={styles.camPlaceholder}>
          <CameraOff size={40} color="#888" />
          <p style={{ ...styles.camHint, color: '#888' }}>Caméra non disponible</p>
          <p style={styles.camSub}>Utilise la recherche manuelle ci-dessous</p>
        </div>
      );
    }

    // Active
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' }}>
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Overlay cadre de scan */}
        <div style={styles.scanOverlay}>
          <div style={styles.scanFrame}>
            <div style={{ ...styles.corner, top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }} />
            <div style={{ ...styles.corner, top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }} />
            <div style={{ ...styles.corner, bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }} />
            <div style={{ ...styles.corner, bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }} />
            <div style={styles.scanLineAnim} />
          </div>
        </div>

        {/* Bouton flip + stop */}
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
          <button onClick={flipCamera} style={styles.camBtn}><RotateCcw size={18} /></button>
          <button onClick={stopCamera} style={styles.camBtn}><X size={18} /></button>
        </div>

        {/* Hint BarcodeDetector */}
        <div style={styles.scanHintBanner}>
          {'BarcodeDetector' in window
            ? 'Pointez un QR code ou code-barres'
            : 'Appuyez sur la loupe pour chercher par numéro'}
        </div>
      </div>
    );
  };

  // ─── Rendu résultats ───────────────────────────────────────────────────────
  const renderResults = () => {
    if (loading) return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={styles.spinner} />
        <p style={{ color: '#888', fontFamily: 'Poppins, sans-serif', fontSize: 13, marginTop: 12 }}>Recherche…</p>
      </div>
    );
    if (error) return (
      <p style={{ color: '#e74c3c', fontFamily: 'Poppins, sans-serif', fontSize: 13, textAlign: 'center', padding: 20 }}>{error}</p>
    );
    if (!results.length) return null;

    return (
      <div>
        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#888', marginBottom: 10 }}>
          {results.length} résultat{results.length > 1 ? 's' : ''}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {results.map((card) => (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card)}
              style={{
                borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                backgroundColor: '#16213e', border: `1px solid ${owned[card.id] ? '#E63F00' : '#2a2a4a'}`,
                position: 'relative',
              }}
            >
              <img
                src={card.images?.small}
                alt={card.name}
                style={{ width: '100%', display: 'block' }}
                loading="lazy"
              />
              {owned[card.id] && (
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  backgroundColor: '#E63F00', borderRadius: 10,
                  padding: '1px 6px',
                  fontFamily: 'Poppins, sans-serif', fontSize: 9, fontWeight: 700, color: '#fff',
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

        {/* Caméra */}
        {renderCamera()}

        {/* Barre de recherche manuelle */}
        <div style={{ display: 'flex', gap: 8, margin: '14px 0 0' }}>
          <input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Numéro de carte (ex: 25, 163/193…)"
            style={{
              flex: 1, padding: '11px 12px', borderRadius: 10,
              backgroundColor: '#16213e', border: '1px solid #2a2a4a',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={() => handleSearch()}
            disabled={!manualInput.trim() || loading}
            style={{
              padding: '11px 14px', borderRadius: 10,
              backgroundColor: (!manualInput.trim() || loading) ? '#2a2a4a' : '#E63F00',
              border: 'none', color: '#fff', cursor: (!manualInput.trim() || loading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <Search size={18} />
          </button>
        </div>

        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#444', marginTop: 6, marginBottom: 16 }}>
          Entre le numéro visible en bas de la carte (ex : 025, 163/193)
        </p>

        {/* Résultats */}
        {renderResults()}
      </div>

      {/* Modal détail */}
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
        @keyframes scanLine {
          0%   { top: 8px; }
          50%  { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  camPlaceholder: {
    width: '100%', aspectRatio: '4/3',
    backgroundColor: '#16213e', borderRadius: 16,
    border: '1px solid #2a2a4a',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, cursor: 'pointer',
  },
  camHint: {
    fontFamily: 'Poppins, sans-serif', fontSize: 14, fontWeight: 600,
    color: '#aaa', margin: 0,
  },
  camSub: {
    fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#555', margin: 0,
  },
  scanOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  scanFrame: {
    width: '65%', aspectRatio: '3/4',
    position: 'relative',
  },
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
    fontFamily: 'Poppins, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.7)',
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
