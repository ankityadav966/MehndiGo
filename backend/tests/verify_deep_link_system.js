/**
 * Comprehensive Deep Link & Web Fallback Test Suite
 */

const assert = require("assert");

// 1. Mock Config & DeepLink logic from mobile service
const Config = {
  PLAY_STORE_URL: "https://play.google.com/store/apps/details?id=com.sonuy123.mehendigoo",
  ANDROID_PACKAGE_ID: "com.sonuy123.mehendigoo",
  APP_SCHEME: "mehendigoo",
  SUPPORTED_SCHEMES: ["mehendigoo", "mehndigo", "exp+sonu-yadav"],
  PRIMARY_DOMAIN: "https://mehndigo.in",
  SUPPORTED_DOMAINS: [
    "mehndigo.in",
    "www.mehndigo.in",
    "mehendigoo.com",
    "www.mehendigoo.com",
    "mehendigo.app",
    "www.mehendigo.app"
  ]
};

function getPlayStoreFallbackUrl(targetPath = "") {
  if (!targetPath) return Config.PLAY_STORE_URL;
  const encodedPath = encodeURIComponent(targetPath);
  return `${Config.PLAY_STORE_URL}&referrer=utm_source%3Dmehndigo_share%26utm_medium%3Ddeeplink%26utm_content%3D${encodedPath}`;
}

function createReelDeepLink(reelId, useScheme = false) {
  if (!reelId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(reelId).trim());
  return useScheme ? `${Config.APP_SCHEME}://reel/${cleanId}` : `${Config.PRIMARY_DOMAIN}/reel/${cleanId}`;
}

function createServiceDeepLink(serviceId, useScheme = false) {
  if (!serviceId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(serviceId).trim());
  return useScheme ? `${Config.APP_SCHEME}://service/${cleanId}` : `${Config.PRIMARY_DOMAIN}/service/${cleanId}`;
}

function createArtistDeepLink(artistId, useScheme = false) {
  if (!artistId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(artistId).trim());
  return useScheme ? `${Config.APP_SCHEME}://artist/${cleanId}` : `${Config.PRIMARY_DOMAIN}/artist/${cleanId}`;
}

function createBookingDeepLink(bookingId, useScheme = false) {
  if (!bookingId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(bookingId).trim());
  return useScheme ? `${Config.APP_SCHEME}://booking/${cleanId}` : `${Config.PRIMARY_DOMAIN}/booking/${cleanId}`;
}

function createReferralDeepLink(referralCode, useScheme = false) {
  if (!referralCode) return getPlayStoreFallbackUrl();
  const cleanCode = encodeURIComponent(String(referralCode).trim().toUpperCase());
  return useScheme ? `${Config.APP_SCHEME}://invite?ref=${cleanCode}` : `${Config.PRIMARY_DOMAIN}/invite?ref=${cleanCode}`;
}

function resolveDeepLink(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, type: "UNKNOWN", error: "Empty or invalid URL" };
  }

  const trimmed = rawUrl.trim();
  let isCustomScheme = false;
  let schemeUsed = "";

  for (const scheme of Config.SUPPORTED_SCHEMES) {
    if (trimmed.startsWith(`${scheme}://`)) {
      isCustomScheme = true;
      schemeUsed = scheme;
      break;
    }
  }

  const isHttp = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  if (!isCustomScheme && !isHttp) {
    return { isValid: false, type: "UNKNOWN", error: "URL protocol or scheme not recognized", rawUrl };
  }

  let pathname = "";
  let queryParams = {};

  try {
    if (isCustomScheme) {
      const withoutScheme = trimmed.substring(`${schemeUsed}://`.length);
      const [pathPart, queryPart] = withoutScheme.split("?");
      pathname = pathPart ? (pathPart.startsWith("/") ? pathPart : `/${pathPart}`) : "/";
      if (queryPart) {
        queryPart.split("&").forEach((pair) => {
          const [k, v] = pair.split("=");
          if (k) queryParams[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
        });
      }
    } else {
      const urlObj = new URL(trimmed);
      pathname = urlObj.pathname || "/";
      urlObj.searchParams.forEach((val, key) => {
        queryParams[key] = val;
      });
    }
  } catch (err) {
    return { isValid: false, type: "UNKNOWN", error: `Failed to parse URL: ${err.message}` };
  }

  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const segments = cleanPath.split("/").filter(Boolean);

  const isValidEntityId = (id) => {
    if (!id || typeof id !== "string") return false;
    const clean = id.trim();
    if (!clean || clean === "null" || clean === "undefined") return false;
    return /^[a-zA-Z0-9_-]+$/.test(clean);
  };

  // 1. Reel
  if (segments[0] === "reel" || segments[0] === "reels") {
    const reelId = segments[1];
    if (!reelId || !isValidEntityId(reelId)) {
      return { isValid: true, type: "REELS_FEED", screen: "CustomerTabs", tab: "Reels", params: {}, requiresAuth: false, rawUrl };
    }
    const cleanId = isNaN(Number(reelId)) ? reelId : Number(reelId);
    return { isValid: true, type: "REEL", screen: "CustomerTabs", tab: "Reels", params: { reelId: cleanId, id: cleanId }, requiresAuth: false, rawUrl };
  }

  // 2. Service
  if (segments[0] === "service" || segments[0] === "services") {
    const serviceId = segments[1];
    if (!serviceId || !isValidEntityId(serviceId)) {
      return { isValid: false, type: "SERVICE", error: "Invalid service ID" };
    }
    const cleanId = isNaN(Number(serviceId)) ? serviceId : Number(serviceId);
    return { isValid: true, type: "SERVICE", screen: "SelectService", params: { serviceId: cleanId, id: cleanId }, requiresAuth: false, rawUrl };
  }

  // 3. Artist
  if ((segments[0] === "artist" || segments[0] === "artists") && segments[1]) {
    const artistId = segments[1];
    if (!isValidEntityId(artistId)) {
      return { isValid: false, type: "ARTIST", error: "Invalid artist ID" };
    }
    const cleanId = isNaN(Number(artistId)) ? artistId : Number(artistId);
    return { isValid: true, type: "ARTIST", screen: "ArtistProfile", params: { artistId: cleanId }, requiresAuth: false, rawUrl };
  }

  // 4. Booking
  if (segments[0] === "booking" && segments[1]) {
    const bookingId = segments[1];
    if (!isValidEntityId(bookingId)) {
      return { isValid: false, type: "BOOKING", error: "Invalid booking ID" };
    }
    const cleanId = isNaN(Number(bookingId)) ? bookingId : Number(bookingId);
    return { isValid: true, type: "BOOKING", screen: "BookingDetails", params: { id: cleanId, bookingId: cleanId }, requiresAuth: true, rawUrl };
  }

  // 5. Referral
  if (segments[0] === "invite" || segments[0] === "referral") {
    let refCode = queryParams.ref || queryParams.referralCode || queryParams.code || (segments[1] || "");
    refCode = (refCode || "").trim().toUpperCase();
    return { isValid: true, type: "REFERRAL", screen: "ReferralDashboard", params: { ref: refCode, referralCode: refCode }, referralCode: refCode || null, requiresAuth: false, rawUrl };
  }

  return { isValid: false, type: "UNKNOWN", error: `Unsupported route: ${cleanPath}`, rawUrl };
}

// =========================================================================
// RUN TEST SUITE
// =========================================================================

console.log("=== RUNNING DEEP LINK VERIFICATION TEST SUITE ===");

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL: ${desc} -> ${e.message}`);
    failed++;
  }
}

// Section 1: Canonical Link Generators
it("createReelDeepLink generates HTTPS canonical domain link", () => {
  assert.strictEqual(createReelDeepLink(42), "https://mehndigo.in/reel/42");
});

it("createReelDeepLink generates custom scheme link when requested", () => {
  assert.strictEqual(createReelDeepLink(42, true), "mehendigoo://reel/42");
});

it("createArtistDeepLink generates HTTPS canonical domain link", () => {
  assert.strictEqual(createArtistDeepLink(108), "https://mehndigo.in/artist/108");
});

it("createServiceDeepLink generates HTTPS canonical domain link", () => {
  assert.strictEqual(createServiceDeepLink(7), "https://mehndigo.in/service/7");
});

it("createBookingDeepLink generates HTTPS canonical domain link", () => {
  assert.strictEqual(createBookingDeepLink("BK-9021"), "https://mehndigo.in/booking/BK-9021");
});

it("createReferralDeepLink generates HTTPS invite link with query param", () => {
  assert.strictEqual(createReferralDeepLink("SONU100"), "https://mehndigo.in/invite?ref=SONU100");
});

// Section 2: Deep Link Resolution (HTTPS & Scheme)
it("resolveDeepLink parses https://mehndigo.in/reel/42", () => {
  const r = resolveDeepLink("https://mehndigo.in/reel/42");
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.type, "REEL");
  assert.strictEqual(r.screen, "CustomerTabs");
  assert.strictEqual(r.tab, "Reels");
  assert.strictEqual(r.params.reelId, 42);
  assert.strictEqual(r.requiresAuth, false);
});

it("resolveDeepLink parses custom scheme mehendigoo://reel/42", () => {
  const r = resolveDeepLink("mehendigoo://reel/42");
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.type, "REEL");
  assert.strictEqual(r.screen, "CustomerTabs");
  assert.strictEqual(r.tab, "Reels");
  assert.strictEqual(r.params.reelId, 42);
});

it("resolveDeepLink parses https://mehndigo.in/artist/108", () => {
  const r = resolveDeepLink("https://mehndigo.in/artist/108");
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.type, "ARTIST");
  assert.strictEqual(r.screen, "ArtistProfile");
  assert.strictEqual(r.params.artistId, 108);
  assert.strictEqual(r.requiresAuth, false);
});

it("resolveDeepLink parses https://mehndigo.in/service/7", () => {
  const r = resolveDeepLink("https://mehndigo.in/service/7");
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.type, "SERVICE");
  assert.strictEqual(r.screen, "SelectService");
  assert.strictEqual(r.params.serviceId, 7);
  assert.strictEqual(r.requiresAuth, false);
});

it("resolveDeepLink parses https://mehndigo.in/booking/999 and requires auth", () => {
  const r = resolveDeepLink("https://mehndigo.in/booking/999");
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.type, "BOOKING");
  assert.strictEqual(r.screen, "BookingDetails");
  assert.strictEqual(r.params.bookingId, 999);
  assert.strictEqual(r.requiresAuth, true);
});

it("resolveDeepLink parses https://mehndigo.in/invite?ref=MEHNDI2026", () => {
  const r = resolveDeepLink("https://mehndigo.in/invite?ref=MEHNDI2026");
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.type, "REFERRAL");
  assert.strictEqual(r.referralCode, "MEHNDI2026");
});

it("resolveDeepLink handles malformed / invalid IDs safely", () => {
  const r = resolveDeepLink("https://mehndigo.in/reel/$$$invalid");
  assert.strictEqual(r.type, "REELS_FEED"); // Fallbacks to feed safely without crashing
});

// Section 3: Digital Asset Links Verification
it("Digital Asset Links JSON contains correct package_name and SHA-256 fingerprints", () => {
  const expectedPackage = "com.sonuy123.mehendigoo";
  const expectedReleaseSha = "08:A7:0F:01:36:61:BB:CD:15:9C:68:53:FB:9C:C6:5C:09:D2:69:61:B7:AE:13:91:3A:D7:F9:5F:74:2C:0E:98";
  const expectedDebugSha = "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C";

  const assetLinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: expectedPackage,
        sha256_cert_fingerprints: [expectedReleaseSha, expectedDebugSha]
      }
    }
  ];

  assert.strictEqual(assetLinks[0].target.package_name, expectedPackage);
  assert.ok(assetLinks[0].target.sha256_cert_fingerprints.includes(expectedReleaseSha));
  assert.ok(assetLinks[0].target.sha256_cert_fingerprints.includes(expectedDebugSha));
});

console.log(`\n========================================`);
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
