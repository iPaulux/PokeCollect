import React from 'react';

// ─── Définitions des pokéballs ────────────────────────────────────────────────
export const POKEBALLS = [
  { id: 'poke',    label: 'Pokéball',    top: '#E63F00',  accent: '#E63F00' },
  { id: 'great',   label: 'Super Ball',  top: '#1565C0',  accent: '#E63F00', stripe: true },
  { id: 'ultra',   label: 'Hyper Ball',  top: '#111',     accent: '#F9A825', ultra: true },
  { id: 'master',  label: 'Master Ball', top: '#6A1B9A',  accent: '#CE93D8', master: true },
  { id: 'premier', label: 'Prémium',     top: '#fff',     border: '#ccc',    accent: '#E63F00', premier: true },
  { id: 'heal',    label: 'Guérison',    top: '#E91E8C',  accent: '#fff' },
  { id: 'dusk',    label: 'Sombre',      top: '#1B5E20',  accent: '#F9A825', dusk: true },
  { id: 'timer',   label: 'Chrono',      top: '#fff',     border: '#ccc',    accent: '#E63F00', timer: true },
];

// ─── Rendu SVG d'une pokéball ─────────────────────────────────────────────────
export function PokeBallSVG({ ball, size = 36 }) {
  const r = size / 2;
  const b = ball ?? POKEBALLS[0];
  const topColor  = b.top;
  const botColor  = '#fff';
  const lineColor = '#222';
  const btnSize   = size * 0.18;
  const borderColor = b.border ?? lineColor;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      {/* Clip path: demi-cercles */}
      <defs>
        <clipPath id={`clip-top-${b.id}-${size}`}>
          <rect x="0" y="0" width={size} height={r} />
        </clipPath>
        <clipPath id={`clip-bot-${b.id}-${size}`}>
          <rect x="0" y={r} width={size} height={r} />
        </clipPath>
      </defs>

      {/* Cercle fond blanc */}
      <circle cx={r} cy={r} r={r - 1} fill="#fff" stroke={borderColor} strokeWidth="1.5" />

      {/* Demi-cercle haut */}
      <circle cx={r} cy={r} r={r - 1} fill={topColor} clipPath={`url(#clip-top-${b.id}-${size})`} />

      {/* Détails spéciaux */}
      {b.stripe && (
        // Great Ball: bande diagonale rouge
        <>
          <rect x={r - 3} y={0} width={6} height={r} fill={b.accent} clipPath={`url(#clip-top-${b.id}-${size})`} />
        </>
      )}
      {b.ultra && (
        // Ultra Ball: bande jaune + arc noir
        <>
          <rect x={0} y={r * 0.55} width={size} height={r * 0.45} fill={b.accent} clipPath={`url(#clip-top-${b.id}-${size})`} />
        </>
      )}
      {b.master && (
        // Master Ball: deux petits cercles roses
        <>
          <circle cx={r * 0.55} cy={r * 0.45} r={r * 0.15} fill={b.accent} />
          <circle cx={r * 1.45} cy={r * 0.45} r={r * 0.15} fill={b.accent} />
        </>
      )}
      {b.premier && (
        // Premier Ball: ligne rouge horizontale
        <rect x={r * 0.3} y={r * 0.55} width={r * 1.4} height={r * 0.18} fill={b.accent} clipPath={`url(#clip-top-${b.id}-${size})`} />
      )}
      {b.dusk && (
        // Dusk Ball: diagonales sombres
        <polygon points={`${r},0 ${size * 0.7},${r} ${r * 0.3},${r} ${r},0`} fill="rgba(0,0,0,0.35)" clipPath={`url(#clip-top-${b.id}-${size})`} />
      )}
      {b.timer && (
        // Timer Ball: rayons rouges
        <>
          <line x1={r} y1={0} x2={r * 1.6} y2={r * 0.8} stroke={b.accent} strokeWidth="3" clipPath={`url(#clip-top-${b.id}-${size})`} />
          <line x1={r} y1={0} x2={r * 0.4} y2={r * 0.8} stroke={b.accent} strokeWidth="3" clipPath={`url(#clip-top-${b.id}-${size})`} />
        </>
      )}

      {/* Demi-cercle bas (blanc) */}
      <circle cx={r} cy={r} r={r - 1} fill={botColor} clipPath={`url(#clip-bot-${b.id}-${size})`} />

      {/* Ligne centrale */}
      <line x1={1.5} y1={r} x2={size - 1.5} y2={r} stroke={lineColor} strokeWidth="1.5" />

      {/* Bouton central */}
      <circle cx={r} cy={r} r={btnSize + 2} fill={lineColor} />
      <circle cx={r} cy={r} r={btnSize} fill="#fff" />
    </svg>
  );
}

// ─── Sélecteur de pokéball ────────────────────────────────────────────────────
export default function PokeBallPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', padding: '4px 0' }}>
      {POKEBALLS.map((ball) => {
        const selected = value === ball.id;
        return (
          <button
            key={ball.id}
            onClick={() => onChange(ball.id)}
            title={ball.label}
            style={{
              background: 'none', border: 'none', padding: 6, cursor: 'pointer',
              borderRadius: 10,
              backgroundColor: selected ? 'rgba(230,63,0,0.15)' : 'transparent',
              outline: selected ? '2px solid #E63F00' : '2px solid transparent',
              transition: 'all 0.15s',
              transform: selected ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            <PokeBallSVG ball={ball} size={38} />
          </button>
        );
      })}
    </div>
  );
}
