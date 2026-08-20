process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const assert = require("assert");
const db = require("../models");
const AuthService = require("../services/auth.services");
const ArtistService = require("../services/artist.services");
const AdminService = require("../services/admin.services");

async function runArtistApprovalCheckStatusDashboardTest() {
  console.log("\n=======================================================");
  console.log("  MEHNDIGO ARTIST KYC APPROVAL → CHECK STATUS → DASHBOARD FLOW TEST");
  console.log("=======================================================\n");

  let passedSuites = 0;
  let totalSuites = 0;

  function suite(name, fn) {
    totalSuites++;
    try {
      fn();
      passedSuites++;
      console.log(`  ✓ Suite ${totalSuites}: ${name}`);
    } catch (err) {
      console.error(`  ✗ Suite ${totalSuites} FAILED: ${name}`);
      console.error(err);
    }
  }

  async function asyncSuite(name, fn) {
    totalSuites++;
    try {
      await fn();
      passedSuites++;
      console.log(`  ✓ Suite ${totalSuites}: ${name}`);
    } catch (err) {
      console.error(`  ✗ Suite ${totalSuites} FAILED: ${name}`);
      console.error(err);
    }
  }

  // 1. Sync genuine DB schema
  await db.sequelize.sync({ force: true });

  const timestamp = Date.now();

  // Test setup: Create a new artist user and admin user
  const artistEmail = `artist.kyc.${timestamp}@mehndigo.com`;
  const adminEmail = `admin.kyc.${timestamp}@mehndigo.com`;

  const artistUser = await db.User.create({
    name: "Kavita Verma",
    email: artistEmail,
    phone: `998877${String(timestamp).slice(-4)}`,
    password: "Password@123",
    role: "ARTIST",
    is_verified: false,
    is_active: true,
  });

  const adminUser = await db.User.create({
    name: "Master Admin",
    email: adminEmail,
    phone: `911122${String(timestamp).slice(-4)}`,
    password: "Password@123",
    role: "ADMIN",
    is_verified: true,
    is_active: true,
  });

  // 1. Initial Registration & Profile Submission starts in PENDING
  let artistProfile;
  await asyncSuite("1. New Artist starts with canonical verification_status = 'PENDING'", async () => {
    artistProfile = await ArtistService.createArtistProfile({
      user_id: artistUser.id,
      bio: "Master Bridal Mehndi Artist from Jaipur with 6 years of experience.",
      experience_years: 6,
      home_service: true,
      salon_service: false,
      city: "Jaipur",
      state: "Rajasthan",
      location: "Vaishali Nagar, Jaipur",
      pincode: "302021",
      aadhaar_number: "223344556677",
      pan_number: "ABCDE1234F",
      aadhaar_front: "https://res.cloudinary.com/demo/image/upload/aadhaar_front.jpg",
      aadhaar_back: "https://res.cloudinary.com/demo/image/upload/aadhaar_back.jpg",
      selfie_image: "https://res.cloudinary.com/demo/image/upload/selfie.jpg",
    });

    assert(artistProfile, "Artist profile created");
    assert.equal(artistProfile.verification_status, "PENDING", "Initial verification_status is PENDING");
    assert.equal(artistProfile.is_available, false, "Artist is not available before approval");
    assert.equal(artistUser.is_verified, false, "User is_verified is false before approval");
  });

  // 2. Dashboard access blocked while PENDING
  await asyncSuite("2. Dashboard Access Blocked while verification_status is PENDING", async () => {
    const details = await ArtistService.getArtistDetails(artistUser.id);
    const isApproved = details.verification_status === "APPROVED";
    assert.equal(isApproved, false, "Dashboard access is locked when not approved");
    assert.equal(details.verification_status, "PENDING", "Details API returns PENDING");
  });

  // 3. Frontend Self-Approval Attack Prevention
  await asyncSuite("3. Security: Frontend cannot self-approve via profile updates", async () => {
    // Attempt to update profile with verification_status = APPROVED
    await ArtistService.createArtistProfile({
      user_id: artistUser.id,
      bio: "Hacked bio trying to bypass KYC",
      verification_status: "APPROVED",
      is_available: true,
    });

    const refreshedProfile = await db.ArtistProfile.findOne({ where: { user_id: artistUser.id } });
    assert.equal(refreshedProfile.verification_status, "PENDING", "Backend forces PENDING status on artist profile update");
    assert.equal(refreshedProfile.is_available, false, "Backend prevents artist self-availability toggle before admin review");
  });

  // 4. Admin Reviews and Approves Artist
  await asyncSuite("4. Admin Approval Atomically Updates ArtistProfile, User, and Availability", async () => {
    const approveResult = await AdminService.approveArtist(artistProfile.id, adminUser.id);
    assert.equal(approveResult, true, "Admin approval executed successfully");

    const updatedProfile = await db.ArtistProfile.findByPk(artistProfile.id);
    const updatedUser = await db.User.findByPk(artistUser.id);

    assert.equal(updatedProfile.verification_status, "APPROVED", "ArtistProfile.verification_status = APPROVED");
    assert.equal(updatedProfile.is_available, true, "ArtistProfile.is_available = true");
    assert.equal(updatedProfile.rejection_reason, null, "rejection_reason is cleared");
    assert(updatedProfile.approved_at, "approved_at timestamp is recorded");
    assert.equal(updatedProfile.reviewed_by, adminUser.id, "reviewed_by adminId recorded");

    assert.equal(updatedUser.is_verified, true, "User.is_verified = true");
  });

  // 5. Notification Dispatch on Approval
  await asyncSuite("5. Approval generates real in-app notification for Artist", async () => {
    const notifs = await db.Notification.findAll({
      where: { user_id: artistUser.id },
      order: [["id", "DESC"]]
    });

    assert(notifs.length > 0, "Notification dispatched to artist");
    const approvalNotif = notifs.find(n => n.title.includes("Approved"));
    assert(approvalNotif, "Approval notification found");
    assert(approvalNotif.message.includes("approved"), "Approval message content verified");
  });

  // 6. Audit Log Generation
  await asyncSuite("6. Audit Log created for Admin KYC Approval", async () => {
    const auditLogs = await db.AuditLog.findAll({
      where: { action: "KYC_APPROVAL" },
      order: [["id", "DESC"]]
    });

    assert(auditLogs.length > 0, "AuditLog created");
    const log = auditLogs[0];
    assert.equal(log.admin_id, adminUser.id, "Admin ID logged correctly");
    const details = JSON.parse(log.details);
    assert.equal(details.new_status || details.status, "APPROVED", "Status logged in details");
  });

  // 7. Check Status Screen Detection
  await asyncSuite("7. Artist Check Status Screen detects APPROVED and unlocks Dashboard", async () => {
    const details = await ArtistService.getArtistDetails(artistUser.id);
    const rawStatus = details.verification_status || details.status;
    const canonicalStatus = String(rawStatus).toUpperCase();

    assert.equal(canonicalStatus, "APPROVED", "Check Status API returns APPROVED");
    const artistApproved = canonicalStatus === "APPROVED";
    assert.equal(artistApproved, true, "artistApproved flag set to true");

    // Simulating the navigation transition in ApprovalPendingScreen:
    let currentRoute = "ApprovalPending";
    if (artistApproved) {
      currentRoute = "ArtistStack";
    }
    assert.equal(currentRoute, "ArtistStack", "Navigates directly to ArtistStack (Dashboard)");
  });

  // 8. App Restart Persistence
  await asyncSuite("8. App Restart Simulation: Canonical state persists and opens Dashboard directly", async () => {
    // Fresh call mimicking clean app launch with stored token
    const launchDetails = await ArtistService.getArtistDetails(artistUser.id);
    const isApproved = String(launchDetails.verification_status).toUpperCase() === "APPROVED";
    assert.equal(isApproved, true, "Canonical verification status remains APPROVED across app restarts");
  });

  // 9. Rejection Lifecycle Flow
  const rejectedArtistEmail = `artist.reject.${timestamp}@mehndigo.com`;
  const rejectedUser = await db.User.create({
    name: "Sunita Sharma",
    email: rejectedArtistEmail,
    phone: `911223${String(timestamp).slice(-4)}`,
    password: "Password@123",
    role: "ARTIST",
    is_verified: false,
    is_active: true,
  });

  let rejectedProfile;
  await asyncSuite("9. Admin Rejection Flow: Updates status, saves reason, and blocks dashboard", async () => {
    rejectedProfile = await ArtistService.createArtistProfile({
      user_id: rejectedUser.id,
      bio: "Blurry documents uploaded for testing rejection",
      experience_years: 1,
      city: "Jaipur",
      aadhaar_number: "998877665544",
      pan_number: "ZZZZZ9999Z",
    });

    const rejectionReason = "Aadhaar card copy is blurry and illegible. Please re-upload clear photos.";
    const rejectResult = await AdminService.rejectArtist(rejectedProfile.id, rejectionReason, adminUser.id);
    assert.equal(rejectResult, true, "Admin rejection executed successfully");

    const updatedProfile = await db.ArtistProfile.findByPk(rejectedProfile.id);
    assert.equal(updatedProfile.verification_status, "REJECTED", "verification_status = REJECTED");
    assert.equal(updatedProfile.is_available, false, "is_available = false");
    assert.equal(updatedProfile.rejection_reason, rejectionReason, "Rejection reason saved in database");

    const details = await ArtistService.getArtistDetails(rejectedUser.id);
    assert.equal(details.verification_status, "REJECTED", "Details API returns REJECTED");
    assert.equal(details.rejection_reason, rejectionReason, "Details API returns real rejection reason");

    // Simulating navigation transition on rejection:
    let route = "ApprovalPending";
    if (details.verification_status === "REJECTED") {
      route = "ApprovalRejected";
    }
    assert.equal(route, "ApprovalRejected", "Navigates to ApprovalRejected screen on rejection");
  });

  // 10. Re-Submission after Rejection
  await asyncSuite("10. Artist can update documents and re-enter PENDING queue", async () => {
    await ArtistService.createArtistProfile({
      user_id: rejectedUser.id,
      bio: "Corrected high-resolution documents uploaded",
      aadhaar_front: "https://res.cloudinary.com/demo/image/upload/clear_front.jpg",
      aadhaar_back: "https://res.cloudinary.com/demo/image/upload/clear_back.jpg",
      selfie_image: "https://res.cloudinary.com/demo/image/upload/clear_selfie.jpg",
    });

    const resubmittedProfile = await db.ArtistProfile.findOne({ where: { user_id: rejectedUser.id } });
    assert.equal(resubmittedProfile.verification_status, "PENDING", "Resubmitted profile returns to PENDING");
    assert.equal(resubmittedProfile.rejection_reason, null, "Rejection reason cleared upon resubmission");
  });

  console.log("\n=======================================================");
  console.log(`  RESULT: ${passedSuites}/${totalSuites} SUITES PASSED (${Math.round((passedSuites / totalSuites) * 100)}%)`);
  console.log("=======================================================\n");

  if (passedSuites !== totalSuites) {
    throw new Error(`Only ${passedSuites}/${totalSuites} test suites passed.`);
  }
}

runArtistApprovalCheckStatusDashboardTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
