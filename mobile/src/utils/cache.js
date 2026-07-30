/**
 * Fast Memory + Storage API Cache
 * Prevents redundant API fetches for static/semi-static data (e.g. Categories, User Profile)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryCache = new Map();

export async function getCachedData(key, ttlMs = 5 * 60 * 1000) {
  try {
    // 1. Fast Memory Cache
    if (memoryCache.has(key)) {
      const { data, timestamp } = memoryCache.get(key);
      if (Date.now() - timestamp < ttlMs) {
        return data;
      }
      memoryCache.delete(key);
    }

    // 2. Persistent Storage Cache
    const storedStr = await AsyncStorage.getItem(`cache_${key}`);
    if (storedStr) {
      const { data, timestamp } = JSON.parse(storedStr);
      if (Date.now() - timestamp < ttlMs) {
        memoryCache.set(key, { data, timestamp });
        return data;
      }
    }
  } catch (err) {
    // Cache miss on error
  }
  return null;
}

export async function setCachedData(key, data) {
  try {
    const timestamp = Date.now();
    memoryCache.set(key, { data, timestamp });
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({ data, timestamp }));
  } catch (err) {
    // Non-blocking error
  }
}

export function clearMemoryCache() {
  memoryCache.clear();
}
