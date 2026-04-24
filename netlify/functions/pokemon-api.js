/**
 * Proxy Netlify Function → api.pokemontcg.io
 *
 * Évite les erreurs CORS causées par le Service Worker en production :
 * le browser appelle /.netlify/functions/pokemon-api?_path=/cards&...
 * (même origine), la fonction appelle pokemontcg.io côté serveur (pas de CORS).
 *
 * Paramètre spécial : _path (chemin de l'API, ex : "/sets", "/cards/sv3pt5-1")
 * Tous les autres paramètres sont transmis tels quels à l'API.
 */

const BASE = 'https://api.pokemontcg.io/v2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const params = event.queryStringParameters || {};
  const { _path = '/', ...rest } = params;

  // Reconstruit la query string sans _path
  const qs = Object.keys(rest).length
    ? '?' + new URLSearchParams(rest).toString()
    : '';

  const url = `${BASE}${_path}${qs}`;

  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res   = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'PokéCollect/1.0' },
    });
    clearTimeout(timer);

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: {
        ...CORS,
        'Content-Type': 'application/json; charset=utf-8',
        // CDN Netlify cache 1h — l'app a déjà son propre cache SQLite/Supabase
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
