/**
 * Stockage persistant via SQLite (sql.js + IndexedDB).
 * API identique à l'ancienne version expo-file-system :
 *   readStore(key) → Promise<any | null>
 *   writeStore(key, value) → Promise<void>
 */
import { getDb, persistDb } from './db';

export async function readStore(key) {
  try {
    const db = await getDb();
    const result = db.exec('SELECT value FROM kv_store WHERE key = ?', [key]);
    if (!result.length || !result[0].values.length) return null;
    return JSON.parse(result[0].values[0][0]);
  } catch (e) {
    console.warn('[persist] readStore error:', e);
    return null;
  }
}

export async function writeStore(key, value) {
  try {
    const db = await getDb();
    db.run(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)]
    );
    await persistDb();
  } catch (e) {
    console.warn('[persist] writeStore error:', e);
    throw e;
  }
}
