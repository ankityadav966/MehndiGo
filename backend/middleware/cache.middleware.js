const cacheStore = new Map();

/**
 * Memory-based API Response Cache Middleware
 */
function apiCache(ttlSeconds = 60) {
  return (req, res, next) => {
    // Only cache GET read requests
    if (req.method !== "GET") {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cached = cacheStore.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp < ttlSeconds * 1000)) {
      // Set cache hit header for benchmarks
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cached.body);
    }

    res.setHeader("X-Cache", "MISS");

    // Intercept res.json
    const originalJson = res.json;
    res.json = function (body) {
      // Store in memory cache
      cacheStore.set(key, {
        timestamp: Date.now(),
        body
      });
      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Helper to clear cache entries starting with specific path prefix
 */
function invalidateCache(prefix) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

module.exports = {
  apiCache,
  invalidateCache
};
