import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase, signIn, signUp, signOut } from '../utils/supabase';
import { hydrateFromRemote, pushAllToRemote } from '../utils/persist';

export default function AccountModal({ visible, onClose }) {
  const [session, setSession]       = useState(null);
  const [loading, setLoading]       = useState(true);

  // Formulaire
  const [tab, setTab]               = useState('login'); // 'login' | 'register'
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [formStatus, setFormStatus] = useState(null); // null | 'busy' | 'ok' | {err}

  // Sync
  const [syncStatus, setSyncStatus] = useState(null); // null | 'pushing' | 'ok' | 'err'

  // Charge la session à l'ouverture
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }) ?? setLoading(false);
  }, [visible]);

  if (!visible) return null;

  // ─── Connexion ─────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!email || !password) return;
    setFormStatus('busy');
    const { error } = await signIn(email, password);
    if (error) { setFormStatus({ err: error.message }); return; }
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    setFormStatus('ok');
    // Hydrate les données depuis le serveur
    await hydrateFromRemote();
    setTimeout(() => { onClose(); window.location.reload(); }, 800);
  };

  // ─── Inscription ───────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!email || !password) return;
    if (password !== confirm) { setFormStatus({ err: 'Les mots de passe ne correspondent pas.' }); return; }
    if (password.length < 6)  { setFormStatus({ err: 'Mot de passe trop court (6 caractères min).' }); return; }
    setFormStatus('busy');
    const { error } = await signUp(email, password);
    if (error) { setFormStatus({ err: error.message }); return; }
    setFormStatus({ info: 'Compte créé ! Vérifie tes emails pour confirmer, puis connecte-toi.' });
    setTab('login');
  };

  // ─── Déconnexion ───────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    onClose();
    window.location.reload();
  };

  // ─── Sync forcée ───────────────────────────────────────────────────────────
  const handlePush = async () => {
    setSyncStatus('pushing');
    const ok = await pushAllToRemote();
    setSyncStatus(ok ? 'ok' : 'err');
    setTimeout(() => setSyncStatus(null), 2500);
  };

  const busy = formStatus === 'busy' || syncStatus === 'pushing';

  // ─── Styles communs ────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '11px 12px', borderRadius: 8, boxSizing: 'border-box',
    backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a',
    color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 13, outline: 'none',
  };
  const labelStyle = { fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', marginBottom: 5, display: 'block' };
  const btnPrimary = (disabled) => ({
    width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 4,
    backgroundColor: disabled ? '#333' : '#E63F00',
    color: '#fff', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
  });

  return createPortal(
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
          backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          border: '1px solid #2a2a4a', padding: '20px 20px 48px',
          animation: 'slideUp 0.25s ease',
          maxHeight: '92vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, margin: '0 auto 20px' }} />

        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 20 }}>
          Mon compte
        </p>

        {/* ── Chargement ── */}
        {loading && (
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#888', textAlign: 'center', padding: '20px 0' }}>
            Chargement…
          </p>
        )}

        {/* ── Connecté ── */}
        {!loading && session && (
          <>
            <div style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', margin: '0 0 2px' }}>Connecté en tant que</p>
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 14, color: '#fff', fontWeight: 600, margin: 0 }}>
                {session.user.email}
              </p>
            </div>

            {/* Forcer la sync */}
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
          </>
        )}

        {/* ── Non connecté ── */}
        {!loading && !session && (
          <>
            {!supabase && (
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#e74c3c', marginBottom: 16 }}>
                ⚠️ Sync non configurée — données locales uniquement.
              </p>
            )}

            {/* Tabs login / register */}
            <div style={{ display: 'flex', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 3, marginBottom: 20 }}>
              {[['login', 'Se connecter'], ['register', 'Créer un compte']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setFormStatus(null); }}
                  style={{
                    flex: 1, padding: '9px', border: 'none', borderRadius: 8,
                    backgroundColor: tab === key ? '#E63F00' : 'transparent',
                    color: tab === key ? '#fff' : '#888',
                    fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 12,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Champs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  style={inputStyle}
                  autoCapitalize="none"
                />
              </div>
              <div>
                <label style={labelStyle}>Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onKeyDown={(e) => { if (e.key === 'Enter' && tab === 'login') handleSignIn(); }}
                />
              </div>
              {tab === 'register' && (
                <div>
                  <label style={labelStyle}>Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    style={inputStyle}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSignUp(); }}
                  />
                </div>
              )}
            </div>

            {/* Bouton principal */}
            <button
              onClick={tab === 'login' ? handleSignIn : handleSignUp}
              disabled={busy || !email || !password}
              style={btnPrimary(busy || !email || !password)}
            >
              {busy ? '…' : tab === 'login' ? 'Se connecter' : 'Créer le compte'}
            </button>

            {/* Messages */}
            {formStatus === 'ok' && (
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#4caf50', marginTop: 10 }}>
                ✓ Connecté ! Chargement de tes données…
              </p>
            )}
            {formStatus?.err && (
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#e74c3c', marginTop: 10 }}>
                {formStatus.err}
              </p>
            )}
            {formStatus?.info && (
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#4caf50', marginTop: 10 }}>
                {formStatus.info}
              </p>
            )}
          </>
        )}
      </div>
    </>,
    document.body
  );
}
