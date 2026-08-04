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

// Netlify free tier coupe les fonctions à 10 s — on abort à 8 s pour
// pouvoir renvoyer une réponse propre avant que Netlify ne force un 502.
const TIMEOUT_MS = 8000;

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
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res   = await fetch(url, { signal: ctrl.signal, headers: reqHeaders });
    clearTimeout(timer);

    const text = await res.text();
    return {
      statusCode: res.status,
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
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: isTimeout ? 'API timeout' : e.message }),
    };
  }
};
