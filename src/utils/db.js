/**
 * Couche SQLite via sql.js (WebAssembly).
 * Persistance dans IndexedDB : la DB est sérialisée après chaque écriture.
 */

const IDB_DB_NAME = 'pokecollect';
const IDB_STORE = 'sqlite';
const IDB_KEY = 'db';

// ─── IndexedDB helpers ───────────────────────────────────────────────────────

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB() {
  try {
    const idb = await openIDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveToIDB(data) {
  try {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(data, IDB_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[db] saveToIDB error:', e);
  }
}

// ─── Singleton sql.js DB ─────────────────────────────────────────────────────

let _db = null;
let _initPromise = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS kv_store (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_cache (
    cache_key TEXT PRIMARY KEY,
    data      TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`;

export async function getDb() {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });

    const existing = await loadFromIDB();
    _db = existing ? new SQL.Database(existing) : new SQL.Database();
    _db.run(SCHEMA);

    return _db;
  })();

  return _initPromise;
}

/** Persiste la DB en mémoire vers IndexedDB. À appeler après chaque écriture. */
export async function persistDb() {
  if (!_db) return;
  const data = _db.export();
  await saveToIDB(data);
}
