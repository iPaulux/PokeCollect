import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase, signOut } from '../utils/supabase';
import { pushAllToRemote } from '../utils/persist';

export default function AccountModal({ visible, onClose, session }) {
  const [syncStatus, setSyncStatus] = useState(null); // null | 'pushing' | 'ok' | 'err'

  if (!visible) return null;

  const handlePush = async () => {
    setSyncStatus('pushing');
    const ok = await pushAllToRemote();
    setSyncStatus(ok ? 'ok' : 'err');
    setTimeout(() => setSyncStatus(null), 2500);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    window.location.reload();
  };

  const busy = syncStatus === 'pushing';

  return createPortal(
    <>
      <div
        className="modal-backdrop"
        style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
      <div
        className="modal-sheet"
        style={{
          zIndex: 1001,
          backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          border: '1px solid #2a2a4a', padding: '20px 20px 48px',
          animation: 'slideUp 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, margin: '0 auto 20px' }} />

        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 20 }}>
          Mon compte
        </p>

        {/* Email */}
        <div style={{
          backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a',
          borderRadius: 10, padding: '12px 14px', marginBottom: 20,
        }}>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', margin: '0 0 2px' }}>
            Connecté en tant que
          </p>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 14, color: '#fff', fontWeight: 600, margin: 0 }}>
            {session?.user?.email ?? '—'}
          </p>
        </div>

        {/* Forcer la sync */}
        {!!supabase && (
          <button
            onClick={handlePush}
            disabled={busy}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, marginBottom: 12,
              backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a',
              color: syncStatus === 'ok' ? '#4caf50' : syncStatus === 'err' ? '#e74c3c' : '#aaa',
              fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 13,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {syncStatus === 'pushing' ? '⏳ Envoi en cours…'
           : syncStatus === 'ok'     ? '✅ Données envoyées !'
           : syncStatus === 'err'    ? '❌ Échec de l\'envoi'
           : '☁ Forcer la sync (envoyer vers le serveur)'}
          </button>
        )}

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '11px', borderRadius: 10,
            backgroundColor: 'transparent', border: '1px solid #3a2020',
            color: '#e74c3c', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Se déconnecter
        </button>
      </div>
    </>,
    document.body
  );
}
