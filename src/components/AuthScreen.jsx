import React, { useState } from 'react';
import { signIn, signUp } from '../utils/supabase';
import { hydrateFromRemote } from '../utils/persist';

export default function AuthScreen({ onAuth }) {
  const [tab, setTab]           = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [status, setStatus]     = useState(null);

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
    backgroundColor: '#0f1422', border: '1px solid #2a2a4a',
    color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <>
      <style>{`
        @keyframes authLogoIn {
          0%   { opacity: 0; transform: scale(0.6) translateY(-20px); }
          60%  { opacity: 1; transform: scale(1.08) translateY(0); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes authTitleIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes authFloat {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes authPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(230,63,0,0); }
          50%      { box-shadow: 0 0 0 8px rgba(230,63,0,0.12); }
        }
        .auth-logo {
          animation: authLogoIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both,
                     authFloat 3.5s ease-in-out 0.8s infinite;
        }
        .auth-title {
          animation: authTitleIn 0.45s ease 0.2s both;
        }
        .auth-card {
          animation: authCardIn 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .auth-input:focus {
          border-color: #E63F00 !important;
        }
        .auth-tab-active {
          animation: authPulse 2s ease-in-out infinite;
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: '#1a1a2e',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
        overflowY: 'auto',
      }}>

        {/* Cercles décoratifs en arrière-plan */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,63,0,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,63,0,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <img
          className="auth-logo"
          src="/TiploufICON.png"
          alt="PokéCollect"
          style={{
            width: 80, height: 80, borderRadius: 20,
            objectFit: 'cover', marginBottom: 14,
            boxShadow: '0 8px 32px rgba(230,63,0,0.25)',
          }}
        />

        {/* Titre */}
        <div className="auth-title" style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 26,
            color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px',
          }}>
            PokéCollect
          </p>
          <p style={{
            fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#4a4a6a', margin: 0,
          }}>
            Ta collection, partout avec toi
          </p>
        </div>

        {/* Card */}
        <div
          className="auth-card"
          style={{
            width: '100%', maxWidth: 400,
            backgroundColor: '#16213e',
            borderRadius: 22, border: '1px solid #252540',
            padding: '26px 22px 28px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          {/* Tabs */}
          <div style={{
            display: 'flex', backgroundColor: '#0f1422',
            borderRadius: 12, padding: 4, marginBottom: 24,
            border: '1px solid #1e1e38',
          }}>
            {[['login', 'Se connecter'], ['register', 'Créer un compte']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setTab(key); setStatus(null); }}
                className={tab === key ? 'auth-tab-active' : ''}
                style={{
                  flex: 1, padding: '10px 8px', border: 'none', borderRadius: 9,
                  backgroundColor: tab === key ? '#E63F00' : 'transparent',
                  color: tab === key ? '#fff' : '#555',
                  fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 12,
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Champs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: '0.3px' }}>
                EMAIL
              </label>
              <input
                className="auth-input"
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
              <label style={{ display: 'block', fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: '0.3px' }}>
                MOT DE PASSE
              </label>
              <input
                className="auth-input"
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
              <div style={{ animation: 'authCardIn 0.25s ease both' }}>
                <label style={{ display: 'block', fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: '0.3px' }}>
                  CONFIRMER
                </label>
                <input
                  className="auth-input"
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
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              marginTop: 22,
              background: (busy || !email || !password)
                ? '#1e1e38'
                : 'linear-gradient(135deg, #E63F00, #ff5c1a)',
              color: (busy || !email || !password) ? '#444' : '#fff',
              fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15,
              cursor: (busy || !email || !password) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: (busy || !email || !password) ? 'none' : '0 4px 16px rgba(230,63,0,0.35)',
              letterSpacing: '0.3px',
            }}
          >
            {busy ? '…' : tab === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>

          {/* Messages */}
          {status?.err && (
            <div style={{
              marginTop: 14, padding: '10px 12px', borderRadius: 8,
              backgroundColor: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.2)',
              animation: 'authCardIn 0.2s ease both',
            }}>
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#e74c3c', margin: 0, textAlign: 'center' }}>
                {status.err}
              </p>
            </div>
          )}
          {status?.info && (
            <div style={{
              marginTop: 14, padding: '10px 12px', borderRadius: 8,
              backgroundColor: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.2)',
              animation: 'authCardIn 0.2s ease both',
            }}>
              <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#4caf50', margin: 0, textAlign: 'center' }}>
                {status.info}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
