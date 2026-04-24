/**
 * Cache API via SQLite.
 * TTL 24h, invalidé par le bump de version V.
 */
import { getDb, persistDb } from './db';

const TTL = 24 * 60 * 60 * 1000; // 24h
const V = 'v4'; // bump pour invalider tous les caches

function prefixed(key) {
  return `${V}:${key}`;
}

export async function getCached(key) {
  return getCachedWithTTL(key, TTL);
}

/** Comme getCached mais avec un TTL personnalisé (ms). */
export async function getCachedWithTTL(key, ttl) {
  try {
    const db = await getDb();
    const result = db.exec(
      'SELECT data, timestamp FROM api_cache WHERE cache_key = ?',
      [prefixed(key)]
    );
    if (!result.length || !result[0].values.length) return null;
    const [data, ts] = result[0].values[0];
    if (Date.now() - ts > ttl) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** Retourne la donnée brute + timestamp, sans filtre TTL. */
export async function getCachedRaw(key) {
  try {
    const db = await getDb();
    const result = db.exec(
      'SELECT data, timestamp FROM api_cache WHERE cache_key = ?',
      [prefixed(key)]
    );
    if (!result.length || !result[0].values.length) return null;
    const [data, ts] = result[0].values[0];
    return { data: JSON.parse(data), ts };
  } catch {
    return null;
  }
}

export async function setCached(key, data) {
  try {
    const db = await getDb();
    db.run(
      'INSERT OR REPLACE INTO api_cache (cache_key, data, timestamp) VALUES (?, ?, ?)',
      [prefixed(key), JSON.stringify(data), Date.now()]
    );
    await persistDb();
  } catch (e) {
    console.warn('[cache] setCached error:', e);
  }
}
