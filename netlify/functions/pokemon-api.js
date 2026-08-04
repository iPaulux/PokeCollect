/**
 * Proxy Netlify Function → api.pokemontcg.io
 *
 * Évite les erreurs CORS causées par le Service Worker en production.
 * Paramètre spécial : _path (chemin de l'API, ex : "/sets", "/cards/sv3pt5-1")
 */

const BASE = 'https://api.pokemontcg.io/v2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Netlify free tier coupe à 10 s — on abort à 7 s pour laisser le temps
// de faire un retry (1 s de délai) et renvoyer une réponse propre.
const TIMEOUT_MS = 7000;
const RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callApi(url, reqHeaders) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: reqHeaders });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const params = event.queryStringParameters || {};
  const { _path = '/', ...rest } = params;

  const qs = Object.keys(rest).length
    ? '?' + new URLSearchParams(rest).toString()
    : '';

  const url = `${BASE}${_path}${qs}`;

  const reqHeaders = { 'User-Agent': 'PokéCollect/1.0' };
  if (process.env.POKEMON_TCG_API_KEY) {
    reqHeaders['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY;
  }

  try {
    let res = await callApi(url, reqHeaders);

    // Retry une fois sur 5xx avec 1 s de délai (rate-limit transitoire)
    if (res.status >= 500) {
      await sleep(RETRY_DELAY_MS);
      res = await callApi(url, reqHeaders);
    }

    const text = await res.text();

    if (!res.ok) {
      // Ne jamais mettre en cache les erreurs : le CDN Netlify respecte Cache-Control
      // même sur 4xx/5xx, ce qui bloquerait les retries pendant 1h.
      return {
        statusCode: res.status,
        headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        body: text || JSON.stringify({ error: `Upstream HTTP ${res.status}` }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
      body: text,
    };
  } catch (e) {
    const isTimeout = e.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 503,
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: isTimeout ? 'API timeout' : e.message }),
    };
  }
};
