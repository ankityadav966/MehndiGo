process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const assert = require("assert");
const db = require("../models");
const AuthService = require("../services/auth.services");
const ArtistService = require("../services/artist.services");
const AdminService = require("../services/admin.services");

async function runArtistPersistentLoginOnboardingFlowTest() {
  console.log("\n=======================================================");
  console.log("  MEHNDIGO ARTIST PERSISTENT ONBOARDING & DIRECT DASHBOARD FLOW TEST");
  console.log("=======================================================\n");

  let passedSuites = 0;
  let totalSuites = 0;

  async function asyncSuite(name, fn) {
    totalSuites++;
    try {
      await fn();
      passedSuites++;
      console.log(`  ✓ Test ${totalSuites}: ${name}`);
    } catch (err) {
      console.error(`  ✗ Test ${totalSuites} FAILED: ${name}`);
      console.error(err);
    }
  }

  // 1. Sync genuine DB schema
  await db.sequelize.sync({ force: true });

  const timestamp = Date.now();
  const artistEmail = `artist.persist.${timestamp}@mehndigo.com`;
  const adminEmail = `admin.persist.${timestamp}@mehndigo.com`;
  const artistPhone = `98765${String(timestamp).slice(-5)}`;

  let artistUser = null;
  let artistToken = null;
  let adminUser = null;
  let artistProfile = null;

  // Test 1: First-time Registration & Account Creation
  await asyncSuite("1. First-time Registration -> Creates User with role ARTIST and initial ArtistProfile", async () => {
    // 1. Send OTP
    const sendRes = await AuthService.registerSendOtp({
      name: "Radhika Mehandi Artist",
      email: artistEmail,
      phone: artistPhone,
      role: "ARTIST",
      password: "Password@123",
    });
    assert(sendRes.otp, "OTP generated for registration");

    // 2. Verify OTP
    const verifyRes = await AuthService.registerVerifyOtp({
      email: artistEmail,
      phone: artistPhone,
      otp: sendRes.otp,
      name: "Radhika Mehandi Artist",
      role: "ARTIST",
    });

    assert(verifyRes.user, "User created");
    assert.equal(verifyRes.user.role, "ARTIST", "User role is ARTIST");
    assert(verifyRes.accessToken, "JWT accessToken issued");

    artistUser = verifyRes.user;
    artistToken = verifyRes.accessToken;

    const initialProfile = await db.ArtistProfile.findOne({ where: { user_id: artistUser.id } });
    assert(initialProfile, "ArtistProfile record exists in DB");
    assert.equal(initialProfile.verification_status, "PENDING", "Initial verification_status is PENDING");
  });

  // Test 2: Artist fills Personal Details, KYC, Bio & Submits Profile
  await asyncSuite("2. Profile & KYC Submission -> Persists all data cleanly in backend", async () => {
    const profilePayload = {
      user_id: artistUser.id,
      bio: "Professional bridal mehendi artist with 7+ years of experience across Rajasthan.",
      experience_years: 7,
      home_service: true,
      salon_service: false,
      city: "Jaipur",
      state: "Rajasthan",
      location: "Mansarovar, Jaipur",
      pincode: "302020",
      aadhaar_number: "456789012345",
      pan_number: "ABCDE5678F",
      aadhaar_front: "https://res.cloudinary.com/demo/image/upload/aadhaar_front_radhika.jpg",
      aadhaar_back: "https://res.cloudinary.com/demo/image/upload/aadhaar_back_radhika.jpg",
      selfie_image: "https://res.cloudinary.com/demo/image/upload/selfie_radhika.jpg",
      phone: artistPhone,
    };

    artistProfile = await ArtistService.createArtistProfile(profilePayload);
    assert(artistProfile, "Artist profile returned");
    assert.equal(artistProfile.bio, profilePayload.bio, "Bio persisted");
    assert.equal(artistProfile.city, "Jaipur", "City persisted");
    assert.equal(artistProfile.pincode, "302020", "Pincode persisted");
    assert.equal(artistProfile.experience_years, 7, "Experience persisted");
    assert.equal(artistProfile.verification_status, "PENDING", "Verification status is PENDING");
    assert.equal(artistProfile.is_available, false, "Artist availability is false while PENDING");
  });

  // Test 3: Fetch Canonical Profile -> isProfileComplete is true, PENDING status
  await asyncSuite("3. Canonical Profile Retrieval -> Returns all saved fields and complete flag", async () => {
    const details = await ArtistService.getArtistDetails(artistUser.id);
    assert(details, "Details fetched");
    assert.equal(details.city, "Jaipur", "Saved city returned");
    assert.equal(details.state, "Rajasthan", "Saved state returned");
    assert.equal(details.experience_years, 7, "Saved experience returned");
    assert.equal(details.verification_status, "PENDING", "Status is PENDING");
    assert.equal(details.isProfileComplete, true, "Profile marked as complete");
  });

  // Test 4: App Restart / Session Reload -> No data loss
  await asyncSuite("4. App Restart Persistence -> All submitted details intact across reloads", async () => {
    // Simulate fresh fetch as if app was closed and restarted with saved JWT
    const reloadedDetails = await ArtistService.getArtistDetails(artistUser.id);
    assert(reloadedDetails, "Profile loaded after restart");
    assert.equal(reloadedDetails.bio, "Professional bridal mehendi artist with 7+ years of experience across Rajasthan.");
    assert.equal(reloadedDetails.experience_years, 7);
    assert.equal(reloadedDetails.city, "Jaipur");
    assert.equal(reloadedDetails.verification_status, "PENDING");
  });

  // Test 5: Logout & Re-login via OTP -> Preserves all previously entered details
  await asyncSuite("5. Logout & Login via OTP -> User is recognized as ARTIST with persistent profile", async () => {
    // 1. Send Login OTP
    const loginOtpRes = await AuthService.sendOtp({
      email: artistEmail,
      role: "ARTIST",
    });
    assert(loginOtpRes.otp, "Login OTP sent");

    // 2. Verify Login OTP
    const loginVerifyRes = await AuthService.verifyOtp({
      email: artistEmail,
      otp: loginOtpRes.otp,
    });
    assert(loginVerifyRes.accessToken, "New session token issued");
    assert.equal(loginVerifyRes.user.role, "ARTIST", "User role preserved as ARTIST");

    // 3. Fetch profile after login
    const postLoginProfile = await ArtistService.getArtistDetails(loginVerifyRes.user.id);
    assert.equal(postLoginProfile.city, "Jaipur", "Profile city retained after login");
    assert.equal(postLoginProfile.experience_years, 7, "Experience retained after login");
    assert.equal(postLoginProfile.verification_status, "PENDING", "Pending status retained after login");
    assert.equal(postLoginProfile.isProfileComplete, true, "Profile remains complete after login");
  });

  // Test 6: Incomplete / Partial Onboarding Profile Resumption
  await asyncSuite("6. Partial Onboarding Resumption -> Incomplete profile can resume at exact step", async () => {
    const partialEmail = `partial.artist.${timestamp}@mehndigo.com`;
    const partialPhone = `97777${String(timestamp).slice(-5)}`;

    const partialUser = await db.User.create({
      name: "Partial Artist",
      email: partialEmail,
      phone: partialPhone,
      role: "ARTIST",
      is_verified: true,
      is_active: true,
    });

    const partialProfile = await db.ArtistProfile.create({
      user_id: partialUser.id,
      bio: "Beginner mehndi artist",
      experience_years: 1,
      city: "Udaipur",
      state: "Rajasthan",
      location: "Fateh Sagar, Udaipur",
      pincode: "313001",
      verification_status: "PENDING",
      is_available: false,
    });

    const fetchedPartial = await ArtistService.getArtistDetails(partialUser.id);
    assert(fetchedPartial, "Partial profile fetched");
    assert.equal(fetchedPartial.city, "Udaipur");
    // Lacks Aadhaar front/back -> isProfileComplete will be false
    assert.equal(fetchedPartial.isProfileComplete, false, "Incomplete profile flagged correctly");
  });

  // Test 7: Admin Reviews and Approves Artist
  await asyncSuite("7. Admin Approval -> Sets status APPROVED, is_available true, is_verified true", async () => {
    adminUser = await db.User.create({
      name: "Master Admin",
      email: adminEmail,
      phone: `91111${String(timestamp).slice(-5)}`,
      role: "ADMIN",
      is_verified: true,
      is_active: true,
    });

    const approved = await AdminService.approveArtist(artistProfile.id, adminUser.id);
    assert.equal(approved, true, "Admin approval succeeded");

    const updatedProfile = await db.ArtistProfile.findByPk(artistProfile.id);
    assert.equal(updatedProfile.verification_status, "APPROVED", "Status updated to APPROVED");
    assert.equal(updatedProfile.is_available, true, "is_available set to true");
    assert.equal(updatedProfile.reviewed_by, adminUser.id, "reviewed_by recorded");
    assert(updatedProfile.approved_at, "approved_at recorded");

    const updatedUser = await db.User.findByPk(artistUser.id);
    assert.equal(updatedUser.is_verified, true, "User is_verified set to true");
  });

  // Test 8: Approved Artist logs in -> Directly gets APPROVED status for Dashboard navigation
  await asyncSuite("8. Approved Artist Login -> Canonical profile returns APPROVED status for Direct Dashboard", async () => {
    const loginOtpRes = await AuthService.sendOtp({
      email: artistEmail,
      role: "ARTIST",
    });

    const loginVerifyRes = await AuthService.verifyOtp({
      email: artistEmail,
      otp: loginOtpRes.otp,
    });

    assert(loginVerifyRes.accessToken, "Token issued");
    const approvedProfile = await ArtistService.getArtistDetails(loginVerifyRes.user.id);
    assert.equal(approvedProfile.verification_status, "APPROVED", "Profile status is APPROVED");
    assert.equal(approvedProfile.is_available, true, "Artist available for bookings");
    assert.equal(approvedProfile.isProfileComplete, true, "Profile complete");
  });

  // Test 9: Admin Rejection & Resubmission Flow
  await asyncSuite("9. Admin Rejection & Resubmission -> Status transitions from REJECTED back to PENDING on update", async () => {
    const rejectedEmail = `rejected.artist.${timestamp}@mehndigo.com`;
    const rejectedPhone = `96666${String(timestamp).slice(-5)}`;

    const rejUser = await db.User.create({
      name: "Pooja Artist",
      email: rejectedEmail,
      phone: rejectedPhone,
      role: "ARTIST",
      is_verified: true,
      is_active: true,
    });

    const rejProfile = await db.ArtistProfile.create({
      user_id: rejUser.id,
      bio: "Henna artist",
      experience_years: 3,
      city: "Jodhpur",
      state: "Rajasthan",
      pincode: "342001",
      aadhaar_front: "https://res.cloudinary.com/demo/image/upload/bad_aadhaar.jpg",
      aadhaar_back: "https://res.cloudinary.com/demo/image/upload/bad_back.jpg",
      verification_status: "PENDING",
      is_available: false,
    });

    // 1. Admin rejects with reason
    await AdminService.rejectArtist(rejProfile.id, "Aadhaar photo is blurred and unreadable. Please upload a clear photo.", adminUser.id);

    let currentDetails = await ArtistService.getArtistDetails(rejUser.id);
    assert.equal(currentDetails.verification_status, "REJECTED", "Status updated to REJECTED");
    assert.equal(currentDetails.rejection_reason, "Aadhaar photo is blurred and unreadable. Please upload a clear photo.");
    assert.equal(currentDetails.is_available, false, "is_available is false when rejected");

    // 2. Artist updates documents and resubmits
    await ArtistService.updateArtistProfile(rejUser.id, {
      aadhaar_front: "https://res.cloudinary.com/demo/image/upload/clear_aadhaar_front.jpg",
      aadhaar_back: "https://res.cloudinary.com/demo/image/upload/clear_aadhaar_back.jpg",
    });

    currentDetails = await ArtistService.getArtistDetails(rejUser.id);
    assert.equal(currentDetails.verification_status, "PENDING", "Resubmitted profile returns to PENDING");
    assert.equal(currentDetails.rejection_reason, null, "Rejection reason cleared on resubmission");
  });

  // Test 10: Security & Non-Tampering
  await asyncSuite("10. Security Checks -> Non-approved artist profiles are blocked from public directory", async () => {
    // Approved artist is discoverable
    const publicApproved = await ArtistService.getArtistDetailsById(artistProfile.id);
    assert(publicApproved, "Approved artist is discoverable");
    assert.equal(publicApproved.aadhaar_front, undefined, "Sensitive documents stripped from public endpoint");
    assert.equal(publicApproved.pan_number, undefined, "PAN number stripped from public endpoint");

    // Pending artist is NOT discoverable publicly
    const tempPendingUser = await db.User.create({
      name: "Hidden Pending Artist",
      email: `hidden.${timestamp}@mehndigo.com`,
      phone: `95555${String(timestamp).slice(-5)}`,
      role: "ARTIST",
      is_verified: false,
    });

    const tempPendingProfile = await db.ArtistProfile.create({
      user_id: tempPendingUser.id,
      bio: "Pending artist",
      city: "Jaipur",
      verification_status: "PENDING",
      is_available: false,
    });

    let threwError = false;
    try {
      await ArtistService.getArtistDetailsById(tempPendingProfile.id);
    } catch (err) {
      threwError = true;
      assert(err.message.includes("not available or pending verification"), "Correct 404 message for pending artist");
    }
    assert(threwError, "Public directory access blocked for pending artist");
  });

  console.log("\n=======================================================");
  console.log(`  SUMMARY: ${passedSuites}/${totalSuites} TESTS PASSED`);
  console.log("=======================================================\n");

  assert.equal(passedSuites, totalSuites, "All test suites must pass 100%");
}

runArtistPersistentLoginOnboardingFlowTest()
  .then(() => {
    console.log("All Artist Persistent Onboarding & Direct Dashboard flow tests executed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
