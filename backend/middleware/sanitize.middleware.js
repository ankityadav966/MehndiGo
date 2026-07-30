/**
 * Input Sanitization Middleware
 * Sanitizes request query parameters, params, and body strings to prevent SQL Injection and XSS attacks.
 */

function escapeString(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/'/g, "''") // Escape single quotes for SQL string literals
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/\x00/g, ""); // Strip null bytes
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === "string") {
        sanitized[key] = escapeString(val.trim());
      } else if (typeof val === "object" && val !== null) {
        sanitized[key] = sanitizeObject(val);
      } else {
        sanitized[key] = val;
      }
    }
  }

  return sanitized;
}

function sanitizeInput(req, res, next) {
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
}

module.exports = {
  sanitizeInput,
  escapeString
};
