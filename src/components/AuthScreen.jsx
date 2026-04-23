import React, { useState } from 'react';
import { signIn, signUp } from '../utils/supabase';
import { hydrateFromRemote } from '../utils/persist';

export default function AuthScreen({ onAuth }) {
  const [tab, setTab]           = useState('login'); // 'login' | 'register'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [status, setStatus]     = useState(null); // null | 'busy' | {err} | {info}

  const busy = status === 'busy';

  const handleLogin = async () => {
    if (!email || !password) return;
    setStatus('busy');
    const { error } = await signIn(email, password);
    if (error) { setStatus({ err: error.message }); return; }
    await hydrateFromRemote();
    onAuth();
  };

  const handleRegister = async () => {
    if (!email || !password) return;
    if (password !== confirm) { setStatus({ err: 'Les mots de passe ne correspondent pas.' }); return; }
    if (password.length < 6)  { setStatus({ err: 'Mot de passe trop court (6 caractères min).' }); return; }
    setStatus('busy');
    const { error } = await signUp(email, password);
    if (error) { setStatus({ err: error.message }); return; }
    setStatus({ info: 'Compte créé ! Connecte-toi maintenant.' });
    setTab('login');
    setPassword(''); setConfirm('');
  };

  const inputStyle = {
    width: '100%', padding: '13px 14px', borderRadius: 10, boxSizing: 'border-box',
    backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a',
    color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 14, outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#1a1a2e',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Logo + titre */}
      <img
        src="/TiploufICON.png"
        alt="PokéCollect"
        style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 12, objectFit: 'cover' }}
      />
      <p style={{
        fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 24,
        color: '#fff', margin: '0 0 4px',
      }}>
        PokéCollect
      </p>
      <p style={{
        fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#555',
        margin: '0 0 32px',
      }}>
        Ta collection, partout avec toi
      </p>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 400,
        backgroundColor: '#16213e',
        borderRadius: 20, border: '1px solid #2a2a4a',
        padding: '24px 24px 28px',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 3, marginBottom: 24 }}>
          {[['login', 'Se connecter'], ['register', 'Créer un compte']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setStatus(null); }}
              style={{
                flex: 1, padding: '9px', border: 'none', borderRadius: 8,
                backgroundColor: tab === key ? '#E63F00' : 'transparent',
                color: tab === key ? '#fff' : '#666',
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
            <label style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', marginBottom: 5, display: 'block' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              style={inputStyle}
              autoCapitalize="none"
              autoComplete="email"
            />
          </div>

          <div>
            <label style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', marginBottom: 5, display: 'block' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              onKeyDown={(e) => { if (e.key === 'Enter' && tab === 'login') handleLogin(); }}
            />
          </div>

          {tab === 'register' && (
            <div>
              <label style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#888', marginBottom: 5, display: 'block' }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                autoComplete="new-password"
                onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(); }}
              />
            </div>
          )}
        </div>

        {/* Bouton */}
        <button
          onClick={tab === 'login' ? handleLogin : handleRegister}
          disabled={busy || !email || !password}
          style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            marginTop: 20,
            backgroundColor: (busy || !email || !password) ? '#2a2a2a' : '#E63F00',
            color: '#fff', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15,
            cursor: (busy || !email || !password) ? 'not-allowed' : 'pointer',
            opacity: (busy || !email || !password) ? 0.6 : 1,
            transition: 'background 0.15s',
          }}
        >
          {busy ? '…' : tab === 'login' ? 'Se connecter' : 'Créer le compte'}
        </button>

        {/* Messages */}
        {status?.err && (
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#e74c3c', marginTop: 12, textAlign: 'center' }}>
            {status.err}
          </p>
        )}
        {status?.info && (
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#4caf50', marginTop: 12, textAlign: 'center' }}>
            {status.info}
          </p>
        )}
      </div>
    </div>
  );
}
