/**
 * Centralized Canonical Date & Time Utility for MehndiGo Admin & Web Portals
 * 
 * Rules:
 * 1. ZERO "Invalid Date" strings in UI.
 * 2. Unifies both snake_case (created_at) and camelCase (createdAt) and timestamp variations.
 * 3. Formats cleanly with IST (Asia/Kolkata) locale support.
 * 4. Gracefully falls back to "—" (or customized fallback) for null/undefined/missing dates.
 * 5. Safe parsing handles numbers, ISO strings, SQLite strings, Date objects, and nested objects.
 */

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Safely parse any date value into a valid JS Date object, or null if invalid/empty.
 * @param {any} value - Date, ISO string, SQLite datetime string, unix timestamp (ms/sec), or object with date keys.
 * @returns {Date|null} - Valid Date instance or null.
 */
export function safeParseDate(value) {
  if (value === null || value === undefined || value === "" || value === false || value === 0) {
    return null;
  }

  // Handle Date instances
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // If passed an object, try to extract common timestamp properties
  if (typeof value === "object" && !(value instanceof Date)) {
    const candidate =
      value.created_at ||
      value.createdAt ||
      value.paid_at ||
      value.paidAt ||
      value.booking_date ||
      value.bookingDate ||
      value.slot_date ||
      value.start_time ||
      value.requested_at ||
      value.requestedAt ||
      value.approved_at ||
      value.approvedAt ||
      value.rejected_at ||
      value.rejectedAt ||
      value.completed_at ||
      value.completedAt ||
      value.expires_at ||
      value.expiresAt ||
      value.timestamp ||
      value.date;
    if (candidate) {
      return safeParseDate(candidate);
    }
    return null;
  }

  // Handle numeric timestamps or numeric strings
  if (typeof value === "number" || (!isNaN(value) && !isNaN(parseFloat(value)) && isFinite(value))) {
    const num = Number(value);
    if (num <= 0) return null;
    // If timestamp in seconds (10 digits), convert to ms
    const ms = num < 10000000000 ? num * 1000 : num;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // Handle strings
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined" || trimmed === "Invalid Date") {
      return null;
    }

    // Try standard ISO / Date parse
    // Replace SQLite space separator with 'T' if simple 'YYYY-MM-DD HH:MM:SS' string
    let normalized = trimmed;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
      normalized = trimmed.replace(" ", "T");
    }

    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Fallback: Try manual YYYY-MM-DD
    const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const day = parseInt(dateMatch[3], 10);
      const manualDate = new Date(year, month, day);
      if (!isNaN(manualDate.getTime())) {
        return manualDate;
      }
    }
  }

  return null;
}

/**
 * Format a date & time string for Admin tables and detail views (e.g. "20 Aug 2026, 04:30 PM")
 * @param {any} value - Any date representation
 * @param {string} fallback - Fallback string when date is null/missing (defaults to "—")
 * @returns {string}
 */
export function formatAdminDateTime(value, fallback = "—") {
  const d = safeParseDate(value);
  if (!d) return fallback;

  try {
    return d.toLocaleString("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (err) {
    try {
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (_) {
      return fallback;
    }
  }
}

/**
 * Format a date only string for Admin views (e.g. "20 Aug 2026")
 * @param {any} value
 * @param {string} fallback
 * @returns {string}
 */
export function formatAdminDate(value, fallback = "—") {
  const d = safeParseDate(value);
  if (!d) return fallback;

  try {
    return d.toLocaleDateString("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (err) {
    try {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (_) {
      return fallback;
    }
  }
}

/**
 * Format time only string for Admin views (e.g. "04:30 PM")
 * @param {any} value
 * @param {string} fallback
 * @returns {string}
 */
export function formatAdminTime(value, fallback = "—") {
  const d = safeParseDate(value);
  if (!d) return fallback;

  try {
    return d.toLocaleTimeString("en-IN", {
      timeZone: IST_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (err) {
    try {
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (_) {
      return fallback;
    }
  }
}

/**
 * Format relative time (e.g. "Just now", "5m ago", "2h ago", "Yesterday", "20 Aug 2026")
 * @param {any} value
 * @param {string} fallback
 * @returns {string}
 */
export function formatRelativeTime(value, fallback = "—") {
  const d = safeParseDate(value);
  if (!d) return fallback;

  const now = Date.now();
  const diffMs = now - d.getTime();

  if (diffMs < 0) {
    return formatAdminDate(d);
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatAdminDate(d);
}

/**
 * Format date for HTML date inputs (YYYY-MM-DD)
 * @param {any} value
 * @returns {string}
 */
export function formatDateForInput(value) {
  const d = safeParseDate(value);
  if (!d) return "";
  try {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (_) {
    return "";
  }
}

/**
 * Get numeric timestamp safely for sorting and comparisons
 * @param {any} value
 * @returns {number}
 */
export function getSafeTimestamp(value) {
  const d = safeParseDate(value);
  return d ? d.getTime() : 0;
}

/**
 * Check if a date has expired compared to current time
 * @param {any} expiryValue
 * @returns {boolean}
 */
export function isDateExpired(expiryValue) {
  const d = safeParseDate(expiryValue);
  if (!d) return true; // Treat null/invalid expiry as expired/inactive
  return d.getTime() <= Date.now();
}

/**
 * Extract canonical date from any entity object
 * @param {object} item
 * @returns {any}
 */
export function extractEntityDate(item) {
  if (!item || typeof item !== "object") return null;
  return (
    item.created_at ||
    item.createdAt ||
    item.paid_at ||
    item.paidAt ||
    item.booking_date ||
    item.bookingDate ||
    item.slot_date ||
    item.start_time ||
    item.requested_at ||
    item.requestedAt ||
    item.approved_at ||
    item.approvedAt ||
    item.rejected_at ||
    item.rejectedAt ||
    item.completed_at ||
    item.completedAt ||
    item.expires_at ||
    item.expiresAt ||
    item.timestamp ||
    item.date ||
    null
  );
}

export default {
  safeParseDate,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminTime,
  formatRelativeTime,
  formatDateForInput,
  getSafeTimestamp,
  isDateExpired,
  extractEntityDate,
};
