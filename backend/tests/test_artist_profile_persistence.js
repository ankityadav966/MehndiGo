/**
 * Test Suite: Artist Profile Data Persistence, Edit Profile, and KYC Privacy Protection
 * Verifies that all onboarding and profile fields persist in the database,
 * auto-populate on GET /profile, can be updated via PUT /profile,
 * and protect sensitive KYC data in public endpoints.
 */

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const assert = require("assert");
const db = require("../models");
const ArtistService = require("../services/artist.services");

async function runTests() {
  console.log("=================================================================");
  console.log("  TEST: ARTIST PROFILE DATA PERSISTENCE & EDIT PROFILE FLOW");
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
  const testEmail = `artist_persist_${timestamp}@mehndigo.com`;
  const testPhone = `98${String(timestamp).slice(-8)}`;
  const testAadhaar = "567812349876";

  let createdUser = null;

  try {
    // 1. Create Artist User
    console.log("--- 1. Artist User Creation (Simulating Verified Artist Signup) ---");
    createdUser = await db.User.create({
      name: "Radhika Mehendi Arts",
      email: testEmail,
      phone: testPhone,
      role: "ARTIST",
      is_verified: true,
      is_active: true,
    });
    record("Artist user created with role ARTIST", createdUser && createdUser.role === "ARTIST");

    // 2. Submit Complete Onboarding Payload
    console.log("\n--- 2. Onboarding Data Submission (Single Source of Truth) ---");
    const onboardingPayload = {
      user_id: createdUser.id,
      bio: "Master bridal mehndi specialist with 7+ years of royal Rajasthani and Arabic patterns.",
      experience_years: 7,
      starting_price: 2500,
      home_service: true,
      salon_service: true,
      city: "Jaipur",
      state: "Rajasthan",
      location: "Mansarovar, Jaipur",
      pincode: "302020",
      latitude: 26.8689,
      longitude: 75.7654,
      aadhaar_number: testAadhaar,
      aadhaar_front: "https://res.cloudinary.com/mehndigo/image/upload/aadhaar_front_sample.jpg",
      aadhaar_back: "https://res.cloudinary.com/mehndigo/image/upload/aadhaar_back_sample.jpg",
      selfie_image: "https://res.cloudinary.com/mehndigo/image/upload/profile_selfie_sample.jpg",
      phone: testPhone,
    };

    const submitRes = await ArtistService.createArtistProfile(onboardingPayload);
    record("createArtistProfile executed successfully", Boolean(submitRes));

    // 3. Verify Database Persistence in Sequelize Model
    console.log("\n--- 3. Direct Database Verification ---");
    const dbProfile = await db.ArtistProfile.findOne({ where: { user_id: createdUser.id } });
    record("ArtistProfile record exists in DB", Boolean(dbProfile));
    record("Bio saved in DB", dbProfile?.bio === onboardingPayload.bio);
    record("Experience years saved in DB", Number(dbProfile?.experience_years) === 7);
    record("Starting price saved in DB", Number(dbProfile?.starting_price) === 2500);
    record("Home service enabled in DB", Boolean(dbProfile?.home_service) === true);
    record("Salon service enabled in DB", Boolean(dbProfile?.salon_service) === true);
    record("City saved in DB", dbProfile?.city === "Jaipur");
    record("State saved in DB", dbProfile?.state === "Rajasthan");
    record("Pincode saved in DB", dbProfile?.pincode === "302020");
    record("Aadhaar front image saved in DB", Boolean(dbProfile?.aadhaar_front));
    record("Aadhaar back image saved in DB", Boolean(dbProfile?.aadhaar_back));
    record("Aadhaar number stored securely in DB", dbProfile?.aadhaar_number === testAadhaar);

    // Verify User model profile image sync
    const dbUser = await db.User.findByPk(createdUser.id);
    record("User profile_image synced with selfie_image in DB", Boolean(dbUser?.profile_image));

    // 4. Verify Authenticated GET Profile (with Masked Aadhaar)
    console.log("\n--- 4. Authenticated Artist Profile Retrieval ---");
    const profileDetails = await ArtistService.getArtistDetails(createdUser.id);
    record("getArtistDetails returns bio", profileDetails.bio === onboardingPayload.bio);
    record("getArtistDetails returns experience_years", Number(profileDetails.experience_years) === 7);
    record("getArtistDetails returns starting_price", Number(profileDetails.starting_price) === 2500);
    record("getArtistDetails returns home_service", profileDetails.home_service === true);
    record("getArtistDetails returns salon_service", profileDetails.salon_service === true);
    record("getArtistDetails returns city & state", profileDetails.city === "Jaipur" && profileDetails.state === "Rajasthan");
    record("getArtistDetails returns masked Aadhaar (•••• •••• 9876)", profileDetails.aadhaar_number === "•••• •••• 9876");
    record("getArtistDetails flags isProfileComplete: true", profileDetails.isProfileComplete === true);

    // 5. Update Profile (Edit Profile Flow)
    console.log("\n--- 5. Edit Profile Update (PUT /artist/profile) ---");
    const updatePayload = {
      name: "Radhika Mehendi Studio Jaipur",
      bio: "Updated: Award-winning luxury bridal artist catering worldwide.",
      experience_years: 8,
      starting_price: 3500,
      home_service: true,
      salon_service: false,
      is_available: true,
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302015",
      location: "C-Scheme, Jaipur",
      languages: "English, Hindi, Marwari",
      profile_image: "https://res.cloudinary.com/mehndigo/image/upload/new_updated_avatar.jpg",
    };

    const updateRes = await ArtistService.updateArtistProfile(createdUser.id, updatePayload);
    record("updateArtistProfile executed successfully", Boolean(updateRes));

    // 6. Verify Updated Details Persisted in DB and GET API
    console.log("\n--- 6. Post-Edit Verification ---");
    const freshProfile = await ArtistService.getArtistDetails(createdUser.id);
    const freshUser = await db.User.findByPk(createdUser.id);
    
    record("User name updated in DB", freshUser?.name === "Radhika Mehendi Studio Jaipur");
    record("User profile_image updated in DB", freshUser?.profile_image === updatePayload.profile_image);
    record("Bio updated in fresh profile", freshProfile.bio === updatePayload.bio);
    record("Experience years updated (8)", Number(freshProfile.experience_years) === 8);
    record("Starting price updated (₹3500)", Number(freshProfile.starting_price) === 3500);
    record("Home service remained enabled", freshProfile.home_service === true);
    record("Salon service updated to false", freshProfile.salon_service === false);
    record("Availability updated to true", freshProfile.is_available === true);
    record("Languages updated", freshProfile.languages === "English, Hindi, Marwari");
    record("Aadhaar remains masked", freshProfile.aadhaar_number === "•••• •••• 9876");

    // 7. Verify Public KYC Privacy Protection
    console.log("\n--- 7. Public Customer API KYC Privacy Audit ---");
    await db.ArtistProfile.update({ verification_status: "APPROVED" }, { where: { user_id: createdUser.id } });
    const publicProfile = await ArtistService.getArtistDetailsById(createdUser.id);
    
    record("Public endpoint returns artist details", Boolean(publicProfile));
    record("Public endpoint HIDES Aadhaar front image", publicProfile.aadhaar_front === undefined);
    record("Public endpoint HIDES Aadhaar back image", publicProfile.aadhaar_back === undefined);
    record("Public endpoint HIDES Aadhaar number", publicProfile.aadhaar_number === undefined);
    record("Public endpoint HIDES PAN number", publicProfile.pan_number === undefined);
    record("Public endpoint returns bio & name", Boolean(publicProfile.bio && publicProfile.user?.name));

    // 8. Single Profile Canonical Integrity (Zero duplicates)
    console.log("\n--- 8. Single Canonical Profile Integrity ---");
    const allProfiles = await db.ArtistProfile.findAll({ where: { user_id: createdUser.id } });
    record("Exactly one canonical ArtistProfile exists for this user", allProfiles.length === 1);

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    try {
      if (createdUser?.id) {
        await db.Service.destroy({ where: { artist_id: createdUser.id } });
        await db.ArtistProfile.destroy({ where: { user_id: createdUser.id } });
        await db.User.destroy({ where: { id: createdUser.id } });
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

runTests().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
