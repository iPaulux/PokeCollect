/**
 * Cache partagé entre tous les utilisateurs, stocké dans Supabase.
 * Utilisé pour les données globales (news, conventions) afin que le premier
 * utilisateur qui visite chaque jour rafraîchisse les données pour tous.
 *
 * Table Supabase requise : pokecollect_shared
 *   key        TEXT PRIMARY KEY
 *   value      TEXT   (JSON sérialisé)
 *   updated_at BIGINT (timestamp ms)
 */
import { supabase } from './supabase';
import { getCached, setCached } from './cache';

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
