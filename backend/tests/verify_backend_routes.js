/**
 * Test script to verify Hono Cloudflare Worker backend endpoints with app.request()
 */

const assert = require("assert");

async function runTests() {
  console.log("=== VERIFYING HONO BACKEND ROUTES & WEB FALLBACK ===");
  let passed = 0;
  let failed = 0;

  function it(desc, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✓ PASS: ${desc}`);
        passed++;
      } catch (e) {
        console.error(`  ✗ FAIL: ${desc} -> ${e.message}`);
        failed++;
      }
    })();
  }

  // Import backend app
  const appModule = require("../src/index.js");
  const app = appModule.default || appModule;

  // Mock Env with dummy DB
  const mockEnv = {
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true })
        }),
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true })
      })
    }
  };

  // 1. Digital Asset Links
  await it("GET /.well-known/assetlinks.json returns HTTP 200 JSON with package_name and SHA-256 fingerprints", async () => {
    const res = await app.request("https://mehndigo.in/.well-known/assetlinks.json", {}, mockEnv);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get("content-type");
    assert.ok(contentType && contentType.includes("application/json"), `Expected JSON content-type, got ${contentType}`);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.strictEqual(data[0].target.package_name, "com.sonuy123.mehendigoo");
    assert.ok(data[0].target.sha256_cert_fingerprints.includes("08:A7:0F:01:36:61:BB:CD:15:9C:68:53:FB:9C:C6:5C:09:D2:69:61:B7:AE:13:91:3A:D7:F9:5F:74:2C:0E:98"));
    assert.ok(data[0].target.sha256_cert_fingerprints.includes("FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"));
  });

  // 2. Apple App Site Association
  await it("GET /.well-known/apple-app-site-association returns HTTP 200 JSON", async () => {
    const res = await app.request("https://mehndigo.in/.well-known/apple-app-site-association", {}, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.applinks && data.applinks.details);
  });

  // 3. Web Fallback Reel (/reel/1)
  await it("GET /reel/1 with Accept: text/html returns OpenGraph HTML preview without 404", async () => {
    const res = await app.request("https://mehndigo.in/reel/1", {
      headers: { "accept": "text/html" }
    }, mockEnv);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes('property="og:title"'));
    assert.ok(html.includes('property="al:android:url"'));
    assert.ok(html.includes("Open in MehndiGo App"));
    assert.ok(html.includes("Get it on Google Play"));
  });

  // 4. Web Fallback Artist (/artist/1)
  await it("GET /artist/1 with Accept: text/html returns Artist OpenGraph preview", async () => {
    const res = await app.request("https://mehndigo.in/artist/1", {
      headers: { "accept": "text/html" }
    }, mockEnv);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("MehndiGo"));
    assert.ok(html.includes("Open in MehndiGo App"));
  });

  // 5. Web Fallback Invite (/invite?ref=VIP500)
  await it("GET /invite?ref=VIP500 returns Referral card with promo code", async () => {
    const res = await app.request("https://mehndigo.in/invite?ref=VIP500", {
      headers: { "accept": "text/html" }
    }, mockEnv);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("VIP500"));
    assert.ok(html.includes("₹100"));
  });

  // 6. Web Fallback Booking (/booking/99)
  await it("GET /booking/99 returns Private Booking shield with zero PII exposure", async () => {
    const res = await app.request("https://mehndigo.in/booking/99", {
      headers: { "accept": "text/html" }
    }, mockEnv);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("Booking Details"));
    assert.ok(html.includes("protect your personal information"));
  });

  console.log(`\n========================================`);
  console.log(`BACKEND ROUTE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
