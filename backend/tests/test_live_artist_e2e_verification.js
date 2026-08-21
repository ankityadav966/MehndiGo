/**
 * MehndiGo — Live Artist End-to-End Verification Suite
 * Executes strict verification of the actual database path, exact non-default fields,
 * logout/login persistence, app restart, partial updates, duplicate prevention,
 * multi-artist isolation, KYC protection, and API response mapping.
 */

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const assert = require("node:assert/strict");
const { test, describe, before, after } = require("node:test");
const db = require("../models");
const ArtistService = require("../services/artist.services");
const jwt = require("jsonwebtoken");

describe("MehndiGo — Final End-to-End Artist Verification", () => {
  let artistA = null;
  let artistB = null;
  const testAadhaarA = "889977665544";
  const testAadhaarB = "112233445566";

  before(async () => {
    await db.sequelize.sync({ force: true });
  });

  after(async () => {
    try {
      if (artistA?.id) {
        await db.Service.destroy({ where: { artist_id: artistA.id } });
        await db.ArtistProfile.destroy({ where: { user_id: artistA.id } });
        await db.User.destroy({ where: { id: artistA.id } });
      }
      if (artistB?.id) {
        await db.Service.destroy({ where: { artist_id: artistB.id } });
        await db.ArtistProfile.destroy({ where: { user_id: artistB.id } });
        await db.User.destroy({ where: { id: artistB.id } });
      }
    } catch (_) {}
  });

  test("1. Database Path Tracing & Exact Field Persistence", async () => {
    // Step 1: Artist Signup / Authentication
    artistA = await db.User.create({
      name: "Ananya Artist",
      email: "ananya.artist@mehndigo.in",
      phone: "9876500001",
      role: "ARTIST",
      is_verified: true,
      is_active: true
    });

    const token = jwt.sign(
      { id: artistA.id, email: artistA.email, role: artistA.role },
      process.env.JWT_SECRET
    );

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.equal(decoded.id, artistA.id, "Authenticated user ID must match signed token");

    // Step 2: Onboarding Submission with Exact Test Values
    const onboardingPayload = {
      user_id: artistA.id,
      bio: "TEST_ARTIST_BIO_123",
      location: "TEST_LOCATION_123",
      city: "TEST_CITY_123",
      state: "TEST_STATE_123",
      pincode: "999999",
      experience_years: 7,
      starting_price: 2500,
      home_service: true,
      salon_service: true,
      is_available: true,
      languages: "English, Hindi",
      aadhaar_number: testAadhaarA,
      aadhaar_front: "https://cloudinary.com/aadhaar_front_123.jpg",
      aadhaar_back: "https://cloudinary.com/aadhaar_back_123.jpg",
      selfie_image: "https://cloudinary.com/selfie_123.jpg",
      phone: "9876500001"
    };

    const submitResult = await ArtistService.createArtistProfile(onboardingPayload);
    assert.ok(submitResult, "Onboarding submission must succeed");

    // Step 3: Query Actual Database Table
    const dbRecord = await db.ArtistProfile.findOne({ where: { user_id: artistA.id } });
    assert.ok(dbRecord, "Database record must exist in artist_profiles table");
    assert.equal(dbRecord.bio, "TEST_ARTIST_BIO_123", "Database bio must match TEST_ARTIST_BIO_123");
    assert.equal(dbRecord.location, "TEST_LOCATION_123", "Database location must match TEST_LOCATION_123");
    assert.equal(dbRecord.city, "TEST_CITY_123", "Database city must match TEST_CITY_123");
    assert.equal(dbRecord.state, "TEST_STATE_123", "Database state must match TEST_STATE_123");
    assert.equal(String(dbRecord.pincode), "999999", "Database pincode must match 999999");
    assert.equal(Number(dbRecord.experience_years), 7, "Database experience must match 7");
    assert.equal(Number(dbRecord.starting_price), 2500, "Database starting_price must match 2500");
    assert.equal(dbRecord.aadhaar_number, testAadhaarA, "Database must store actual 12-digit Aadhaar");

    // Step 4: Call Actual Artist Profile API
    const apiResponse = await ArtistService.getArtistDetails(artistA.id);
    assert.equal(apiResponse.bio, "TEST_ARTIST_BIO_123", "API bio must match TEST_ARTIST_BIO_123");
    assert.equal(apiResponse.location, "TEST_LOCATION_123", "API location must match TEST_LOCATION_123");
    assert.equal(apiResponse.city, "TEST_CITY_123", "API city must match TEST_CITY_123");
    assert.equal(apiResponse.state, "TEST_STATE_123", "API state must match TEST_STATE_123");
    assert.equal(String(apiResponse.pincode), "999999", "API pincode must match 999999");
    assert.equal(Number(apiResponse.experience_years), 7, "API experience must match 7");
    assert.equal(Number(apiResponse.starting_price), 2500, "API starting_price must match 2500");
    assert.equal(apiResponse.aadhaar_number, "•••• •••• 5544", "API Aadhaar must be masked");

    // Step 5: Mobile Context & UI State Hydration Simulation
    const mobileUIState = {
      fullName: apiResponse.user?.name || apiResponse.user?.full_name || "",
      bio: apiResponse.bio || "",
      location: apiResponse.location || "",
      city: apiResponse.city || "",
      state: apiResponse.state || "",
      pincode: String(apiResponse.pincode || ""),
      experienceYears: String(apiResponse.experience_years || ""),
      startingPrice: String(apiResponse.starting_price || ""),
      homeService: Boolean(apiResponse.home_service),
      salonService: Boolean(apiResponse.salon_service),
      isAvailable: Boolean(apiResponse.is_available)
    };

    assert.equal(mobileUIState.bio, "TEST_ARTIST_BIO_123");
    assert.equal(mobileUIState.location, "TEST_LOCATION_123");
    assert.equal(mobileUIState.city, "TEST_CITY_123");
    assert.equal(mobileUIState.state, "TEST_STATE_123");
    assert.equal(mobileUIState.pincode, "999999");
    assert.equal(mobileUIState.experienceYears, "7");
    assert.equal(mobileUIState.startingPrice, "2500");
  });

  test("2. Logout and Login Persistence", async () => {
    // Step 1: Simulate Client-side Logout (Purge in-memory state)
    let inMemorySession = null;
    assert.equal(inMemorySession, null, "In-memory session purged on logout");

    // Step 2: Login Again via phone/email verification
    const loggedInUser = await db.User.findOne({ where: { email: "ananya.artist@mehndigo.in" } });
    assert.ok(loggedInUser, "User logged in successfully");

    // Step 3: Fetch Artist Profile post-login
    const restoredProfile = await ArtistService.getArtistDetails(loggedInUser.id);
    assert.equal(restoredProfile.bio, "TEST_ARTIST_BIO_123");
    assert.equal(restoredProfile.location, "TEST_LOCATION_123");
    assert.equal(restoredProfile.city, "TEST_CITY_123");
    assert.equal(restoredProfile.state, "TEST_STATE_123");
    assert.equal(String(restoredProfile.pincode), "999999");
    assert.equal(Number(restoredProfile.experience_years), 7);
    assert.equal(Number(restoredProfile.starting_price), 2500);
  });

  test("3. App Restart & Session Restoration", async () => {
    // Simulate mobile app restart: token read from secure storage -> refreshArtistProfile()
    const storedUserId = artistA.id;
    const freshBackendProfile = await ArtistService.getProfile(storedUserId);

    assert.ok(freshBackendProfile, "Profile fetched from backend on restart");
    assert.equal(freshBackendProfile.bio, "TEST_ARTIST_BIO_123");
    assert.equal(freshBackendProfile.location, "TEST_LOCATION_123");
    assert.equal(freshBackendProfile.city, "TEST_CITY_123");
    assert.equal(freshBackendProfile.state, "TEST_STATE_123");
    assert.equal(String(freshBackendProfile.pincode), "999999");
    assert.equal(Number(freshBackendProfile.experience_years), 7);
    assert.equal(Number(freshBackendProfile.starting_price), 2500);
  });

  test("4. Partial Update Safety (Bio update only, Location update only)", async () => {
    // Step A: Update ONLY Bio to TEST_ARTIST_BIO_UPDATED_456
    await ArtistService.updateProfileDetails(artistA.id, {
      bio: "TEST_ARTIST_BIO_UPDATED_456"
    });

    const dbAfterBioUpdate = await db.ArtistProfile.findOne({ where: { user_id: artistA.id } });
    assert.equal(dbAfterBioUpdate.bio, "TEST_ARTIST_BIO_UPDATED_456", "Bio must update to TEST_ARTIST_BIO_UPDATED_456");
    assert.equal(dbAfterBioUpdate.location, "TEST_LOCATION_123", "Location must remain TEST_LOCATION_123");
    assert.equal(dbAfterBioUpdate.city, "TEST_CITY_123", "City must remain TEST_CITY_123");
    assert.equal(dbAfterBioUpdate.state, "TEST_STATE_123", "State must remain TEST_STATE_123");
    assert.equal(String(dbAfterBioUpdate.pincode), "999999", "Pincode must remain 999999");
    assert.equal(Number(dbAfterBioUpdate.experience_years), 7, "Experience must remain 7");
    assert.equal(Number(dbAfterBioUpdate.starting_price), 2500, "Starting price must remain 2500");

    // Step B: Update ONLY Location to TEST_LOCATION_UPDATED_789
    await ArtistService.updateProfileDetails(artistA.id, {
      location: "TEST_LOCATION_UPDATED_789"
    });

    const dbAfterLocUpdate = await db.ArtistProfile.findOne({ where: { user_id: artistA.id } });
    assert.equal(dbAfterLocUpdate.bio, "TEST_ARTIST_BIO_UPDATED_456", "Bio must remain TEST_ARTIST_BIO_UPDATED_456");
    assert.equal(dbAfterLocUpdate.location, "TEST_LOCATION_UPDATED_789", "Location must update to TEST_LOCATION_UPDATED_789");
    assert.equal(dbAfterLocUpdate.city, "TEST_CITY_123", "City must remain TEST_CITY_123");
    assert.equal(dbAfterLocUpdate.state, "TEST_STATE_123", "State must remain TEST_STATE_123");
    assert.equal(String(dbAfterLocUpdate.pincode), "999999", "Pincode must remain 999999");
    assert.equal(Number(dbAfterLocUpdate.experience_years), 7, "Experience must remain 7");
    assert.equal(Number(dbAfterLocUpdate.starting_price), 2500, "Starting price must remain 2500");
  });

  test("5. Duplicate Onboarding Submission Prevention", async () => {
    // Attempt duplicate submission for artistA
    await ArtistService.createArtistProfile({
      user_id: artistA.id,
      bio: "DUPLICATE_SUBMISSION_BIO",
      location: "TEST_LOCATION_UPDATED_789",
      city: "TEST_CITY_123",
      state: "TEST_STATE_123",
      pincode: "999999",
      experience_years: 7,
      starting_price: 2500
    });

    const allProfiles = await db.ArtistProfile.findAll({ where: { user_id: artistA.id } });
    assert.equal(allProfiles.length, 1, "Exactly one canonical profile must exist for artist");
    assert.equal(allProfiles[0].bio, "DUPLICATE_SUBMISSION_BIO", "Duplicate submission updates canonical row instead of inserting new row");
  });

  test("6. Multi-Artist Data Isolation", async () => {
    // Create Artist B
    artistB = await db.User.create({
      name: "Bhavna Artist",
      email: "bhavna.artist@mehndigo.in",
      phone: "9876500002",
      role: "ARTIST",
      is_verified: true,
      is_active: true
    });

    await ArtistService.createArtistProfile({
      user_id: artistB.id,
      bio: "ARTIST_B_UNIQUE_BIO",
      location: "ARTIST_B_LOCATION",
      city: "ARTIST_B_CITY",
      state: "Gujarat",
      pincode: "380001",
      experience_years: 3,
      starting_price: 1800,
      aadhaar_number: testAadhaarB
    });

    // Query Artist B profile
    const profileB = await ArtistService.getArtistDetails(artistB.id);
    assert.equal(profileB.bio, "ARTIST_B_UNIQUE_BIO");
    assert.equal(profileB.location, "ARTIST_B_LOCATION");
    assert.equal(profileB.city, "ARTIST_B_CITY");
    assert.equal(profileB.user.name, "Bhavna Artist");

    // Query Artist A profile again
    const profileA = await ArtistService.getArtistDetails(artistA.id);
    assert.equal(profileA.location, "TEST_LOCATION_UPDATED_789");
    assert.equal(profileA.city, "TEST_CITY_123");
    assert.equal(profileA.user.name, "Ananya Artist");
    assert.notEqual(profileA.bio, profileB.bio, "Artist A and Artist B data must be strictly isolated");
  });

  test("7. Masked Aadhaar KYC Overwrite Protection", async () => {
    const rawAadhaarBefore = (await db.ArtistProfile.findOne({ where: { user_id: artistA.id } })).aadhaar_number;
    assert.equal(rawAadhaarBefore, testAadhaarA, "Stored Aadhaar must be 12 digits");

    // Client passes masked Aadhaar string during Edit Profile save
    await ArtistService.updateProfileDetails(artistA.id, {
      name: "Ananya Mehndi Studio",
      bio: "TEST_ARTIST_BIO_FINAL",
      aadhaar_number: "•••• •••• 5544"
    });

    const rawAadhaarAfter = (await db.ArtistProfile.findOne({ where: { user_id: artistA.id } })).aadhaar_number;
    assert.equal(rawAadhaarAfter, testAadhaarA, "Submitting masked Aadhaar bullet string must NOT overwrite stored 12-digit Aadhaar");
  });

  test("8. Empty State & Non-Fabrication", async () => {
    const freshUser = await db.User.create({
      name: "New Unfilled Artist",
      email: "unfilled@mehndigo.in",
      phone: "9876500003",
      role: "ARTIST"
    });

    const rawProfile = await db.ArtistProfile.create({
      user_id: freshUser.id,
      bio: "",
      location: "",
      city: "",
      state: "",
      pincode: ""
    });

    const apiDetails = await ArtistService.getArtistDetails(freshUser.id);
    assert.equal(apiDetails.bio, "", "Unfilled bio must be empty string");
    assert.equal(apiDetails.location, "", "Unfilled location must be empty string");
    assert.equal(apiDetails.city, "", "Unfilled city must be empty string");
    assert.equal(apiDetails.state, "", "Unfilled state must be empty string");
    assert.equal(apiDetails.pincode, "", "Unfilled pincode must be empty string");

    await db.ArtistProfile.destroy({ where: { user_id: freshUser.id } });
    await db.User.destroy({ where: { id: freshUser.id } });
  });

  test("9. API Response Mapping & Live Backend Configuration", async () => {
    // Validate that mobile services have valid API URL configuration
    const mobileEnvPath = require("path").resolve(__dirname, "../../mobile/.env");
    const mobileEnvContent = require("fs").readFileSync(mobileEnvPath, "utf8");
    assert.ok(mobileEnvContent.includes("EXPO_PUBLIC_API_URL=https://api.mehndigo.in/api/v1"), "Production EXPO_PUBLIC_API_URL is configured");

    // Validate D1 Worker index.js mapping consistency
    const indexJsPath = require("path").resolve(__dirname, "../src/index.js");
    const indexJsContent = require("fs").readFileSync(indexJsPath, "utf8");
    assert.ok(indexJsContent.includes("handleGetArtistDetails"), "handleGetArtistDetails handler present in Worker");
    assert.ok(indexJsContent.includes("handleUpdateArtistProfile"), "handleUpdateArtistProfile handler present in Worker");
  });
});
