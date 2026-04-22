import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getUserId, setUserId, supabase } from '../utils/supabase';
import { hydrateFromRemote, pushAllToRemote } from '../utils/persist';

export default function AccountModal({ visible, onClose }) {
  const [uid] = useState(() => getUserId());
  const [importInput, setImportInput] = useState('');
  const [status, setStatus]     = useState(null); // null | 'pushing' | 'push_ok' | 'push_err' | 'loading' | 'ok' | 'error'
  const [copied, setCopied]     = useState(false);

  if (!visible) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(uid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Force-push toutes les données locales vers Supabase
  const handlePush = async () => {
    setStatus('pushing');
    const ok = await pushAllToRemote();
    setStatus(ok ? 'push_ok' : 'push_err');
    setTimeout(() => setStatus(null), 2500);
  };

  // Restaure depuis un UUID distant
  const handleImport = async () => {
    const newId = importInput.trim();
    if (!newId || newId === uid) return;
    setStatus('loading');
    setUserId(newId);
    const ok = await hydrateFromRemote();
    if (ok) {
      setStatus('ok');
      setTimeout(() => { onClose(); window.location.reload(); }, 1200);
    } else {
      setUserId(uid); // rollback
      setStatus('error');
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const syncEnabled = !!supabase;
  const busy = status === 'pushing' || status === 'loading';

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
          backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          border: '1px solid #2a2a4a', padding: '20px 20px 44px',
          animation: 'slideUp 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, margin: '0 auto 20px' }} />

        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 6 }}>
          Mon compte
        </p>
        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: syncEnabled ? '#4caf50' : '#888', marginBottom: 20 }}>
          {syncEnabled ? '✅ Sync serveur activée' : '⚠️ Sync non configurée — données locales uniquement'}
        </p>

        {/* UUID + Copier */}
        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', marginBottom: 6 }}>Ton identifiant</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <code style={{
            flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#E63F00',
            backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a',
            borderRadius: 8, padding: '10px 12px', wordBreak: 'break-all',
          }}>
            {uid}
          </code>
          <button
            onClick={handleCopy}
            style={{
              flexShrink: 0, padding: '10px 14px', borderRadius: 8,
              backgroundColor: copied ? '#1a4a1a' : '#2a2a4a',
              border: `1px solid ${copied ? '#2a7a2a' : '#3a3a5a'}`,
              color: copied ? '#4caf50' : '#aaa',
              fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}
          >
            {copied ? '✓' : 'Copier'}
          </button>
        </div>

        {/* Bouton sync forcée */}
        {syncEnabled && (
          <button
            onClick={handlePush}
            disabled={busy}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, marginBottom: 20,
              backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a',
              color: status === 'push_ok' ? '#4caf50' : status === 'push_err' ? '#e74c3c' : '#aaa',
              fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 13,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {status === 'pushing'  ? '⏳ Envoi en cours…'
           : status === 'push_ok'  ? '✅ Données envoyées sur le serveur !'
           : status === 'push_err' ? '❌ Échec de l\'envoi'
           : '☁ Forcer la sync (envoyer vers le serveur)'}
          </button>
        )}

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#2a2a4a', marginBottom: 16 }} />

        {/* Restaurer depuis un autre UUID */}
        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', marginBottom: 6 }}>
          Restaurer depuis un autre appareil
        </p>
        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#555', marginBottom: 10 }}>
          Colle l'identifiant de l'appareil source (visible dans ce menu).
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            placeholder="Colle l'identifiant ici…"
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8,
              backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={handleImport}
            disabled={!importInput.trim() || busy}
            style={{
              flexShrink: 0, padding: '10px 14px', borderRadius: 8,
              backgroundColor: '#E63F00', border: 'none',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13,
              cursor: (importInput.trim() && !busy) ? 'pointer' : 'not-allowed',
              opacity: (importInput.trim() && !busy) ? 1 : 0.5,
            }}
          >
            {status === 'loading' ? '…' : 'Restaurer'}
          </button>
        </div>

        {status === 'ok'    && <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#4caf50' }}>✓ Données restaurées, rechargement…</p>}
        {status === 'error' && (
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#e74c3c' }}>
            Aucune donnée trouvée pour cet identifiant. Vérifie que tu as bien fait "Forcer la sync" sur l'autre appareil d'abord.
          </p>
        )}
      </div>
    </>,
    document.body
  );
}
