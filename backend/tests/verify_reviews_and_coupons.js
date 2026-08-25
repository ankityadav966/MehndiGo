// Automated Test Suite for Reviews, Review Media & Coupon System Verification
// Tests Cloudflare Worker endpoints directly

const API_BASE = "https://api.mehndigo.in";

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("🧪 STARTING REVIEWS & COUPONS PRODUCTION VERIFICATION SUITE");
  console.log("==========================================================\n");

  // -----------------------------------------------------------------------
  // TEST SUITE 1: COUPONS SYSTEM
  // -----------------------------------------------------------------------
  console.log("📌 SUITE 1: Active Coupons & Auto-Apply Verification");

  try {
    // 1. Get Public Coupons
    const couponsRes = await fetch(`${API_BASE}/customer/coupons`);
    assert(couponsRes.status === 200, `GET /customer/coupons returned HTTP ${couponsRes.status}`);
    const couponsData = await couponsRes.json();
    assert(couponsData.success === true, "GET /customer/coupons success flag is true");
    assert(Array.isArray(couponsData.data), "Coupons data is an Array");
    assert(couponsData.data.length > 0, `Active coupons count in DB: ${couponsData.data.length}`);

    // Verify all returned coupons are active and have valid discount values
    const hasInvalid = couponsData.data.some(c => !c.code || c.is_active === 0 || c.discount_value <= 0);
    assert(!hasInvalid, "All returned coupons have valid codes and non-zero discount values");

    // 2. Apply Valid Coupon (RAKHI20: 20% off min order 500)
    const applyValidRes = await fetch(`${API_BASE}/coupon/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ couponCode: "RAKHI20", basePrice: 1000 })
    });
    assert(applyValidRes.status === 200, `POST /coupon/apply with RAKHI20 returned HTTP ${applyValidRes.status}`);
    const applyValidData = await applyValidRes.json();
    assert(applyValidData.success === true, "Valid coupon RAKHI20 application succeeded");
    assert(applyValidData.data.discount_amount === 200, `RAKHI20 calculated exact 20% discount (Expected 200, got ${applyValidData.data.discount_amount})`);
    assert(applyValidData.data.finalAmount === 800, `Final amount after discount is 800 (Got ${applyValidData.data.finalAmount})`);

    // 3. Minimum Order Check (BRIDAL20 min order 2000; test with order 500 -> should fail)
    const minOrderRes = await fetch(`${API_BASE}/coupon/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ couponCode: "BRIDAL20", basePrice: 500 })
    });
    assert(minOrderRes.status === 400, `POST /coupon/apply for BRIDAL20 with basePrice 500 correctly rejected with HTTP 400`);
    const minOrderData = await minOrderRes.json();
    assert(minOrderData.success === false, "Minimum order violation returned success: false");

    // 4. Reject Bogus / Non-Existent Coupon (Ensure NO fake fallback ₹100 discount!)
    const bogusRes = await fetch(`${API_BASE}/coupon/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ couponCode: "NONEXISTENT_FAKE_999", basePrice: 1000 })
    });
    assert(bogusRes.status === 400, `POST /coupon/apply with bogus coupon rejected with HTTP 400 (Got ${bogusRes.status})`);
    const bogusData = await bogusRes.json();
    assert(bogusData.success === false, "Bogus coupon returned success: false");

    // 5. Auto-Apply Best Coupon for basePrice 1500
    const autoApplyRes = await fetch(`${API_BASE}/coupon/auto-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ basePrice: 1500 })
    });
    assert(autoApplyRes.status === 200, `POST /coupon/auto-apply returned HTTP ${autoApplyRes.status}`);
    const autoApplyData = await autoApplyRes.json();
    assert(autoApplyData.success === true, "Auto-apply returned success: true");
    assert(autoApplyData.data.discount_amount > 0, `Auto-applied best coupon '${autoApplyData.data.coupon_code}' saving ₹${autoApplyData.data.discount_amount}`);

    // 6. Price Details with Valid Coupon vs Bogus Coupon
    const priceValidRes = await fetch(`${API_BASE}/booking/price-details?basePrice=1000&couponCode=RAKHI20`);
    assert(priceValidRes.status === 200, `GET /booking/price-details with RAKHI20 returned HTTP 200`);
    const priceValidData = await priceValidRes.json();
    assert(priceValidData.data.coupon_discount === 200, `Price details computed coupon discount: ₹${priceValidData.data.coupon_discount} (Expected 200)`);

    const priceBogusRes = await fetch(`${API_BASE}/booking/price-details?basePrice=1000&couponCode=FAKECODE999`);
    assert(priceBogusRes.status === 200, `GET /booking/price-details with FAKECODE999 returned HTTP 200`);
    const priceBogusData = await priceBogusRes.json();
    assert(priceBogusData.data.coupon_discount === 0, `Bogus coupon gives ₹0 discount in price details (Expected 0, got ${priceBogusData.data.coupon_discount})`);

  } catch (err) {
    console.error("Suite 1 Error:", err.message);
  }

  // -----------------------------------------------------------------------
  // TEST SUITE 2: REVIEWS & RATINGS SYSTEM
  // -----------------------------------------------------------------------
  console.log("\n📌 SUITE 2: Artist Reviews & Ratings Verification");

  try {
    // 1. Get Reviews for Artist with Reviews (e.g. artist 235)
    const reviewsRes = await fetch(`${API_BASE}/customer/artists/235/reviews`);
    assert(reviewsRes.status === 200, `GET /customer/artists/235/reviews returned HTTP ${reviewsRes.status}`);
    const reviewsData = await reviewsRes.json();
    assert(reviewsData.success === true, "Artist reviews response success flag is true");
    assert(typeof reviewsData.data.avg_rating === "number", `Average rating is a number: ${reviewsData.data.avg_rating}`);
    assert(typeof reviewsData.data.total_reviews === "number", `Total reviews count is a number: ${reviewsData.data.total_reviews}`);
    assert(typeof reviewsData.data.distribution === "object", "Rating distribution object present");

    // 2. Check Zero-Reviews Artist Profile (e.g. artist 236)
    const emptyReviewsRes = await fetch(`${API_BASE}/customer/artists/236/reviews`);
    assert(emptyReviewsRes.status === 200, `GET /customer/artists/236/reviews returned HTTP ${emptyReviewsRes.status}`);
    const emptyReviewsData = await emptyReviewsRes.json();
    assert(emptyReviewsData.data.total_reviews === 0, `Zero-reviews artist returns total_reviews = 0 (Got ${emptyReviewsData.data.total_reviews})`);
    assert(emptyReviewsData.data.avg_rating === 0, `Zero-reviews artist returns avg_rating = 0 (Got ${emptyReviewsData.data.avg_rating})`);
    assert(Array.isArray(emptyReviewsData.data.reviews) && emptyReviewsData.data.reviews.length === 0, "Reviews list is an empty array");

    // 3. Review Submission Authorization Check (Unauthenticated request should return HTTP 401)
    const unauthReviewRes = await fetch(`${API_BASE}/customer/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: 1, rating: 5, comment: "Test unauthenticated review" })
    });
    assert(unauthReviewRes.status === 401, `Unauthenticated review submission correctly rejected with HTTP 401 (Got ${unauthReviewRes.status})`);

  } catch (err) {
    console.error("Suite 2 Error:", err.message);
  }

  // -----------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(`📊 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log("==========================================================");

  if (passedTests === totalTests) {
    console.log("🎉 ALL TESTS PASSED! PRODUCTION VERIFICATION SUCCESSFUL.");
    process.exit(0);
  } else {
    console.error("⚠️ SOME TESTS FAILED. PLEASE REVIEW LOGS.");
    process.exit(1);
  }
}

runTests();
