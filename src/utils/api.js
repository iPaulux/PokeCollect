/**
 * Utilitaire centralisé pour les requêtes à l'API Pokémon TCG.
 *
 * Stratégie anti-CORS :
 *  - En développement (vite dev) : appel direct à api.pokemontcg.io
 *    → pas de Service Worker actif, CORS fonctionne normalement.
 *  - En production (Netlify) : passage par le proxy /.netlify/functions/pokemon-api
 *    → même origine, pas de CORS, SW ne voit rien.
 */

const IS_DEV = import.meta.env.DEV;
const DIRECT  = 'https://api.pokemontcg.io/v2';
const PROXY   = '/.netlify/functions/pokemon-api';

/**
 * Construit l'URL finale d'une requête API Pokémon TCG.
 *
 * @param {string} path    Chemin de l'API, ex: '/sets', '/cards', '/cards/sv3pt5-1'
 * @param {Record<string,string|number>} params  Query params à passer
 * @returns {string} URL complète prête à passer à fetch()
 */
export function pokemonApiUrl(path, params = {}) {
  // Stringify toutes les valeurs
  const strParams = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  );

  if (IS_DEV) {
    const qs = new URLSearchParams(strParams).toString();
    return `${DIRECT}${path}${qs ? '?' + qs : ''}`;
  }

  // Production : proxy Netlify, _path = chemin API
  const proxyParams = new URLSearchParams({ _path: path, ...strParams }).toString();
  return `${PROXY}?${proxyParams}`;
}
