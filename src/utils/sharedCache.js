/**
 * Cache partagé entre tous les utilisateurs, stocké dans Supabase.
 *
 * Deux usages :
 *  - getShared / setShared     : données globales (news, conventions) — TTL 24h
 *  - getApiCache / setApiCache : sets & cartes — TTL long (7j / 30j)
 *    Stratégie : local SQLite d'abord (instantané) → Supabase (cross-device) → API
 *
 * Table Supabase requise : pokecollect_shared
 *   key        TEXT PRIMARY KEY
 *   value      TEXT   (JSON sérialisé)
 *   updated_at BIGINT (timestamp ms)
 */
import { supabase } from './supabase';
import { getCached, setCached, getCachedWithTTL } from './cache';

const TABLE = 'pokecollect_shared';
const TTL   = 24 * 60 * 60 * 1000; // 24 h

// ─── Lecture ──────────────────────────────────────────────────────────────────
export async function getShared(key) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('value, updated_at')
        .eq('key', key)
        .maybeSingle();
      if (!error && data) return JSON.parse(data.value);
    } catch (_) {}
  }
  return getCached(`shared:${key}`);
}

// ─── Lecture + test de fraîcheur ──────────────────────────────────────────────
export async function getSharedIfFresh(key) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('value, updated_at')
        .eq('key', key)
        .maybeSingle();
      if (!error && data && Date.now() - data.updated_at < TTL) {
        return JSON.parse(data.value);
      }
    } catch (_) {}
  }
  // Fallback local (lui aussi a un TTL de 24h)
  return getCached(`shared:${key}`);
}

// ─── Écriture ─────────────────────────────────────────────────────────────────
export async function setShared(key, value) {
  const payload = JSON.stringify(value);
  const now     = Date.now();
  if (supabase) {
    try {
      await supabase.from(TABLE).upsert({ key, value: payload, updated_at: now });
    } catch (_) {}
  }
  await setCached(`shared:${key}`, value);
}

// ─── Cache API (sets + cartes) — local first → Supabase → null ───────────────
// TTLs recommandés : SETS_TTL = 7 jours, CARDS_TTL = 30 jours
export const SETS_TTL  = 7  * 24 * 60 * 60 * 1000;
export const CARDS_TTL = 30 * 24 * 60 * 60 * 1000;

const SUPABASE_MAX_BYTES = 900_000; // ~900 KB — on évite les très gros sets

/**
 * Lecture 3-tiers : local SQLite → Supabase → null.
 * @param {string} key   clé de cache (ex : "sets_all", "cards:sv3pt5")
 * @param {number} ttl   durée de validité en ms
 */
export async function getApiCache(key, ttl = SETS_TTL) {
  // 1. Local SQLite (pas de réseau, < 1 ms)
  const local = await getCachedWithTTL(key, ttl);
  if (local) return local;

  // 2. Supabase (cross-device / premier lancement)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('value, updated_at')
        .eq('key', `api:${key}`)
        .maybeSingle();
      if (!error && data && Date.now() - data.updated_at < ttl) {
        const parsed = JSON.parse(data.value);
        await setCached(key, parsed); // rafraîchit le cache local
        return parsed;
      }
    } catch (_) {}
  }

  return null; // cache manquant ou expiré → l'appelant doit fetch l'API
}

/**
 * Écriture 3-tiers : local SQLite + Supabase (si < SUPABASE_MAX_BYTES).
 * @param {string} key   clé de cache
 * @param {*}      value données à stocker
 */
export async function setApiCache(key, value) {
  // Toujours écrire en local
  await setCached(key, value);

  // Écrire dans Supabase seulement si la taille est raisonnable
  if (supabase) {
    try {
      const payload = JSON.stringify(value);
      if (payload.length <= SUPABASE_MAX_BYTES) {
        await supabase
          .from(TABLE)
          .upsert({ key: `api:${key}`, value: payload, updated_at: Date.now() });
      }
    } catch (_) {}
  }
}
