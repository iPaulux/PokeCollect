import AsyncStorage from '@react-native-async-storage/async-storage';

const TTL = 24 * 60 * 60 * 1000; // 24h
const V = 'v2'; // bump to invalidate all caches

export async function getCached(key) {
  try {
    const raw = await AsyncStorage.getItem(`cache:${V}:${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setCached(key, data) {
  try {
    await AsyncStorage.setItem(`cache:${V}:${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}
