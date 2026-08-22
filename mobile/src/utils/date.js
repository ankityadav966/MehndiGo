/**
 * MehndiGo Centralized Date & Time Utility
 * Standardized for Indian Standard Time (IST - Asia/Kolkata, UTC +5:30)
 */

/**
 * Parses any date input into a valid Date object.
 * Handles SQLite strings ("YYYY-MM-DD HH:MM:SS"), ISO-8601 strings,
 * Unix epoch numbers (in milliseconds or seconds), and Date objects.
 *
 * @param {string|number|Date} input
 * @returns {Date|null}
 */
export function parseDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  if (typeof input === "number") {
    // If timestamp is in seconds (e.g. 10 digits), convert to ms
    const ms = input < 10000000000 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check if numeric string timestamp
    if (/^\d{10,13}$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      const ms = num < 10000000000 ? num * 1000 : num;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }

    // Pure date format: "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // Midday UTC to prevent boundary shift
    }

    // SQLite standard format: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM:SS.SSS"
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      const isoFormatted = trimmed.replace(" ", "T") + "Z";
      const d = new Date(isoFormatted);
      if (!isNaN(d.getTime())) return d;
    }

    // ISO format without Z
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed) && !trimmed.endsWith("Z") && !trimmed.includes("+")) {
      const isoWithZ = trimmed + "Z";
      const d = new Date(isoWithZ);
      if (!isNaN(d.getTime())) return d;
    }

    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Formats a date into IST Date string (e.g. "21 Aug 2026")
 *
 * @param {string|number|Date} input
 * @param {Object} [options]
 * @returns {string}
 */
export function formatDate(input, options = {}) {
  const d = parseDate(input);
  if (!d) return options.fallback || "Today";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: options.day || "numeric",
      month: options.month || "short",
      year: options.year || "numeric"
    }).format(d);
  } catch {
    return d.toLocaleDateString("en-IN");
  }
}

/**
 * Formats a date into IST Time string (e.g. "06:30 PM")
 *
 * @param {string|number|Date} input
 * @param {Object} [options]
 * @returns {string}
 */
export function formatTime(input, options = {}) {
  const d = parseDate(input);
  if (!d) return options.fallback || "Just Now";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: options.hour || "2-digit",
      minute: options.minute || "2-digit",
      hour12: options.hour12 !== false
    }).format(d);
  } catch {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
}

/**
 * Formats a date into IST Date + Time string (e.g. "21 Aug 2026, 06:30 PM")
 *
 * @param {string|number|Date} input
 * @param {Object} [options]
 * @returns {string}
 */
export function formatDateTime(input, options = {}) {
  const d = parseDate(input);
  if (!d) return options.fallback || "Recently";

  try {
    const formatted = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(d);
    return formatted;
  } catch {
    return `${formatDate(d)}, ${formatTime(d)}`;
  }
}

/**
 * Formats a date relative to now in Indian Standard Time (e.g. "Just now", "5 mins ago", "Today, 06:30 PM", "Yesterday, 04:15 PM")
 *
 * @param {string|number|Date} input
 * @returns {string}
 */
export function formatRelativeTime(input) {
  const d = parseDate(input);
  if (!d) return "Recently";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 45) {
    return "Just now";
  }
  if (diffMin < 60) {
    return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  }
  if (diffHours < 12) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  // Check if same day in IST
  const dateStr = formatDate(d);
  const todayStr = formatDate(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = formatDate(yesterdayDate);

  if (dateStr === todayStr) {
    return `Today, ${formatTime(d)}`;
  }
  if (dateStr === yesterdayStr) {
    return `Yesterday, ${formatTime(d)}`;
  }

  return formatDateTime(d);
}

/**
 * Specifically formats a service/appointment booking calendar date.
 * Avoids any timezone shift for pure calendar dates.
 *
 * @param {string|Date} dateInput - e.g. "2026-09-15"
 * @returns {string} - e.g. "15 Sep 2026"
 */
export function formatServiceDate(dateInput) {
  if (!dateInput) return "Scheduled Date";
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d} ${months[m - 1]} ${y}`;
  }
  return formatDate(dateInput);
}

export default {
  parseDate,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatServiceDate
};
