/**
 * Récupération robuste de toutes les cartes d'un set.
 *
 * pageSize max théorique de pokemontcg.io = 250, mais leur backend devient
 * très lent/instable au-delà de ~150 sur certains sets (observé : 500/timeout
 * dès pageSize=150 sur des sets comme swsh7 ou dp7, alors que 75 répond en
 * quelques secondes de façon fiable). On reste prudent et on pagine.
 *
 * Cache 3-tiers (local SQLite → Supabase → API) partagé par tous les écrans
 * qui ont besoin des cartes d'un set (CardsScreen, PokedexListScreen,
 * GradedListScreen, calcul du portefeuille global...).
 */
import { getApiCache, setApiCache, CARDS_TTL } from './sharedCache';
import { pokemonApiUrl } from './api';

const PAGE_SIZE = 75;

/**
 * @param {string} setId
 * @returns {Promise<Array>} toutes les cartes du set (peut lever une erreur si l'API échoue)
 */
export async function fetchAllCardsForSet(setId) {
  const cacheKey = `cards:${setId}`;
  const cached = await getApiCache(cacheKey, CARDS_TTL);
  if (cached && cached.length > 0) return cached;

  let page = 1;
  let all = [];
  let total = Infinity;
  while (all.length < total) {
    const res = await fetch(pokemonApiUrl('/cards', { q: `set.id:${setId}`, pageSize: PAGE_SIZE, page }));
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`);
    }
    const data = await res.json();
    if (!Array.isArray(data.data)) throw new Error('Réponse API invalide');
    total = data.totalCount ?? data.data.length;
    all = all.concat(data.data);
    if (data.data.length < PAGE_SIZE) break;
    page++;
  }

  if (all.length > 0) await setApiCache(cacheKey, all);
  return all;
}
