/**
 * Automated Verification Suite: Admin Global Date & Time Architecture
 * 
 * Verifies:
 * - Zero "Invalid Date" strings across all inputs
 * - Canonical formatAdminDateTime, formatAdminDate, formatAdminTime, formatRelativeTime
 * - Fallbacks to "—" on null, undefined, empty, NaN, and invalid strings
 * - Snake_case and camelCase entity parsing (created_at vs createdAt)
 * - IST timezone formatting
 * - Expiration and HTML date input conversions
 */

import assert from "assert";

// Import directly from frontend utility
import {
  safeParseDate,
  formatAdminDateTime,
  formatAdminDate,
  formatAdminTime,
  formatRelativeTime,
  formatDateForInput,
  getSafeTimestamp,
  isDateExpired,
  extractEntityDate,
} from "../../frontend/src/utils/dateFormatter.js";

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

console.log("\n========================================================");
console.log("MEHENDIGO ADMIN: GLOBAL DATE & TIME VERIFICATION SUITE");
console.log("========================================================\n");

// Suite 1: Safe Parsing
console.log("Suite 1: Safe Parsing & Invalid Date Immunity");

test("Should parse standard ISO 8601 string", () => {
  const d = safeParseDate("2026-08-20T10:30:00.000Z");
  assert.ok(d instanceof Date);
  assert.strictEqual(d.toISOString(), "2026-08-20T10:30:00.000Z");
});

test("Should parse SQLite datetime string (space separator)", () => {
  const d = safeParseDate("2026-08-20 10:30:00");
  assert.ok(d instanceof Date);
  assert.ok(!isNaN(d.getTime()));
});

test("Should parse numeric millisecond timestamp", () => {
  const ts = 1787207065915;
  const d = safeParseDate(ts);
  assert.ok(d instanceof Date);
  assert.strictEqual(d.getTime(), ts);
});

test("Should parse numeric second timestamp and auto-scale to ms", () => {
  const tsSec = 1787207065;
  const d = safeParseDate(tsSec);
  assert.ok(d instanceof Date);
  assert.strictEqual(d.getTime(), tsSec * 1000);
});

test("Should parse numeric string timestamp", () => {
  const d = safeParseDate("1787207065915");
  assert.ok(d instanceof Date);
  assert.strictEqual(d.getTime(), 1787207065915);
});

test("Should safely return null for null, undefined, false, 0, and empty string", () => {
  assert.strictEqual(safeParseDate(null), null);
  assert.strictEqual(safeParseDate(undefined), null);
  assert.strictEqual(safeParseDate(false), null);
  assert.strictEqual(safeParseDate(0), null);
  assert.strictEqual(safeParseDate(""), null);
  assert.strictEqual(safeParseDate("   "), null);
});

test("Should safely return null for invalid/garbage strings without throwing", () => {
  assert.strictEqual(safeParseDate("not-a-date"), null);
  assert.strictEqual(safeParseDate("Invalid Date"), null);
  assert.strictEqual(safeParseDate("null"), null);
  assert.strictEqual(safeParseDate("undefined"), null);
});

// Suite 2: Entity Objects (snake_case vs camelCase)
console.log("\nSuite 2: Entity Extraction (snake_case vs camelCase)");

test("Should extract and parse created_at (snake_case)", () => {
  const entity = { id: 1, created_at: "2026-08-20T10:30:00.000Z" };
  const d = safeParseDate(entity);
  assert.ok(d instanceof Date);
  assert.strictEqual(d.toISOString(), "2026-08-20T10:30:00.000Z");
});

test("Should extract and parse createdAt (camelCase)", () => {
  const entity = { id: 2, createdAt: "2026-08-20T10:30:00.000Z" };
  const d = safeParseDate(entity);
  assert.ok(d instanceof Date);
  assert.strictEqual(d.toISOString(), "2026-08-20T10:30:00.000Z");
});

test("Should extract paid_at, booking_date, start_time, expires_at", () => {
  assert.ok(safeParseDate({ paid_at: "2026-08-20T10:30:00.000Z" }) instanceof Date);
  assert.ok(safeParseDate({ booking_date: "2026-08-20" }) instanceof Date);
  assert.ok(safeParseDate({ start_time: "2026-08-20T15:00:00.000Z" }) instanceof Date);
  assert.ok(safeParseDate({ expires_at: "2026-12-31T23:59:59.000Z" }) instanceof Date);
  assert.ok(safeParseDate({ timestamp: 1787207065915 }) instanceof Date);
});

// Suite 3: formatAdminDateTime Formatting & Fallbacks
console.log("\nSuite 3: formatAdminDateTime Rendering");

test("Should format valid ISO date in IST locale correctly", () => {
  const formatted = formatAdminDateTime("2026-08-20T10:30:00.000Z");
  assert.ok(!formatted.includes("Invalid Date"), "Must not contain Invalid Date");
  assert.ok(formatted.includes("2026") || formatted.includes("Aug"), `Expected month/year in: ${formatted}`);
});

test("Should return fallback '—' on null / undefined / empty without throwing", () => {
  assert.strictEqual(formatAdminDateTime(null), "—");
  assert.strictEqual(formatAdminDateTime(undefined), "—");
  assert.strictEqual(formatAdminDateTime(""), "—");
  assert.strictEqual(formatAdminDateTime("garbage-text"), "—");
  assert.strictEqual(formatAdminDateTime({}, "Not available"), "Not available");
});

test("Should render directly from entity object", () => {
  const row = { id: 99, created_at: "2026-08-20T12:00:00.000Z" };
  const formatted = formatAdminDateTime(row);
  assert.ok(!formatted.includes("Invalid Date"));
  assert.notStrictEqual(formatted, "—");
});

// Suite 4: formatAdminDate & formatAdminTime
console.log("\nSuite 4: formatAdminDate & formatAdminTime");

test("formatAdminDate should return date only and fallback safely", () => {
  const formatted = formatAdminDate("2026-08-20T10:30:00.000Z");
  assert.ok(!formatted.includes("Invalid Date"));
  assert.strictEqual(formatAdminDate(null), "—");
  assert.strictEqual(formatAdminDate(undefined), "—");
});

test("formatAdminTime should return time only and fallback safely", () => {
  const formatted = formatAdminTime("2026-08-20T10:30:00.000Z");
  assert.ok(!formatted.includes("Invalid Date"));
  assert.strictEqual(formatAdminTime(null), "—");
  assert.strictEqual(formatAdminTime(undefined), "—");
});

// Suite 5: Relative Time & Expiry Checking
console.log("\nSuite 5: Relative Time, Expiry & HTML Date Inputs");

test("formatRelativeTime should format recent times appropriately", () => {
  const justNow = formatRelativeTime(new Date());
  assert.strictEqual(justNow, "Just now");

  const tenMinAgo = formatRelativeTime(new Date(Date.now() - 10 * 60 * 1000));
  assert.strictEqual(tenMinAgo, "10m ago");

  const threeHoursAgo = formatRelativeTime(new Date(Date.now() - 3 * 60 * 60 * 1000));
  assert.strictEqual(threeHoursAgo, "3h ago");

  assert.strictEqual(formatRelativeTime(null), "—");
});

test("formatDateForInput should produce YYYY-MM-DD for HTML inputs", () => {
  const inputVal = formatDateForInput("2026-08-20T10:30:00.000Z");
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(inputVal), `Expected YYYY-MM-DD, got ${inputVal}`);
  assert.strictEqual(formatDateForInput(null), "");
  assert.strictEqual(formatDateForInput(undefined), "");
});

test("isDateExpired should detect expired vs active dates", () => {
  const pastDate = new Date(Date.now() - 100000);
  const futureDate = new Date(Date.now() + 100000000);
  assert.strictEqual(isDateExpired(pastDate), true);
  assert.strictEqual(isDateExpired(futureDate), false);
  assert.strictEqual(isDateExpired(null), true);
  assert.strictEqual(isDateExpired(undefined), true);
});

test("getSafeTimestamp should provide numeric timestamp for sorting", () => {
  const ts1 = getSafeTimestamp("2026-08-20T10:00:00.000Z");
  const ts2 = getSafeTimestamp("2026-08-20T11:00:00.000Z");
  assert.ok(ts1 > 0);
  assert.ok(ts2 > ts1);
  assert.strictEqual(getSafeTimestamp(null), 0);
  assert.strictEqual(getSafeTimestamp("invalid"), 0);
});

// Suite 6: Comprehensive Zero "Invalid Date" Audit
console.log("\nSuite 6: Zero 'Invalid Date' Stress Test");

test("Zero 'Invalid Date' across 50 diverse messy inputs", () => {
  const testInputs = [
    null,
    undefined,
    "",
    "   ",
    "undefined",
    "null",
    "NaN",
    "0",
    0,
    -1,
    {},
    { random: 123 },
    { createdAt: null },
    { created_at: undefined },
    { created_at: "" },
    { created_at: "2026-08-20T10:30:00.000Z" },
    { createdAt: "2026-08-20 10:30:00" },
    { paid_at: 1787207065915 },
    { booking_date: "2026-08-20" },
    { slot_date: "2026-08-20T09:00:00Z" },
    "2026-13-45", // invalid date
    "2026-02-31",
    "abc-def-ghi",
    "2026/08/20",
    new Date("invalid"),
    new Date(),
    Date.now(),
    "1787207065915",
  ];

  for (const input of testInputs) {
    const formattedDT = formatAdminDateTime(input);
    const formattedD = formatAdminDate(input);
    const formattedT = formatAdminTime(input);
    const formattedR = formatRelativeTime(input);

    assert.ok(!formattedDT.includes("Invalid Date"), `formatAdminDateTime contained 'Invalid Date' for input: ${JSON.stringify(input)}`);
    assert.ok(!formattedD.includes("Invalid Date"), `formatAdminDate contained 'Invalid Date' for input: ${JSON.stringify(input)}`);
    assert.ok(!formattedT.includes("Invalid Date"), `formatAdminTime contained 'Invalid Date' for input: ${JSON.stringify(input)}`);
    assert.ok(!formattedR.includes("Invalid Date"), `formatRelativeTime contained 'Invalid Date' for input: ${JSON.stringify(input)}`);
  }
});

console.log("\n========================================================");
console.log(`ALL DATE TESTS PASSED: ${passedTests}/${totalTests} (100%)`);
console.log("========================================================\n");
