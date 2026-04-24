import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSharedIfFresh, setShared } from '../utils/sharedCache';
import { Linking } from './rn-web';

// Poppins en CSS natif (ces éléments ne passent pas par le shim rn-web)
const P = 'Poppins, sans-serif';

const CONV_KEY = 'fr_conventions';

// ─── Données de fallback (modifiables via Supabase dashboard) ─────────────────
const FALLBACK_EVENTS = [
  {
    id: 'fr-reg-paris-2025-05',
    name: 'Championnat Régional — Île-de-France',
    type: 'Régional',
    city: 'Paris',
    venue: 'Paris Event Center',
    date: '2025-05-17',
    dateEnd: '2025-05-18',
    url: 'https://www.pokemon.com/fr/play-pokemon/',
  },
  {
    id: 'fr-japanexpo-2025-07',
    name: 'Japan Expo 2025 — stand Pokémon',
    type: 'Convention',
    city: 'Paris',
    venue: 'Paris Le Bourget, Hall 5B',
    date: '2025-07-03',
    dateEnd: '2025-07-06',
    url: 'https://www.japan-expo.com',
  },
  {
    id: 'fr-reg-lyon-2025-09',
    name: 'Championnat Régional — Rhône-Alpes',
    type: 'Régional',
    city: 'Lyon',
    venue: 'Palais des Congrès de Lyon',
    date: '2025-09-20',
    dateEnd: '2025-09-21',
    url: 'https://www.pokemon.com/fr/play-pokemon/',
  },
  {
    id: 'fr-ludicbox-2025-10',
    name: 'Ludicbox — stand TCG Pokémon',
    type: 'Convention',
    city: 'Bordeaux',
    venue: 'Bordeaux Lac Expo',
    date: '2025-10-11',
    dateEnd: '2025-10-12',
    url: 'https://www.ludicbox.fr',
  },
  {
    id: 'fr-reg-marseille-2025-11',
    name: 'Championnat Régional — PACA',
    type: 'Régional',
    city: 'Marseille',
    venue: 'Parc Chanot',
    date: '2025-11-08',
    dateEnd: '2025-11-09',
    url: 'https://www.pokemon.com/fr/play-pokemon/',
  },
  {
    id: 'fr-euic-2026-02',
    name: 'Championnats Internationaux Européens',
    type: 'Internationaux',
    city: 'Londres',
    venue: 'ExCeL London',
    date: '2026-02-06',
    dateEnd: '2026-02-08',
    url: 'https://www.pokemon.com/fr/play-pokemon/',
  },
  {
    id: 'fr-reg-toulouse-2026-03',
    name: 'Championnat Régional — Occitanie',
    type: 'Régional',
    city: 'Toulouse',
    venue: 'MEETT Toulouse',
    date: '2026-03-14',
    dateEnd: '2026-03-15',
    url: 'https://www.pokemon.com/fr/play-pokemon/',
  },
];

function formatDate(iso) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
  } catch (_) { return iso; }
}

function isPast(iso) {
  return new Date(iso + 'T23:59:59') < new Date();
}

const TYPE_COLOR = {
  'Régional':       { bg: '#1a1f3a', border: '#3a4aaa', text: '#7a9fff' },
  'Internationaux': { bg: '#1f1a3a', border: '#aa3aaa', text: '#df7fff' },
  'Convention':     { bg: '#1a3a1f', border: '#3aaa5a', text: '#7fff9f' },
  'Événement':      { bg: '#3a2a1a', border: '#aa7a3a', text: '#ffbf7f' },
};
function typeStyle(type) {
  for (const [k, v] of Object.entries(TYPE_COLOR)) {
    if (type?.includes(k)) return v;
  }
  return { bg: '#1a1a2e', border: '#2a2a4a', text: '#888' };
}

async function fetchConventions() {
  const cached = await getSharedIfFresh(CONV_KEY);
  if (cached?.length) return cached;
  await setShared(CONV_KEY, FALLBACK_EVENTS);
  return FALLBACK_EVENTS;
}

export default function ConventionsModal({ visible, onClose }) {
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchConventions()
      .then((evs) => setEvents(evs.sort((a, b) => a.date.localeCompare(b.date))))
      .catch(() => setEvents(FALLBACK_EVENTS))
      .finally(() => setLoading(false));
  }, [visible]);

  if (!visible) return null;

  const upcoming  = events.filter((e) => !isPast(e.dateEnd || e.date));
  const past      = events.filter((e) =>  isPast(e.dateEnd || e.date));
  const displayed = showPast ? events : upcoming;
  const nextEvent = upcoming[0];

  return createPortal(
    <>
      <div className="modal-backdrop" style={{ zIndex: 900, backgroundColor: 'rgba(0,0,0,0.65)' }} onClick={onClose} />

      <div
        className="modal-sheet"
        style={{
          zIndex: 901, backgroundColor: '#16213e',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          height: '88vh', border: '1px solid #2a2a4a',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'slideUp 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pill */}
        <div style={{ width: 40, height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, margin: '10px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '14px 16px 10px', flexShrink: 0, borderBottom: '1px solid #2a2a4a' }}>
          <p style={{ fontFamily: P, fontWeight: 700, fontSize: 18, color: '#fff', margin: 0 }}>
            📅 Événements Pokémon TCG
          </p>
          <p style={{ fontFamily: P, fontWeight: 400, fontSize: 11, color: '#666', margin: '4px 0 0' }}>
            France &amp; Europe · {upcoming.length} à venir
          </p>
        </div>

        {/* Prochain événement — highlight */}
        {!loading && nextEvent && (
          <div style={{ padding: '10px 16px 4px', flexShrink: 0 }}>
            <div style={{ backgroundColor: '#0e1a0e', border: '1px solid #2a6a2a', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>🔔</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: P, fontWeight: 600, fontSize: 12, color: '#6fcf6f', margin: '0 0 2px' }}>Prochain événement</p>
                <p style={{ fontFamily: P, fontWeight: 700, fontSize: 14, color: '#fff', margin: '0 0 2px', lineHeight: '18px' }}>{nextEvent.name}</p>
                <p style={{ fontFamily: P, fontWeight: 400, fontSize: 11, color: '#aaa', margin: 0 }}>
                  {formatDate(nextEvent.date)}{nextEvent.dateEnd !== nextEvent.date ? ` → ${formatDate(nextEvent.dateEnd)}` : ''} · {nextEvent.city}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ padding: '8px 16px 32px' }}>

            {loading && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 32, height: 32, border: '3px solid #E63F00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ fontFamily: P, fontWeight: 400, color: '#888', fontSize: 13 }}>Chargement…</p>
              </div>
            )}

            {!loading && displayed.map((ev) => {
              const past = isPast(ev.dateEnd || ev.date);
              const ts   = typeStyle(ev.type);
              return (
                <button
                  key={ev.id}
                  onClick={() => ev.url && Linking.openURL(ev.url)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    width: '100%', padding: '12px 0',
                    backgroundColor: 'transparent', border: 'none',
                    cursor: ev.url ? 'pointer' : 'default',
                    borderBottom: '1px solid #1f1f3a', textAlign: 'left',
                    opacity: past ? 0.45 : 1,
                  }}
                >
                  {/* Date badge */}
                  <div style={{ flexShrink: 0, width: 48, textAlign: 'center' }}>
                    <div style={{ backgroundColor: '#1a1a2e', borderRadius: 8, padding: '6px 4px', border: '1px solid #2a2a4a' }}>
                      <p style={{ fontFamily: P, fontWeight: 800, fontSize: 16, color: past ? '#555' : '#E63F00', margin: 0, lineHeight: '18px' }}>
                        {new Date(ev.date + 'T00:00:00').getDate()}
                      </p>
                      <p style={{ fontFamily: P, fontWeight: 700, fontSize: 9, color: '#666', margin: 0, textTransform: 'uppercase' }}>
                        {new Date(ev.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        fontFamily: P, fontWeight: 700, fontSize: 10,
                        color: ts.text, backgroundColor: ts.bg,
                        border: `1px solid ${ts.border}`,
                        borderRadius: 6, padding: '2px 7px',
                      }}>
                        {ev.type}
                      </span>
                    </div>
                    <p style={{ fontFamily: P, fontWeight: 700, fontSize: 13, color: '#fff', margin: '0 0 3px', lineHeight: '17px' }}>{ev.name}</p>
                    <p style={{ fontFamily: P, fontWeight: 400, fontSize: 11, color: '#888', margin: 0 }}>
                      📍 {ev.venue}, {ev.city}
                    </p>
                    {ev.dateEnd && ev.dateEnd !== ev.date && (
                      <p style={{ fontFamily: P, fontWeight: 400, fontSize: 11, color: '#666', margin: '2px 0 0' }}>
                        Jusqu'au {formatDate(ev.dateEnd)}
                      </p>
                    )}
                  </div>

                  {ev.url && <span style={{ color: '#444', fontSize: 16, flexShrink: 0, alignSelf: 'center' }}>›</span>}
                </button>
              );
            })}

            {/* Bouton afficher passés */}
            {!loading && past.length > 0 && (
              <button
                onClick={() => setShowPast((v) => !v)}
                style={{
                  marginTop: 12, width: '100%', padding: '10px 0',
                  backgroundColor: 'transparent', border: '1px solid #2a2a4a',
                  borderRadius: 10, cursor: 'pointer',
                  fontFamily: P, fontWeight: 600, fontSize: 12, color: '#666',
                }}
              >
                {showPast
                  ? 'Masquer les événements passés'
                  : `Voir ${past.length} événement${past.length > 1 ? 's' : ''} passé${past.length > 1 ? 's' : ''}`}
              </button>
            )}

            {!loading && upcoming.length === 0 && !showPast && (
              <p style={{ fontFamily: P, fontWeight: 400, color: '#555', textAlign: 'center', paddingTop: 32, fontSize: 13 }}>
                Aucun événement à venir pour le moment.
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>,
    document.body
  );
}
