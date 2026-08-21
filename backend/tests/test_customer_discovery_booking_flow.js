/**
 * Test Suite: Customer Home, Artist Discovery, Public Profile, and Booking Flow
 * Verifies that Customer Home displays real data, clicking on artists fetches
 * live public profile details, services catalog, and reviews without KYC leaks.
 */

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const assert = require("assert");
const db = require("../models");
const CustomerService = require("../services/customer.services");
const ArtistService = require("../services/artist.services");

async function runCustomerDiscoveryTests() {
  console.log("=================================================================");
  console.log("  TEST: CUSTOMER HOME, ARTIST DISCOVERY & PUBLIC PROFILE FLOW");
  console.log("=================================================================\n");

  await db.sequelize.sync({ force: true });

  let passed = 0;
  let failed = 0;

  function record(desc, cond, details = "") {
    if (cond) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc} ${details ? `-> ${details}` : ""}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  let artistUser = null;
  let artistProfile = null;
  let createdService = null;
  let createdPortfolio = null;

  try {
    // 1. Create an Approved Artist with Services and Portfolio
    console.log("--- 1. Seed Approved Artist with Services & Portfolio ---");
    artistUser = await db.User.create({
      name: "Pooja Mehndi Specialist",
      email: `pooja_${timestamp}@artist.com`,
      phone: `91${String(timestamp).slice(-8)}`,
      role: "ARTIST",
      is_verified: true,
      is_active: true,
      profile_image: "https://res.cloudinary.com/mehndigo/image/upload/pooja_profile.jpg",
    });

    artistProfile = await db.ArtistProfile.create({
      user_id: artistUser.id,
      bio: "Top bridal artist with 8+ years experience in luxury destination weddings.",
      experience_years: 8,
      starting_price: 2100,
      home_service: true,
      salon_service: true,
      is_available: true,
      city: "Jaipur",
      state: "Rajasthan",
      location: "Vaishali Nagar, Jaipur",
      pincode: "302021",
      latitude: 26.9124,
      longitude: 75.7873,
      aadhaar_number: "987654321098",
      aadhaar_front: "https://res.cloudinary.com/mehndigo/image/upload/aadhaar_front.jpg",
      verification_status: "APPROVED",
      rating: 4.9,
      total_reviews: 15,
    });

    createdService = await db.Service.create({
      artist_id: artistProfile.id,
      specialization_name: "Royal Rajasthani Bridal Henna",
      category: "Bridal",
      description: "Full hand intricate bridal mehndi with personalized figures.",
      minimum_price: 3500,
      price: 3500,
      duration_minutes: 180,
      is_active: true,
    });

    createdPortfolio = await db.Portfolio.create({
      artist_id: artistProfile.id,
      image_url: "https://res.cloudinary.com/mehndigo/image/upload/sample_henna_design.jpg",
      title: "Royal Bride Hand Design",
      art_tier: "PREMIUM",
      price: 3500,
      visibility: true,
    });

    record("Approved Artist & Services created successfully", Boolean(artistProfile && createdService && createdPortfolio));

    // 2. Customer Home / Nearby Artists Discovery
    console.log("\n--- 2. Customer Nearby & Discovery Query ---");
    const nearbyRes = await CustomerService.getNearbyArtists({
      latitude: 26.9120,
      longitude: 75.7870,
      radius: 50,
      page: 1,
      limit: 10,
    });
    record("Nearby artists query succeeds", Boolean(nearbyRes));
    record("Nearby list contains approved artist", Array.isArray(nearbyRes.rows) && nearbyRes.rows.length > 0);

    // 3. Customer Public Artist Profile (GET /customer/artist/:id)
    console.log("\n--- 3. Public Artist Profile Retrieval (Customer View) ---");
    const publicProfile = await CustomerService.getArtistById(artistProfile.id);
    record("Public profile retrieved successfully", Boolean(publicProfile));
    record("Public profile returns artist user name", publicProfile.user?.name === "Pooja Mehndi Specialist");
    record("Public profile returns bio & experience", publicProfile.bio && Number(publicProfile.experience_years) === 8);
    record("Public profile returns starting price", Number(publicProfile.starting_price) === 2100);
    record("Public profile returns home_service & salon_service", publicProfile.home_service === true && publicProfile.salon_service === true);
    
    // Privacy assertions:
    record("Public profile strictly HIDES Aadhaar number", publicProfile.aadhaar_number === undefined);
    record("Public profile strictly HIDES Aadhaar front", publicProfile.aadhaar_front === undefined);
    record("Public profile strictly HIDES PAN", publicProfile.pan_number === undefined);

    // 4. Customer Artist Services Catalog (GET /customer/artist/:id/services)
    console.log("\n--- 4. Artist Services Catalog Query ---");
    const services = await CustomerService.getArtistServices(artistProfile.id);
    record("Artist services returned as array", Array.isArray(services) && services.length > 0);
    record("Service name is Royal Rajasthani Bridal Henna", services[0]?.specialization_name === "Royal Rajasthani Bridal Henna");
    record("Service price is 3500", Number(services[0]?.minimum_price) === 3500);

    // 5. Customer Artist Portfolio Query (GET /customer/artist/:id/portfolio)
    console.log("\n--- 5. Artist Portfolio Query ---");
    const portfolio = await CustomerService.getArtistPortfolio(artistProfile.id);
    record("Artist portfolio items returned", Array.isArray(portfolio) && portfolio.length > 0);
    record("Portfolio item image URL is valid", Boolean(portfolio[0]?.image_url));

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    try {
      if (artistProfile?.id) {
        await db.Portfolio.destroy({ where: { artist_id: artistProfile.id } });
        await db.Service.destroy({ where: { artist_id: artistProfile.id } });
        await db.ArtistProfile.destroy({ where: { id: artistProfile.id } });
        await db.User.destroy({ where: { id: artistUser.id } });
      }
    } catch (_) {}
  }

  console.log("\n=================================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runCustomerDiscoveryTests().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
