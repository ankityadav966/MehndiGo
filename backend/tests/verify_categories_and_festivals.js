/**
 * Comprehensive Production Verification Script:
 * Mehndi Categories, Real Artist Count, Multi-Filter Search & Festival Slider Assets
 */

const BASE_URL = "https://api.mehndigo.in";

async function runTests() {
  console.log("=================================================================");
  console.log("  MEHNDIGO PRODUCTION VERIFICATION: CATEGORIES, FESTIVALS & SEARCH");
  console.log("  Target Server:", BASE_URL);
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`TEST: ${name} ... `);
      await fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      failed++;
    }
  }

  // 1. Customer Home Dashboard
  await test("1. Customer Home Dashboard (/customer/home)", async () => {
    const res = await fetch(`${BASE_URL}/customer/home`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error("Missing success or data in response");

    const data = json.data;

    // Check total artists count
    if (typeof data.total_artists_count !== "number" && typeof data.totalArtistsCount !== "number") {
      throw new Error("total_artists_count is not returned as a number");
    }
    console.log(`\n   -> Authoritative Total Artists Count: ${data.total_artists_count || data.totalArtistsCount}`);

    // Check Categories
    const categories = data.categories || [];
    if (categories.length === 0) throw new Error("Categories list is empty");
    console.log(`   -> Categories retrieved: ${categories.length}`);
    for (const cat of categories) {
      const img = cat.image_url || cat.image || "";
      if (img.includes("unsplash.com/photo-1628155930542") || img.includes("doctor") || img.includes("hospital") || img.includes("clinic")) {
        throw new Error(`Category ${cat.name} contains invalid/medical image URL: ${img}`);
      }
    }

    // Check Festival Banners
    const banners = data.banners || data.offers || [];
    if (banners.length === 0) throw new Error("Festival banners list is empty");
    console.log(`   -> Active Festival Banners: ${banners.length}`);
    for (const banner of banners) {
      const bImg = banner.banner_image || banner.image_url || banner.image || "";
      if (bImg.includes("unsplash.com/photo-1628155930542") || bImg.includes("doctor") || bImg.includes("hospital") || bImg.includes("clinic")) {
        throw new Error(`Banner ${banner.title} contains invalid/medical image URL: ${bImg}`);
      }
      console.log(`      * [${banner.code || banner.coupon_code || "OFFER"}] ${banner.title || banner.festival_name}`);
    }
  });

  // 2. Active Festivals Endpoint
  await test("2. Active Festival Offers Endpoint (/customer/festivals/active)", async () => {
    const res = await fetch(`${BASE_URL}/customer/festivals/active`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error("Invalid festivals active response");
    console.log(`\n   -> Active Offers count: ${json.data.length}`);
    for (const f of json.data) {
      console.log(`      - Festival: ${f.festival_name || f.title} | Code: ${f.coupon_code || f.code} | Discount: ${f.discount_text || f.discount_value}`);
    }
  });

  // 3. Category API
  await test("3. Categories Listing Endpoint (/customer/categories)", async () => {
    const res = await fetch(`${BASE_URL}/customer/categories`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const json = await res.json();
    const cats = Array.isArray(json.data) ? json.data : (json.rows || []);
    if (cats.length === 0) throw new Error("Categories endpoint returned 0 rows");
    console.log(`\n   -> Total active categories: ${cats.length}`);
    cats.forEach(c => console.log(`      #${c.id} ${c.name} (${c.slug})`));
  });

  // 4. Search Artists Default
  await test("4. Default Search Artists (/customer/search)", async () => {
    const res = await fetch(`${BASE_URL}/customer/search?limit=5`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const json = await res.json();
    const total = json.total !== undefined ? json.total : json.count;
    console.log(`\n   -> Default total matching artists: ${total}`);
    if (typeof total !== "number") throw new Error("Search response missing total integer count");
  });

  // 5. Multi-Filter: Category Filter
  await test("5. Search by Category Filter (categoryId & category name)", async () => {
    const res = await fetch(`${BASE_URL}/customer/search?categoryId=1`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const json = await res.json();
    const count = json.total !== undefined ? json.total : json.count;
    console.log(`\n   -> Category (Bridal) matching count: ${count}`);
  });

  // 6. Multi-Filter: Price Range & Rating
  await test("6. Search with Price Boundary & Rating Filter", async () => {
    const res = await fetch(`${BASE_URL}/customer/search?minPrice=500&maxPrice=5000&rating=4`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const json = await res.json();
    const count = json.total !== undefined ? json.total : json.count;
    console.log(`\n   -> Min ₹500, Max ₹5000, 4+ Star matching count: ${count}`);
  });

  // 7. Multi-Filter: Experience & Verified Filter
  await test("7. Search with Experience & Verified Filter", async () => {
    const res = await fetch(`${BASE_URL}/customer/search?experience=3&verified=true`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const json = await res.json();
    const count = json.total !== undefined ? json.total : json.count;
    console.log(`\n   -> 3+ Years Exp & Verified matching count: ${count}`);
  });

  // 8. Sorting Variations
  await test("8. Search with Different Sort Modes", async () => {
    const sortModes = ["nearest", "highest_rated", "lowest_price", "price_high_low", "highest_experience", "trending"];
    for (const s of sortModes) {
      const res = await fetch(`${BASE_URL}/customer/search?sort=${s}&limit=3`);
      if (!res.ok) throw new Error(`HTTP status ${res.status} for sort=${s}`);
      const json = await res.json();
      const count = json.total !== undefined ? json.total : json.count;
      console.log(`\n   -> Sort '${s}': Total = ${count}, Results = ${(json.data || []).length}`);
    }
  });

  console.log("\n=================================================================");
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
