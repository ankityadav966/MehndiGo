const { client } = require("../config/redis");

const memoryCache = new Map();

// Periodic memory cache cleanup every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expiresAt && item.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}, 120000);

async function getCache(key) {
  try {
    if (client && client.isOpen) {
      const data = await client.get(key);
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (err) {
    // Redis error fallback
  }

  // Fallback to in-memory cache
  const item = memoryCache.get(key);
  if (item) {
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  return null;
}

async function setCache(key, value, ttlSeconds = 300) {
  try {
    if (client && client.isOpen) {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
    }
  } catch (err) {
    // Redis error fallback
  }

  // Set in-memory cache fallback
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function delCache(key) {
  try {
    if (client && client.isOpen) {
      await client.del(key);
    }
  } catch (err) {
    // Redis error fallback
  }
  memoryCache.delete(key);
}

async function clearCachePattern(pattern) {
  try {
    if (client && client.isOpen) {
      const keys = await client.keys(pattern);
      if (keys && keys.length > 0) {
        await client.del(keys);
      }
    }
  } catch (err) {
    // Redis error fallback
  }

  // Clear memory cache keys matching pattern
  const prefix = pattern.replace("*", "");
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

module.exports = {
  getCache,
  setCache,
  delCache,
  clearCachePattern,
};
