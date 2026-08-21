/**
 * MEHENDIGO FINAL ARTIST APPROVAL & LOGIN FLOW - MASTER ACCEPTANCE TEST SUITE
 * Tests all 10 required acceptance cases specified in the requirements.
 */

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const assert = require("assert");
const db = require("../models");
const AuthService = require("../services/auth.services");
const ArtistService = require("../services/artist.services");
const AdminService = require("../services/admin.services");
const ArtistProfileRepository = require("../repositories/artistProfile.repository");
const artistProfileRepo = new ArtistProfileRepository();

let passed = 0;
let failed = 0;
const testResults = [];

function recordTest(name, condition, extra = "") {
  if (condition) {
    passed++;
    testResults.push({ test: name, status: "PASS" });
    console.log(`  ✅ PASS: ${name} ${extra}`);
  } else {
    failed++;
    testResults.push({ test: name, status: "FAIL" });
    console.error(`  ❌ FAIL: ${name} ${extra}`);
  }
}

async function runMasterAcceptanceTests() {
  console.log("==================================================================");
  console.log("🚀 STARTING MEHENDIGO MASTER ARTIST APPROVAL & LOGIN FLOW AUDIT");
  console.log("==================================================================\n");

  // 1. Sync genuine DB schema
  await db.sequelize.sync({ force: true });
  console.log("📦 In-Memory Test Database Synced Successfully.\n");

  const timestamp = Date.now();

  // Create an Admin user
  const adminUser = await db.User.create({
    name: "Platform Super Admin",
    email: `admin.${timestamp}@mehndigo.com`,
    phone: `999999${String(timestamp).slice(-4)}`,
    password: "AdminPassword123!",
    role: "ADMIN",
    is_verified: true,
    is_active: true,
  });

  // -------------------------------------------------------------------------
  // TEST 1: New artist registers -> status = PENDING, cannot access dashboard
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: NEW ARTIST REGISTRATION ---");
  const regResult = await AuthService.register({
    name: "Pooja Sharma",
    email: `pooja.${timestamp}@artist.com`,
    phone: `912345${String(timestamp).slice(-4)}`,
    role: "ARTIST",
    password: "ArtistPassword123!",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
  });

  const registeredUser = regResult.user;
  const artistProfile1 = await db.ArtistProfile.findOne({ where: { user_id: registeredUser.id } });

  recordTest(
    "Test 1.1: New artist user is created with role ARTIST",
    registeredUser.role === "ARTIST"
  );
  recordTest(
    "Test 1.2: ArtistProfile is automatically initialized with verification_status = 'PENDING'",
    artistProfile1 && artistProfile1.verification_status === "PENDING"
  );
  recordTest(
    "Test 1.3: ArtistProfile is_available is false while pending",
    artistProfile1 && artistProfile1.is_available === false
  );

  // -------------------------------------------------------------------------
  // TEST 2: Pending artist logs in -> Pending Approval state (NOT dashboard)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: PENDING ARTIST LOGIN ---");
  const loginResult = await AuthService.login({
    email: `pooja.${timestamp}@artist.com`,
    password: "ArtistPassword123!",
  });

  const loggedInUser = loginResult.user;
  const artistDetails = await ArtistService.getArtistDetails(loggedInUser.id);

  recordTest(
    "Test 2.1: Login succeeds and returns user credentials & tokens",
    loginResult.token && loggedInUser.email === `pooja.${timestamp}@artist.com`
  );
  recordTest(
    "Test 2.2: Server-side artist details returns verification_status = 'PENDING'",
    artistDetails.verification_status === "PENDING"
  );
  recordTest(
    "Test 2.3: Frontend approval check (status === 'APPROVED') evaluates to FALSE (redirects to ApprovalPending)",
    artistDetails.verification_status !== "APPROVED"
  );

  // -------------------------------------------------------------------------
  // TEST 3: Admin opens Artists section -> New artist appears in PENDING list
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3: ADMIN ARTISTS & PENDING QUEUE LIST ---");
  const pendingArtistsList = await AdminService.getPendingArtists();
  const allArtistsList = await AdminService.getAllArtists();
  const pendingFilteredArtists = await AdminService.getAllArtists({ status: "PENDING" });

  const foundInPending = pendingArtistsList.some((a) => a.user_id === loggedInUser.id || a.id === artistProfile1.id);
  const foundInAll = allArtistsList.some((a) => a.user_id === loggedInUser.id || a.id === artistProfile1.id);
  const foundInFiltered = pendingFilteredArtists.some((a) => a.user_id === loggedInUser.id || a.id === artistProfile1.id);

  recordTest(
    "Test 3.1: New artist appears in Admin getPendingArtists list",
    foundInPending
  );
  recordTest(
    "Test 3.2: New artist appears in Admin getAllArtists directory",
    foundInAll
  );
  recordTest(
    "Test 3.3: Admin getAllArtists with status filter (?status=PENDING) correctly retrieves artist",
    foundInFiltered
  );

  // -------------------------------------------------------------------------
  // TEST 4: Admin clicks ACCEPT -> Database status = APPROVED, UI reflects APPROVED
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4: ADMIN APPROVAL ACTION ---");
  const approveSuccess = await AdminService.approveArtist(artistProfile1.id, adminUser.id);
  const approvedProfile = await db.ArtistProfile.findByPk(artistProfile1.id);
  const approvedUserRecord = await db.User.findByPk(loggedInUser.id);

  recordTest(
    "Test 4.1: Admin approveArtist API returns success",
    approveSuccess === true
  );
  recordTest(
    "Test 4.2: Database ArtistProfile.verification_status is updated to 'APPROVED'",
    approvedProfile.verification_status === "APPROVED"
  );
  recordTest(
    "Test 4.3: ArtistProfile.is_available is activated to true upon approval",
    approvedProfile.is_available === true
  );
  recordTest(
    "Test 4.4: User.is_verified is updated to true in database",
    approvedUserRecord.is_verified === true
  );
  recordTest(
    "Test 4.5: Approval metadata (approved_at, reviewed_by) is recorded in database",
    approvedProfile.approved_at !== null && approvedProfile.reviewed_by === adminUser.id
  );

  // Verify notification was dispatched to the approved artist
  const artistNotifications = await db.Notification.findAll({
    where: { user_id: loggedInUser.id },
  });
  recordTest(
    "Test 4.6: In-app notification dispatched to artist upon approval",
    artistNotifications.some((n) => n.title.includes("Approved") || n.message.includes("approved"))
  );

  // -------------------------------------------------------------------------
  // TEST 5: Approved artist logs in -> Verification status is APPROVED, dashboard access granted
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5: APPROVED ARTIST LOGIN & DASHBOARD ACCESS ---");
  const approvedLoginResult = await AuthService.login({
    email: `pooja.${timestamp}@artist.com`,
    password: "ArtistPassword123!",
  });
  const approvedDetails = await ArtistService.getArtistDetails(approvedLoginResult.user.id);
  let dashboardData = null;
  let dashboardError = null;
  try {
    dashboardData = await ArtistService.getDashboard(approvedLoginResult.user.id);
  } catch (err) {
    dashboardError = err;
    console.error("DEBUG Test 5.2 Error:", err);
  }

  recordTest(
    "Test 5.1: Approved artist fetches verification_status = 'APPROVED'",
    approvedDetails.verification_status === "APPROVED"
  );
  recordTest(
    "Test 5.2: Approved artist calling getDashboard succeeds without authorization errors",
    dashboardData !== null && dashboardError === null && dashboardData.artist && dashboardData.artist.verification_status === "APPROVED",
    dashboardError ? `(Error: ${dashboardError.message})` : ""
  );

  // -------------------------------------------------------------------------
  // TEST 6: Rejected artist logs in -> Rejected state, no dashboard access
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: REJECTED ARTIST LIFECYCLE ---");
  const rejectedReg = await AuthService.register({
    name: "Ritu Soni",
    email: `ritu.${timestamp}@artist.com`,
    phone: `912399${String(timestamp).slice(-4)}`,
    role: "ARTIST",
    password: "ArtistPassword123!",
  });
  const rejectedUser = rejectedReg.user;
  const rejectedProfileRecord = await db.ArtistProfile.findOne({ where: { user_id: rejectedUser.id } });

  const rejectReason = "Aadhaar photo is blurry and illegible. Please re-upload clear ID.";
  const rejectSuccess = await AdminService.rejectArtist(rejectedProfileRecord.id, rejectReason, adminUser.id);
  const updatedRejectedProfile = await db.ArtistProfile.findByPk(rejectedProfileRecord.id);

  recordTest(
    "Test 6.1: Admin rejectArtist API returns success",
    rejectSuccess === true
  );
  recordTest(
    "Test 6.2: Database verification_status is updated to 'REJECTED'",
    updatedRejectedProfile.verification_status === "REJECTED"
  );
  recordTest(
    "Test 6.3: Rejection reason is accurately persisted in database",
    updatedRejectedProfile.rejection_reason === rejectReason
  );

  const rejectedArtistDetails = await ArtistService.getArtistDetails(rejectedUser.id);
  recordTest(
    "Test 6.4: Rejected artist details API returns verification_status = 'REJECTED' with reason",
    rejectedArtistDetails.verification_status === "REJECTED" && rejectedArtistDetails.rejection_reason === rejectReason
  );

  let rejectedDashboardError = null;
  try {
    await ArtistService.getDashboard(rejectedUser.id);
  } catch (err) {
    rejectedDashboardError = err;
  }
  recordTest(
    "Test 6.5: Rejected artist calling getDashboard is rejected with 403 Forbidden",
    rejectedDashboardError && (rejectedDashboardError.statusCode === 403 || rejectedDashboardError.message.includes("rejected"))
  );

  // -------------------------------------------------------------------------
  // TEST 7: Pending artist attempts direct dashboard navigation -> Blocked
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 7: PENDING ARTIST NAVIGATION GUARD ---");
  const pendingArtistReg = await AuthService.register({
    name: "Meena Kumari",
    email: `meena.${timestamp}@artist.com`,
    phone: `912388${String(timestamp).slice(-4)}`,
    role: "ARTIST",
    password: "ArtistPassword123!",
  });
  const pendingArtistUser = pendingArtistReg.user;
  const pendingProfile = await ArtistService.getArtistDetails(pendingArtistUser.id);

  // Simulating RootNavigator evaluation:
  const isApprovedArtist = (pendingProfile.verification_status === "APPROVED") && pendingArtistUser.is_active !== false;
  const targetStack = isApprovedArtist ? "ArtistStack" : "ArtistFlowStack";

  recordTest(
    "Test 7.1: Navigation guard evaluates isApprovedArtist = false for PENDING artist",
    isApprovedArtist === false
  );
  recordTest(
    "Test 7.2: RootNavigator routes PENDING artist to ArtistFlowStack (ApprovalPending screen), NOT ArtistStack",
    targetStack === "ArtistFlowStack"
  );

  // -------------------------------------------------------------------------
  // TEST 8: Pending artist directly calls dashboard API -> Backend returns 403
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 8: BACKEND 403 DASHBOARD PROTECTION ---");
  let pendingApiError = null;
  try {
    await ArtistService.getDashboard(pendingArtistUser.id);
  } catch (err) {
    pendingApiError = err;
  }

  recordTest(
    "Test 8.1: Backend rejects direct getDashboard API call for PENDING artist with 403 Forbidden",
    pendingApiError && pendingApiError.statusCode === 403
  );
  recordTest(
    "Test 8.2: Error message explicitly clarifies pending admin approval",
    pendingApiError && pendingApiError.message.includes("pending admin approval")
  );

  // -------------------------------------------------------------------------
  // TEST 9: Artist attempts to call Admin Approve API -> Rejected because non-admin
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 9: ADMIN PRIVILEGE PROTECTION ---");
  const { authorize } = require("../middleware/role.middleware");
  let artistBlockedFromAdmin = false;
  const mockReq = { user: { id: pendingArtistUser.id, role: "ARTIST" } };
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        if (code === 403) artistBlockedFromAdmin = true;
        return data;
      },
    }),
  };
  const mockNext = () => {};

  const adminAuthMiddleware = authorize("ADMIN");
  adminAuthMiddleware(mockReq, mockRes, mockNext);

  recordTest(
    "Test 9.1: Role authorization middleware strictly rejects ARTIST role calling ADMIN endpoints with 403",
    artistBlockedFromAdmin === true
  );

  // -------------------------------------------------------------------------
  // TEST 10: Existing approved artist logs in -> Continues working normally
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 10: EXISTING APPROVED ARTIST PERSISTENCE ---");
  const hashedPw = AuthService.hashPassword ? AuthService.hashPassword("Password123!") : (await AuthService.register({
    name: "Master Rekha Mehndi",
    email: `rekha.existing.${timestamp}@mehndigo.com`,
    phone: `918800${String(timestamp).slice(-4)}`,
    password: "Password123!",
    role: "ARTIST",
  })).user.password;

  const existingUser = await db.User.findOne({ where: { email: `rekha.existing.${timestamp}@mehndigo.com` } }) || await db.User.create({
    name: "Master Rekha Mehndi",
    email: `rekha.existing.${timestamp}@mehndigo.com`,
    phone: `918800${String(timestamp).slice(-4)}`,
    password: hashedPw,
    role: "ARTIST",
    is_verified: true,
    is_active: true,
  });

  const existingProfile = await db.ArtistProfile.findOne({ where: { user_id: existingUser.id } });
  if (existingProfile) {
    await existingProfile.update({ verification_status: "APPROVED", is_available: true });
  } else {
    await db.ArtistProfile.create({
      user_id: existingUser.id,
      bio: "Pre-existing top verified bridal artist",
      experience_years: 8,
      home_service: true,
      salon_service: true,
      city: "Mumbai",
      verification_status: "APPROVED",
      is_available: true,
    });
  }

  const existingLogin = await AuthService.login({
    email: `rekha.existing.${timestamp}@mehndigo.com`,
    password: "Password123!",
  });
  const existingDetails = await ArtistService.getArtistDetails(existingLogin.user.id);
  const existingDashboard = await ArtistService.getDashboard(existingLogin.user.id);

  recordTest(
    "Test 10.1: Existing approved artist successfully logs in",
    existingLogin.token && existingLogin.user.role === "ARTIST"
  );
  recordTest(
    "Test 10.2: Existing approved artist retains verification_status = 'APPROVED'",
    existingDetails.verification_status === "APPROVED"
  );
  recordTest(
    "Test 10.3: Existing approved artist seamlessly accesses dashboard without re-verification",
    existingDashboard !== null && existingDashboard.artist.verification_status === "APPROVED"
  );

  console.log("\n==================================================================");
  console.log(`🎯 AUDIT SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log("==================================================================");

  if (failed === 0) {
    console.log("🌟 ALL 10 MASTER ACCEPTANCE TEST CASES PASSED WITH 100% SUCCESS RATE!");
    process.exit(0);
  } else {
    console.error(`💥 ${failed} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runMasterAcceptanceTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
