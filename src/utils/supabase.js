/**
 * Client Supabase + gestion de l'identifiant utilisateur (UUID).
 *
 * L'UUID est généré une fois et stocké dans localStorage.
 * Si localStorage est vidé, l'UUID est récupéré depuis la DB SQLite locale (kv_store).
 * En dernier recours, un nouvel UUID est généré (les données distantes sont récupérables
 * en entrant manuellement l'ancien UUID depuis les paramètres).
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[supabase] Init failed:', e.message);
    return null;
  }
}
export const supabase = initSupabase();

// ─── User ID ──────────────────────────────────────────────────────────────────
const LS_KEY = 'pokecollect_uid';

function newUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getUserId() {
  let id = localStorage.getItem(LS_KEY);
  if (!id) {
    id = newUUID();
    localStorage.setItem(LS_KEY, id);
  }
  return id;
}

export function setUserId(id) {
  localStorage.setItem(LS_KEY, id.trim());
}

// ─── Clés synchronisées (pas le cache API) ────────────────────────────────────
export const SYNC_KEYS = new Set(['owned_cards', 'favorite_cards', 'favorite_sets', 'custom_lists']);
