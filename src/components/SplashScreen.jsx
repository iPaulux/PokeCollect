import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onDone }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 1600);
    const t2 = setTimeout(() => onDone?.(), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: '#1a1a2e',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 24,
        animation: fadeOut ? 'splashFadeOut 0.5s ease forwards' : undefined,
      }}
    >
      <img
        src="/icon-1024.png"
        alt="PokéCollect"
        style={{
          width: 120, height: 120,
          borderRadius: 28,
          animation: 'splashLogo 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 800,
            fontSize: 28, color: '#fff', letterSpacing: 0.5,
            animation: 'splashTitle 0.5s 0.25s ease both',
          }}
        >
          PokéCollect
        </span>
        <span
          style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 500,
            fontSize: 13, color: '#E63F00',
            animation: 'splashTitle 0.5s 0.4s ease both',
          }}
        >
          Ta collection, partout avec toi
        </span>
      </div>
    </div>
  );
}
