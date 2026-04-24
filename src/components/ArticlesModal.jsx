import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSharedIfFresh, setShared } from '../utils/sharedCache';
import { Linking } from './rn-web';

const P = 'Poppins, sans-serif';
const NEWS_KEY = 'news_articles';

// ─── RSS via Netlify Function (production) ────────────────────────────────────
// En production, /.netlify/functions/fetch-news retourne le XML de PokéBeach/
// PokeGuardian/Limitless TCG. En dev (vite), cette route renvoie index.html
// → on détecte et on bascule sur le fallback Reddit.

async function loadFromNetlify() {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  const res   = await fetch('/.netlify/functions/fetch-news', { signal: ctrl.signal });
  clearTimeout(timer);

  if (!res.ok) throw new Error(`netlify_${res.status}`);

  const text = await res.text();
  // En mode dev vite, la route renvoie le HTML de l'app — détecter et rejeter
  if (!text.includes('<item')) throw new Error('not_rss');

  const doc   = new DOMParser().parseFromString(text, 'application/xml');
  const items = [...doc.querySelectorAll('item')];
  if (!items.length) throw new Error('no_items');

  const source = res.headers.get('X-Feed-Source') || '';
  const domain = source ? new URL(source).hostname.replace('www.', '') : 'tcg-news';

  return items.slice(0, 15).map((el) => {
    const raw = el.querySelector('link')?.textContent?.trim() || '';
    // Certains feeds RSS placent le lien dans un CDATA ou dans un nœud texte suivant
    const link = raw || el.querySelector('link')?.nextSibling?.textContent?.trim() || '';

    // Thumbnail : <media:content>, <media:thumbnail> ou <enclosure>
    const mediaCont  = el.querySelector('content')?.getAttribute('url');
    const mediaTh    = el.querySelector('thumbnail')?.getAttribute('url');
    const enclosure  = el.querySelector('enclosure')?.getAttribute('url');
    const thumbnail  = mediaCont || mediaTh || enclosure || null;

    return {
      title:     el.querySelector('title')?.textContent?.trim() || '(sans titre)',
      link:      link || '#',
      date:      el.querySelector('pubDate')?.textContent?.trim() || '',
      domain,
      thumbnail,
      score:     null,
      source:    'rss',
    };
  });
}

// ─── Fallback : Reddit r/PokemonTCG (natif CORS, toujours accessible) ─────────
const REDDIT_URL = 'https://www.reddit.com/r/PokemonTCG/hot.json?limit=50&raw_json=1';

function getRedditThumbnail(post) {
  const prev = post.preview?.images?.[0]?.resolutions;
  if (prev?.length) return prev[prev.length - 1].url.replace(/&amp;/g, '&');
  const src = post.preview?.images?.[0]?.source?.url;
  if (src) return src.replace(/&amp;/g, '&');
  const t = post.thumbnail;
  if (t && t.startsWith('http')) return t;
  return null;
}

async function loadFromReddit() {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  const res   = await fetch(REDDIT_URL, { signal: ctrl.signal });
  clearTimeout(timer);

  if (!res.ok) throw new Error(`reddit_${res.status}`);

  const json  = await res.json();
  const posts = (json?.data?.children || [])
    .map((c) => c.data)
    .filter((p) => p.score >= 5); // posts populaires uniquement

  if (!posts.length) throw new Error('no_posts');

  return posts.slice(0, 15).map((p) => ({
    title:     p.title,
    link:      p.is_self
      ? `https://www.reddit.com${p.permalink}`
      : p.url,
    date:      new Date(p.created_utc * 1000).toUTCString(),
    domain:    p.is_self ? 'r/PokemonTCG' : p.domain,
    thumbnail: getRedditThumbnail(p),
    score:     p.score,
    source:    'reddit',
  }));
}

// ─── Orchestration ─────────────────────────────────────────────────────────────
async function loadNews() {
  // 1. Cache Supabase < 24h → instantané
  const cached = await getSharedIfFresh(NEWS_KEY);
  if (cached?.length) return cached;

  // 2. Netlify Function (RSS réel) avec fallback Reddit
  let articles;
  try {
    articles = await loadFromNetlify();
  } catch (_) {
    articles = await loadFromReddit();
  }

  if (!articles?.length) throw new Error('no_articles');

  await setShared(NEWS_KEY, articles);
  return articles;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(raw) {
  try {
    return new Date(raw).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch (_) { return ''; }
}

// ─── Composant ─────────────────────────────────────────────────────────────────
export default function ArticlesModal({ visible, onClose }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    loadNews()
      .then(setArticles)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (visible) load(); }, [visible]);

  if (!visible) return null;

  return createPortal(
    <>
      <div
        className="modal-backdrop"
        style={{ zIndex: 900, backgroundColor: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
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
            {articles[0]?.source === 'rss'
              ? `${articles[0]?.domain} · mis à jour toutes les 24h`
              : 'r/PokemonTCG · posts populaires'}
          </p>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: 52 }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E63F00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
              <p style={{ fontFamily: P, fontWeight: 400, color: '#888', fontSize: 13, margin: 0 }}>Chargement des actualités…</p>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', padding: 52 }}>
              <p style={{ fontSize: 36, margin: '0 0 14px' }}>📡</p>
              <p style={{ fontFamily: P, fontWeight: 600, color: '#ccc', fontSize: 14, margin: '0 0 6px' }}>Actualités indisponibles</p>
              <p style={{ fontFamily: P, fontWeight: 400, color: '#666', fontSize: 12, margin: '0 0 20px' }}>Vérifie ta connexion internet.</p>
              <button
                onClick={load}
                style={{ padding: '10px 24px', borderRadius: 10, backgroundColor: '#E63F00', border: 'none', color: '#fff', fontFamily: P, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && articles.map((a, i) => (
            <button
              key={i}
              onClick={() => Linking.openURL(a.link)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                width: '100%', padding: '13px 16px',
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', borderBottom: '1px solid #1a1a2e',
                textAlign: 'left',
              }}
            >
              {/* Thumbnail */}
              {a.thumbnail ? (
                <img
                  src={a.thumbnail} alt=""
                  style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, backgroundColor: '#111' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: 72, height: 52, borderRadius: 8, backgroundColor: '#111827', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22 }}>🃏</span>
                </div>
              )}

              {/* Texte */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: P, fontWeight: 700, fontSize: 13, color: '#fff', margin: '0 0 4px', lineHeight: '18px' }}>{a.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  {a.domain && (
                    <span style={{ fontFamily: P, fontWeight: 600, fontSize: 10, color: '#E63F00', backgroundColor: '#2a1a0e', borderRadius: 4, padding: '1px 6px' }}>
                      {a.domain}
                    </span>
                  )}
                  {a.date && (
                    <span style={{ fontFamily: P, fontWeight: 400, fontSize: 10, color: '#666' }}>{formatDate(a.date)}</span>
                  )}
                  {a.score > 0 && (
                    <span style={{ fontFamily: P, fontWeight: 400, fontSize: 10, color: '#666' }}>▲ {a.score}</span>
                  )}
                </div>
              </div>

              <span style={{ color: '#E63F00', fontSize: 18, flexShrink: 0, alignSelf: 'center' }}>›</span>
            </button>
          ))}

          {!loading && !error && articles.length === 0 && (
            <p style={{ fontFamily: P, fontWeight: 400, color: '#555', textAlign: 'center', padding: 48, fontSize: 13 }}>
              Aucun article disponible.
            </p>
          )}

          <div style={{ height: 32 }} />
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>,
    document.body
  );
}
