import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSharedIfFresh, setShared } from '../utils/sharedCache';
import { Linking } from './rn-web';

// Poppins en CSS natif (ces éléments ne passent pas par le shim rn-web)
const P = 'Poppins, sans-serif';

const RSS_JSON = 'https://api.rss2json.com/v1/api.json'
  + '?rss_url=https%3A%2F%2Fwww.pokebeach.com%2Ffeed'
  + '&count=15';

const NEWS_KEY = 'news_articles';

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

function formatDate(raw) {
  try {
    return new Date(raw).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (_) { return raw; }
}

async function fetchNews() {
  const cached = await getSharedIfFresh(NEWS_KEY);
  if (cached?.length) return cached;

  const res = await fetch(RSS_JSON).then((r) => r.json());
  if (res.status !== 'ok' || !res.items?.length) throw new Error('Pas de données');

  const articles = res.items.map((item) => ({
    title:       item.title?.trim() || '—',
    link:        item.link,
    date:        item.pubDate,
    thumbnail:   item.thumbnail || item.enclosure?.link || null,
    description: stripHtml(item.description || item.content || '').slice(0, 200),
  }));

  await setShared(NEWS_KEY, articles);
  return articles;
}

export default function ArticlesModal({ visible, onClose }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    fetchNews()
      .then(setArticles)
      .catch(() => setError('Impossible de charger les actualités.'))
      .finally(() => setLoading(false));
  }, [visible]);

  if (!visible) return null;

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
            📰 Actualités TCG Pokémon
          </p>
          <p style={{ fontFamily: P, fontWeight: 400, fontSize: 11, color: '#666', margin: '4px 0 0' }}>
            Source : PokéBeach · mis à jour toutes les 24h
          </p>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E63F00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontFamily: P, fontWeight: 400, color: '#888', fontSize: 13 }}>Chargement…</p>
            </div>
          )}

          {error && !loading && (
            <p style={{ fontFamily: P, fontWeight: 400, color: '#888', textAlign: 'center', padding: 40, fontSize: 13 }}>{error}</p>
          )}

          {!loading && !error && articles.map((a, i) => (
            <button
              key={i}
              onClick={() => Linking.openURL(a.link)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                width: '100%', padding: '14px 16px',
                backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid #1a1a2e', textAlign: 'left',
              }}
            >
              {a.thumbnail ? (
                <img
                  src={a.thumbnail} alt=""
                  style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, backgroundColor: '#111' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: 72, height: 52, borderRadius: 8, backgroundColor: '#111', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22 }}>🃏</span>
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: P, fontWeight: 700, fontSize: 13, color: '#fff', margin: '0 0 4px', lineHeight: '18px' }}>{a.title}</p>
                <p style={{ fontFamily: P, fontWeight: 400, fontSize: 11, color: '#888', margin: '0 0 6px' }}>{formatDate(a.date)}</p>
                {a.description && (
                  <p style={{
                    fontFamily: P, fontWeight: 400, fontSize: 11, color: '#666',
                    margin: 0, lineHeight: '16px',
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {a.description}
                  </p>
                )}
              </div>

              <span style={{ color: '#E63F00', fontSize: 16, flexShrink: 0, alignSelf: 'center' }}>›</span>
            </button>
          ))}

          {!loading && !error && articles.length === 0 && (
            <p style={{ fontFamily: P, fontWeight: 400, color: '#555', textAlign: 'center', padding: 40, fontSize: 13 }}>Aucun article disponible.</p>
          )}

          <div style={{ height: 32 }} />
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
