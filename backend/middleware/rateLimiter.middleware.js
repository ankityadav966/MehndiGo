const rateLimit = require("express-rate-limit");

/**
 * Strict Rate Limiter for OTP Generation & Verification endpoints.
 * Maximum 3 attempts per 10 minutes per IP/User to prevent SMS/email spam and brute-force attacks.
 */
const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many OTP requests from this device. Please wait 10 minutes before trying again.",
    error: "RATE_LIMIT_EXCEEDED"
  }
});

/**
 * General API Rate Limiter to protect against DDoS attacks.
 * Maximum 200 requests per minute per IP.
 */
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Maximum 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many requests. Please slow down.",
    error: "RATE_LIMIT_EXCEEDED"
  }
});

module.exports = {
  otpRateLimiter,
  apiRateLimiter
};
