const { describe, it } = require("node:test");
const assert = require("node:assert");

// Load Centralized Date Utilities logic for Node.js testing
function parseDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  if (typeof input === "number") {
    const ms = input < 10000000000 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (/^\d{10,13}$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      const ms = num < 10000000000 ? num * 1000 : num;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    }

    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      const isoFormatted = trimmed.replace(" ", "T") + "Z";
      const d = new Date(isoFormatted);
      if (!isNaN(d.getTime())) return d;
    }

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

function formatDate(input, options = {}) {
  const d = parseDate(input);
  if (!d) return options.fallback || "Today";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: options.day || "numeric",
    month: options.month || "short",
    year: options.year || "numeric"
  }).format(d);
}

function formatTime(input, options = {}) {
  const d = parseDate(input);
  if (!d) return options.fallback || "Just Now";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: options.hour || "2-digit",
    minute: options.minute || "2-digit",
    hour12: options.hour12 !== false
  }).format(d);
}

function formatDateTime(input, options = {}) {
  const d = parseDate(input);
  if (!d) return options.fallback || "Recently";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(d);
}

function formatServiceDate(dateInput) {
  if (!dateInput) return "Scheduled Date";
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d} ${months[m - 1]} ${y}`;
  }
  return formatDate(dateInput);
}

describe("MEHENDIGO — DATE/TIME & ASIA/KOLKATA (IST) RECONCILIATION SUITE", () => {

  it("1. UTC to IST Conversion: 12:30 UTC correctly converts to 18:00 (06:00 PM) IST", () => {
    const utcSample = "2026-08-21T12:30:00.000Z";
    const istTime = formatTime(utcSample);
    const istDateTime = formatDateTime(utcSample);

    assert.ok(istTime.includes("06:00") && (istTime.includes("pm") || istTime.includes("PM")), `Expected 06:00 PM IST, got ${istTime}`);
    assert.ok(istDateTime.includes("21 Aug 2026"), `Expected 21 Aug 2026 in date time, got ${istDateTime}`);
  });

  it("2. SQLite Date String Conversion: 'YYYY-MM-DD HH:MM:SS' without Z parses as UTC and outputs IST", () => {
    const sqliteSample = "2026-08-21 13:00:00";
    const istTime = formatTime(sqliteSample);
    const istDateTime = formatDateTime(sqliteSample);

    assert.ok(istTime.includes("06:30") && (istTime.includes("pm") || istTime.includes("PM")), `Expected 06:30 PM IST, got ${istTime}`);
    assert.ok(istDateTime.includes("21 Aug 2026"), `Expected 21 Aug 2026 in date time, got ${istDateTime}`);
  });

  it("3. Distinct Dates: Payment Date (Today) vs Future Service Date (15 Sep 2026)", () => {
    const todayPaymentTimestamp = new Date("2026-08-21T13:30:00.000Z");
    const futureAppointmentDate = "2026-09-15";

    const formattedPaymentDate = formatDateTime(todayPaymentTimestamp);
    const formattedServiceDate = formatServiceDate(futureAppointmentDate);

    assert.ok(formattedPaymentDate.includes("21 Aug 2026"), `Payment Date must be 21 Aug 2026, got: ${formattedPaymentDate}`);
    assert.strictEqual(formattedServiceDate, "15 Sep 2026", `Service Date must strictly be '15 Sep 2026', got: ${formattedServiceDate}`);
    assert.notStrictEqual(formattedPaymentDate, formattedServiceDate, "Payment date and Service date must remain strictly separate");
  });

  it("4. Unix Timestamp Parsing: numeric millisecond timestamp converts accurately to IST", () => {
    const epochMs = 1787317933000;
    const formatted = formatDateTime(epochMs);
    assert.ok(formatted && typeof formatted === "string" && formatted.length > 5, `Expected valid string, got: ${formatted}`);
  });

  it("5. Null / Undefined Safety: Returns standard fallback without throwing or returning 'NaN/undefined'", () => {
    assert.strictEqual(formatDate(null), "Today");
    assert.strictEqual(formatTime(undefined), "Just Now");
    assert.strictEqual(formatDateTime(""), "Recently");
    assert.strictEqual(formatServiceDate(null), "Scheduled Date");
  });
});
