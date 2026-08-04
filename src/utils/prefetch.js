/**
 * Prefetch en arrière-plan des données sets au lancement de l'app.
 *
 * Stratégie :
 *  - Vérifie d'abord le cache 3-tiers (SQLite → Supabase).
 *  - Si les données sont fraîches, ne fait rien.
 *  - Sinon, appelle l'API pokemontcg.io et écrit en local + Supabase.
 *
 * Supabase étant partagé entre tous les utilisateurs, une fois les sets
 * écrits, chaque nouveau visiteur les lira depuis Supabase (< 100 ms)
 * sans jamais toucher pokemontcg.io.
 */
import { getApiCache, setApiCache, SETS_TTL } from './sharedCache';
import { pokemonApiUrl } from './api';

let prefetchStarted = false;

export async function prefetchSets() {
  if (prefetchStarted) return;
  prefetchStarted = true;

  // On précharge la clé 'sets:en' utilisée par SetsScreen (même endpoint pour fr)
  const cacheKey = 'sets:en';
  try {
    const cached = await getApiCache(cacheKey, SETS_TTL);
    if (cached && cached.length > 0) return; // déjà frais, rien à faire

    const res = await fetch(pokemonApiUrl('/sets', { orderBy: '-releaseDate', pageSize: 250 }));
    if (!res.ok) return;
    const data = await res.json();
    const sets = data.data;
    if (Array.isArray(sets) && sets.length > 0) {
      await setApiCache(cacheKey, sets); // → SQLite local + Supabase partagé
    }
  } catch (_) {
    // Prefetch silencieux — l'échec est géré dans SetsScreen
  }
}
