/**
 * Test Suite: Complete Artist Profile Production Capabilities
 * Tests:
 * 1. getArtistById (Dynamic trust factors, availability status, packages, reviews, sanitization)
 * 2. getArtistServices (Services with packages & addons)
 * 3. getArtistPortfolio (Portfolio filtering by tier/complexity, sorting by popular/price)
 * 4. getArtistServiceCatalog (Artist-specific service storefront, matching designs, packages)
 * 5. createCustomDesignRequest (Persistence with references, occasion, style, group size, coverage, budget, status)
 * 6. getArtistFaqs (FAQs retrieval)
 * 7. getArtistOffers (Active coupons and discounts)
 */

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const assert = require("assert");
const db = require("../models");
const CustomerService = require("../services/customer.services");

async function runArtistProfileCompleteTests() {
  console.log("=================================================================");
  console.log("  TEST SUITE: COMPLETE ARTIST PROFILE PRODUCTION PIPELINE");
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

  try {
    // 1. Seed Customer, Artist, Services, Packages, Portfolios, Reviews, and FAQs
    console.log("--- 1. Seeding Test Fixtures in SQLite ---");
    const customerUser = await db.User.create({
      name: "Sneha Sharma",
      email: `sneha_${timestamp}@test.com`,
      phone: `91${String(timestamp).slice(-8)}`,
      role: "CUSTOMER",
      is_verified: true,
      is_active: true
    });

    const artistUser = await db.User.create({
      name: "Ananya Mehndi Artist",
      email: `ananya_${timestamp}@artist.com`,
      phone: `98${String(timestamp).slice(-8)}`,
      role: "ARTIST",
      is_verified: true,
      is_active: true,
      profile_image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400"
    });

    const artistProfile = await db.ArtistProfile.create({
      user_id: artistUser.id,
      bio: "Master bridal henna artist with 5+ years of royal Rajasthani and contemporary experience.",
      experience_years: 5,
      starting_price: 2500,
      home_service: true,
      salon_service: true,
      city: "Jaipur",
      state: "Rajasthan",
      avg_rating: 4.9,
      total_reviews: 12,
      total_bookings: 48,
      is_featured: true,
      is_available: true,
      verification_status: "APPROVED"
    });

    const bridalService = await db.Service.create({
      artist_id: artistProfile.id,
      specialization_name: "Full Royal Bridal Mehndi",
      category: "Bridal",
      description: "Intricate royal bridal artwork covering elbows and feet with organic stain henna.",
      minimum_price: 5000,
      duration_minutes: 180,
      is_home_service: true,
      is_active: true
    });

    const arabicService = await db.Service.create({
      artist_id: artistProfile.id,
      specialization_name: "Festive Arabic Mehndi Pattern",
      category: "Arabic",
      description: "Modern flowy floral vines and delicate finger lace patterns.",
      minimum_price: 1500,
      duration_minutes: 45,
      is_home_service: true,
      is_active: true
    });

    // Packages
    if (db.ServicePackage) {
      await db.ServicePackage.create({
        service_id: bridalService.id,
        package_name: "Royal Bride Standard Package",
        package_price: 5000,
        duration: 180,
        number_of_hands: 2,
        number_of_feet: 2,
        home_visit: true,
        touch_up_included: true,
        aftercare_included: true,
        included_designs: "Front & back palms, elbow coverage, feet anklet motifs."
      });

      await db.ServicePackage.create({
        service_id: bridalService.id,
        package_name: "Maharani Portrait Exclusive Package",
        package_price: 8500,
        duration: 240,
        number_of_hands: 2,
        number_of_feet: 2,
        home_visit: true,
        touch_up_included: true,
        aftercare_included: true,
        included_designs: "Bride & groom portraits, personalized wedding vows calligraphy."
      });
    }

    // Portfolio designs
    await db.Portfolio.create({
      artist_id: artistProfile.id,
      title: "Royal Peacock Bridal Pattern",
      caption: "Intricate bridal layout",
      description: "Traditional Rajasthani peacock & kalash motifs.",
      category: "Bridal",
      occasion: "Wedding",
      art_tier: "BRIDAL_EXCLUSIVE",
      price: 5000,
      duration_minutes: 180,
      complexity_level: "MASTERPIECE",
      likes_count: 45,
      views_count: 320,
      image_url: "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=600",
      visibility: true,
      display_order: 1
    });

    await db.Portfolio.create({
      artist_id: artistProfile.id,
      title: "Modern Arabic Floral Trail",
      caption: "Shaded arabic roses",
      description: "Flowy diagonal floral trail with lace cuffs.",
      category: "Arabic",
      occasion: "Festival",
      art_tier: "STANDARD",
      price: 1500,
      duration_minutes: 45,
      complexity_level: "SIMPLE",
      likes_count: 22,
      views_count: 140,
      image_url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=600",
      visibility: true,
      display_order: 2
    });

    // Booking & Review
    const testBooking = await db.Booking.create({
      booking_code: `BK-${String(timestamp).slice(-6)}`,
      user_id: customerUser.id,
      artist_id: artistProfile.id,
      service_id: bridalService.id,
      total_price: 5000,
      advance_paid: 1000,
      remaining_amount: 4000,
      service_location_type: "HOME",
      address: "Civil Lines, Jaipur",
      status: "COMPLETED",
      booking_date: "2026-11-20",
      time_slot: "10:00 AM"
    });

    await db.Review.create({
      user_id: customerUser.id,
      artist_id: artistProfile.id,
      booking_id: testBooking.id,
      rating: 5,
      comment: "Ananya was on time and created the most stunning bridal design! The henna color was so deep and dark.",
      photos: ["https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=400"]
    });

    // Coupon
    if (db.Coupon) {
      await db.Coupon.create({
        code: `FESTIVE_${String(timestamp).slice(-4)}`,
        discount_type: "FLAT",
        discount_value: 100,
        discount_percentage: 10,
        max_discount: 100,
        min_booking_value: 1000,
        expires_at: new Date(Date.now() + 8640000000),
        is_active: true
      });
    }

    // FAQ
    if (db.FAQ) {
      await db.FAQ.create({
        category: "General",
        question: "Do you provide home service?",
        answer: "Yes! Doorstep home service is available across the city.",
        is_active: true
      });
    }

    console.log("Fixtures created successfully.\n");

    // --- TEST 1: getArtistById ---
    console.log("--- 2. Testing CustomerService.getArtistById ---");
    const artistData = await CustomerService.getArtistById(artistProfile.id);
    record("getArtistById returns artist object", artistData !== null);
    record("getArtistById includes User details", artistData?.user?.name === "Ananya Mehndi Artist");
    record("getArtistById computes is_verified flag", artistData?.is_verified === true);
    record("getArtistById computes is_premium flag", artistData?.is_premium === true);
    record("getArtistById computes is_top_rated flag", artistData?.is_top_rated === true);
    record("getArtistById computes availability status", artistData?.availability_status === "AVAILABLE");
    record("getArtistById includes dynamic trust factors", Array.isArray(artistData?.trust_factors) && artistData.trust_factors.length >= 4);
    record("getArtistById includes services with packages", Array.isArray(artistData?.services) && artistData.services[0].packages?.length === 2);
    record("getArtistById includes portfolio designs", Array.isArray(artistData?.portfolio) && artistData.portfolio.length === 2);
    record("getArtistById sanitizes sensitive KYC fields", artistData?.aadhaar_number === undefined && artistData?.pan_number === undefined);

    // --- TEST 2: getArtistServices ---
    console.log("\n--- 3. Testing CustomerService.getArtistServices ---");
    const servicesList = await CustomerService.getArtistServices(artistProfile.id);
    record("getArtistServices returns array", Array.isArray(servicesList) && servicesList.length === 2);
    record("getArtistServices includes packages association", Array.isArray(servicesList[0].packages) && servicesList[0].packages.length === 2);

    // --- TEST 3: getArtistPortfolio ---
    console.log("\n--- 4. Testing CustomerService.getArtistPortfolio with filtering & sorting ---");
    const allPort = await CustomerService.getArtistPortfolio(artistProfile.id);
    record("getArtistPortfolio returns all designs", allPort.length === 2);

    const bridalPort = await CustomerService.getArtistPortfolio(artistProfile.id, { art_tier: "BRIDAL_EXCLUSIVE" });
    record("getArtistPortfolio filters by art_tier BRIDAL_EXCLUSIVE", bridalPort.length === 1 && bridalPort[0].art_tier === "BRIDAL_EXCLUSIVE");

    const popularPort = await CustomerService.getArtistPortfolio(artistProfile.id, { sort: "popular" });
    record("getArtistPortfolio sorts by popular (likes/views)", popularPort[0].likes_count >= popularPort[1].likes_count);

    // --- TEST 4: getArtistServiceCatalog ---
    console.log("\n--- 5. Testing CustomerService.getArtistServiceCatalog (Storefront) ---");
    const catalog = await CustomerService.getArtistServiceCatalog(artistProfile.id, bridalService.id);
    record("getArtistServiceCatalog returns artist metadata", catalog?.artist?.name === "Ananya Mehndi Artist");
    record("getArtistServiceCatalog returns service metadata", catalog?.service?.specialization_name === "Full Royal Bridal Mehndi");
    record("getArtistServiceCatalog includes service packages", Array.isArray(catalog?.packages) && catalog.packages.length === 2);
    record("getArtistServiceCatalog returns matched portfolio designs", Array.isArray(catalog?.designs) && catalog.designs.length >= 1);

    // --- TEST 5: createCustomDesignRequest ---
    console.log("\n--- 6. Testing CustomerService.createCustomDesignRequest ---");
    const customReq = await CustomerService.createCustomDesignRequest(customerUser.id, {
      artist_id: artistProfile.id,
      service_id: bridalService.id,
      occasion: "Bridal Destination Wedding",
      preferred_style: "Rajasthani Royal Traditional",
      description: "Custom couple portrait with intricate baraat theme and wedding hashtag.",
      reference_images: [
        "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=400",
        "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=400"
      ],
      group_size: 4,
      service_coverage: "FULL_BRIDAL",
      budget_preference: 8500,
      preferred_date: "2026-11-20",
      preferred_time: "Morning (9:00 AM - 12:00 PM)",
      address: "Heritage Haveli, C-Scheme, Jaipur"
    });
    record("createCustomDesignRequest creates record", customReq !== null && customReq.id !== undefined);
    record("createCustomDesignRequest records occasion", customReq.occasion === "Bridal Destination Wedding");
    record("createCustomDesignRequest records group size", customReq.group_size === 4);
    record("createCustomDesignRequest records budget", customReq.budget_preference === 8500);
    record("createCustomDesignRequest sets status to PENDING", customReq.status === "PENDING");

    // --- TEST 6: getArtistFaqs ---
    console.log("\n--- 7. Testing CustomerService.getArtistFaqs ---");
    const faqsList = await CustomerService.getArtistFaqs(artistProfile.id);
    record("getArtistFaqs returns FAQs array", Array.isArray(faqsList) && faqsList.length >= 1);
    record("getArtistFaqs contains question and answer", Boolean(faqsList[0].question && faqsList[0].answer));

    // --- TEST 7: getArtistOffers ---
    console.log("\n--- 8. Testing CustomerService.getArtistOffers ---");
    const offersList = await CustomerService.getArtistOffers(artistProfile.id);
    record("getArtistOffers returns active coupons", Array.isArray(offersList) && offersList.length >= 1);

    console.log("\n=================================================================");
    console.log(`  TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("=================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error("Test Suite execution exception:", err);
    process.exit(1);
  }
}

runArtistProfileCompleteTests();
