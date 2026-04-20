/**
 * Stockage persistant via expo-file-system (Documents directory).
 * → Survit aux mises à jour, aux rebuilds Xcode, et est sauvegardé iCloud.
 * → Migration automatique depuis AsyncStorage à la première ouverture.
 */
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DIR = FileSystem.documentDirectory + 'pokecollect/';

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

async function filePath(key) {
  await ensureDir();
  return DIR + key + '.json';
}

export async function readStore(key) {
  try {
    const path = await filePath(key);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[persist] readStore error:', e);
    return null;
  }
}

export async function writeStore(key, value) {
  try {
    const path = await filePath(key);
    await FileSystem.writeAsStringAsync(path, JSON.stringify(value));
  } catch (e) {
    console.warn('[persist] writeStore error:', e);
    throw e; // re-throw pour détecter les problèmes en dev
  }
}

// ─── Migration one-shot depuis AsyncStorage ──────────────────────────────────
const MIGRATED_FLAG = DIR + '_migrated.json';

export async function migrateFromAsyncStorage(keys) {
  try {
    await ensureDir();
    const flagInfo = await FileSystem.getInfoAsync(MIGRATED_FLAG);
    if (flagInfo.exists) return; // déjà migré

    for (const { asyncKey, storeKey } of keys) {
      const existing = await readStore(storeKey);
      if (existing !== null) continue; // déjà des données dans le nouveau store

      const raw = await AsyncStorage.getItem(asyncKey);
      if (raw) {
        await FileSystem.writeAsStringAsync(DIR + storeKey + '.json', raw);
      }
    }

    // Marquer comme migré
    await FileSystem.writeAsStringAsync(MIGRATED_FLAG, JSON.stringify({ at: Date.now() }));
  } catch (e) {
    console.warn('[persist] migration error:', e);
  }
}
