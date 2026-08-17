const { BlockedIP } = require("../models");

const ipRequestCounts = new Map();

/**
 * Memory-based IP Rate Limiting middleware
 */
function apiRateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const now = Date.now();

    if (!ipRequestCounts.has(ip)) {
      ipRequestCounts.set(ip, []);
    }

    const timestamps = ipRequestCounts.get(ip).filter(time => now - time < windowMs);
    
    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Rate limit exceeded. Please try again later."
      });
    }

    timestamps.push(now);
    ipRequestCounts.set(ip, timestamps);
    next();
  };
}

/**
 * Middleware checks if requesting IP is blacklisted
 */
async function checkBlockedIP(req, res, next) {
  try {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const isBlocked = await BlockedIP.findOne({ where: { ip_address: ip } });
    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Your IP address (${ip}) has been blocked by administrators.`
      });
    }
    next();
  } catch (err) {
    next(); // Fail-safe let requests pass if db lookup errors
  }
}

/**
 * Strict Input Sanitizer to strip XSS script tags and event handlers
 */
function sanitizeInputs(req, res, next) {
  const clean = (val) => {
    if (typeof val === "string") {
      return val
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
        .replace(/on\w+="[^"]*"/gi, "")
        .replace(/javascript:[^\s]*/gi, "");
    }
    if (Array.isArray(val)) {
      return val.map(clean);
    }
    if (typeof val === "object" && val !== null) {
      const obj = {};
      for (const k in val) {
        obj[k] = clean(val[k]);
      }
      return obj;
    }
    return val;
  };

  req.body = clean(req.body);
  req.query = clean(req.query);
  req.params = clean(req.params);
  next();
}

/**
 * OWASP Secure Headers Enforcement Middleware
 */
function secureHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
}

module.exports = {
  apiRateLimiter,
  checkBlockedIP,
  sanitizeInputs,
  secureHeaders
};

