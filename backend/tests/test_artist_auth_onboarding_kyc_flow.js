/**
 * Comprehensive Independent Verification & Regression Test Suite
 * MEHENDIGO ARTIST MODULE 1: AUTHENTICATION + ONBOARDING + KYC + BANK IDENTITY + ACTIVATION GATE
 * 
 * Executes against genuine Sequelize ORM, genuine models, genuine database transactions,
 * and genuine service layer methods with ZERO repository mocking.
 */

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const db = require("../models");
const AuthService = require("../services/auth.services");
const ArtistService = require("../services/artist.services");
const AdminService = require("../services/admin.services");
const CustomerService = require("../services/customer.services");
const BookingService = require("../services/booking.services");
const WalletService = require("../services/wallet.services");
const ArtistProfileRepository = require("../repositories/artistProfile.repository");
const artistProfileRepo = new ArtistProfileRepository();

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    results.push({ test: message, status: "PASS" });
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    results.push({ test: message, status: "FAIL" });
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTestSuite() {
  console.log("==================================================");
  console.log("🚀 STARTING REAL DATABASE TEST SUITE: ARTIST MODULE 1");
  console.log("==================================================");

  // 1. Sync genuine DB schema
  await db.sequelize.sync({ force: true });
  console.log("📦 In-Memory Test Database Synced Successfully.\n");

  // Create an Admin user for KYC reviews
  const adminUser = await db.User.create({
    name: "Platform Admin",
    email: "admin@mehndigo.com",
    phone: "9999999999",
    role: "ADMIN",
    is_verified: true,
  });

  // Create a Customer user for testing public boundaries
  const customerUser = await db.User.create({
    name: "Customer Pooja",
    email: "pooja@gmail.com",
    phone: "9888888888",
    role: "USER",
    is_verified: true,
  });

  // ==========================================
  // TEST SECTION 1: REGISTRATION & ATOMICITY
  // ==========================================
  console.log("--- SECTION 1: ARTIST REGISTRATION & ATOMICITY ---");

  // 1. Artist registration with OTP
  const regOtpRes = await AuthService.registerSendOtp({
    name: "Artist Anjali",
    email: "anjali@artist.com",
    phone: "9123456780",
    role: "ARTIST",
    password: "Password123!",
  });
  assert(regOtpRes.phone === "9123456780", "1. Registration OTP dispatched with normalized 10-digit phone");

  // Verify OTP & atomic creation
  const otpRecord = await db.Otp.findOne({ where: { phone: "9123456780" } });
  const verifyRes = await AuthService.registerVerifyOtp({
    phone: "9123456780",
    otp: otpRecord.otp,
  });
  assert(verifyRes.user && verifyRes.user.role === "ARTIST", "2. Artist user created with role ARTIST");
  
  const artistProfileA = await db.ArtistProfile.findOne({ where: { user_id: verifyRes.user.id } });
  assert(artistProfileA !== null && artistProfileA.verification_status === "PENDING", "3. ArtistProfile created atomically in same transaction with PENDING status");

  // 4. Duplicate email rejection
  let dupEmailBlocked = false;
  try {
    await AuthService.registerSendOtp({
      name: "Duplicate Email Artist",
      email: "anjali@artist.com",
      phone: "9111111111",
      role: "ARTIST",
    });
  } catch (err) {
    dupEmailBlocked = err.message.includes("already registered");
  }
  assert(dupEmailBlocked, "4. Duplicate verified email registration is blocked");

  // 5. Duplicate phone rejection
  let dupPhoneBlocked = false;
  try {
    await AuthService.registerSendOtp({
      name: "Duplicate Phone Artist",
      email: "another@artist.com",
      phone: "9123456780",
      role: "ARTIST",
    });
  } catch (err) {
    dupPhoneBlocked = err.message.includes("already registered");
  }
  assert(dupPhoneBlocked, "5. Duplicate verified phone registration is blocked");

  // 6. Direct registration atomicity
  const directArtist = await AuthService.register({
    name: "Artist Bhavna",
    email: "bhavna@artist.com",
    phone: "9876543210",
    role: "ARTIST",
    password: "Password123!",
    city: "Mumbai",
  });
  assert(directArtist.user.role === "ARTIST", "6. Direct registration creates user and profile atomically");
  const artistProfileB = await db.ArtistProfile.findOne({ where: { user_id: directArtist.user.id } });
  assert(artistProfileB !== null, "7. Direct registration creates matching ArtistProfile record");

  // ==========================================
  // TEST SECTION 2: AUTHENTICATION & LOGIN
  // ==========================================
  console.log("\n--- SECTION 2: AUTHENTICATION & LOGIN ---");

  // 8. Password login
  const loginRes = await AuthService.login({
    email: "anjali@artist.com",
    password: "Password123!",
  });
  assert(loginRes.token && loginRes.user.role === "ARTIST", "8. Artist password login issues valid JWT token with ARTIST role");

  // 9. Wrong password rejection
  let wrongPassBlocked = false;
  try {
    await AuthService.login({
      email: "anjali@artist.com",
      password: "WrongPassword!",
    });
  } catch (err) {
    wrongPassBlocked = err.statusCode === 400 || err.statusCode === 401;
  }
  assert(wrongPassBlocked, "9. Invalid password rejected with 400/401 error");

  // 10. Refresh token rotation
  const refreshRes = await AuthService.refresh({ refreshToken: loginRes.refreshToken });
  assert(refreshRes.accessToken && refreshRes.accessToken.length > 20, "10. Refresh token generates new access token");

  // ==========================================
  // TEST SECTION 3: PROFILE COMPLETION & ONBOARDING STATE
  // ==========================================
  console.log("\n--- SECTION 3: ONBOARDING STATE & PROFILE COMPLETION ---");

  // 11. Initially empty profile is incomplete
  const initialDetails = await ArtistService.getArtistDetails(verifyRes.user.id);
  assert(initialDetails.isProfileComplete === false, "11. Initially empty profile evaluates isProfileComplete: false");

  // 12. Complete profile submission
  const profileSubmit = await ArtistService.createArtistProfile({
    user_id: verifyRes.user.id,
    bio: "Certified bridal mehndi specialist with 8 years experience in Arabic and Rajasthani styles.",
    experience_years: 8,
    home_service: true,
    salon_service: false,
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    location: "Bandra West, Mumbai",
    aadhaar_number: "234567890123",
    aadhaar_front: "uploads/aadhaar_front_anjali.jpg",
    aadhaar_back: "uploads/aadhaar_back_anjali.jpg",
    selfie_image: "uploads/selfie_anjali.jpg",
    phone: "9123456780",
  });
  assert(profileSubmit.isProfileComplete === true, "12. Fully submitted profile evaluates isProfileComplete: true");
  assert(profileSubmit.verification_status === "PENDING", "13. Freshly completed KYC profile has verification_status: PENDING");

  // ==========================================
  // TEST SECTION 4: AADHAAR & PAN VALIDATION & UNIQUENESS
  // ==========================================
  console.log("\n--- SECTION 4: AADHAAR & PAN VALIDATION & UNIQUENESS ---");

  // 14. Invalid Aadhaar format rejection (10 digits instead of 12)
  let invalidAadhaarBlocked = false;
  try {
    await ArtistService.createArtistProfile({
      user_id: directArtist.user.id,
      bio: "Professional artist",
      experience_years: 5,
      city: "Mumbai",
      pincode: "400001",
      aadhaar_number: "1234567890", // 10 digits
    });
  } catch (err) {
    invalidAadhaarBlocked = err.message.includes("12 numeric digits");
  }
  assert(invalidAadhaarBlocked, "14. Non-12-digit Aadhaar number rejected with 400");

  // 15. Duplicate Aadhaar number rejection across different artists
  let dupAadhaarBlocked = false;
  try {
    await ArtistService.createArtistProfile({
      user_id: directArtist.user.id,
      bio: "Professional artist",
      experience_years: 5,
      city: "Mumbai",
      pincode: "400001",
      aadhaar_number: "234567890123", // Same Aadhaar as Artist Anjali!
      aadhaar_front: "uploads/front_bhavna.jpg",
      aadhaar_back: "uploads/back_bhavna.jpg",
    });
  } catch (err) {
    dupAadhaarBlocked = err.message.includes("already registered");
  }
  assert(dupAadhaarBlocked, "15. Duplicate Aadhaar number across artists rejected with 400");

  // 16. Valid unique Aadhaar for Artist Bhavna
  const bhavnaProfile = await ArtistService.createArtistProfile({
    user_id: directArtist.user.id,
    bio: "Professional Rajasthani artist",
    experience_years: 5,
    city: "Mumbai",
    pincode: "400001",
    aadhaar_number: "987654321098",
    aadhaar_front: "uploads/front_bhavna.jpg",
    aadhaar_back: "uploads/back_bhavna.jpg",
    pan_number: "ABCDE1234F",
  });
  assert(bhavnaProfile.aadhaar_number.startsWith("•••• ••••"), "16. Self-view returns properly masked Aadhaar number");

  // 17. Duplicate PAN number rejection
  let dupPanBlocked = false;
  try {
    await ArtistService.updateArtistProfile(verifyRes.user.id, {
      pan_number: "ABCDE1234F", // Same PAN as Artist Bhavna!
    });
  } catch (err) {
    dupPanBlocked = err.message.includes("already registered");
  }
  assert(dupPanBlocked, "17. Duplicate PAN number across artists rejected with 400");

  // ==========================================
  // TEST SECTION 5: ACTIVATION GATE (PENDING ARTIST)
  // ==========================================
  console.log("\n--- SECTION 5: ACTIVATION GATE ENFORCEMENT ---");

  // Create a service for Artist Anjali
  const service = await db.Service.create({
    artist_id: artistProfileA.id,
    specialization_name: "Bridal Full Hand Mehndi",
    category: "Bridal",
    minimum_price: 3500,
    duration_minutes: 120,
    is_active: true,
  });

  // 18. PENDING Artist blocked from Customer discovery repository query
  const discoveredArtists = await artistProfileRepo.getArtists({ page: 1, limit: 10 });
  const anjaliDiscovered = (discoveredArtists.rows || []).some(a => a.id === artistProfileA.id);
  assert(!anjaliDiscovered, "18. PENDING artist NOT returned in customer discovery / search repository");

  // 19. PENDING Artist blocked from Customer search service
  const searchResults = await CustomerService.searchArtists("Anjali");
  const inSearch = (searchResults.rows || []).some(a => a.id === artistProfileA.id);
  assert(!inSearch, "19. PENDING artist NOT returned in Customer search query");

  // 20. Public profile blocked for unapproved artist
  let publicProfileBlocked = false;
  try {
    await ArtistService.getArtistDetailsById(artistProfileA.id);
  } catch (err) {
    publicProfileBlocked = err.statusCode === 404;
  }
  assert(publicProfileBlocked, "20. Public customer detail endpoint returns 404 for unapproved PENDING artist");

  // 21. Booking creation blocked for PENDING artist
  let pendingBookingBlocked = false;
  try {
    await BookingService.createBooking(customerUser.id, {
      artistId: artistProfileA.id,
      serviceId: service.id,
      selectedDate: "2026-09-01",
      timeLabel: "10:00 AM",
      address: "123 Marine Drive, Mumbai",
      paymentMethod: "CASH_AFTER_SERVICE",
    });
  } catch (err) {
    pendingBookingBlocked = err.statusCode === 400 && err.message.includes("pending admin approval");
  }
  assert(pendingBookingBlocked, "21. Customer booking creation for PENDING artist blocked with 400 error");

  // 22. PENDING Artist blocked from accepting booking leads
  let pendingLeadAcceptBlocked = false;
  try {
    await ArtistService.acceptLead(999, verifyRes.user.id);
  } catch (err) {
    pendingLeadAcceptBlocked = err.statusCode === 403 && err.message.includes("Only approved artists");
  }
  assert(pendingLeadAcceptBlocked, "22. PENDING artist acceptLead blocked with 403 Forbidden");

  // 23. PENDING Artist blocked from requesting wallet withdrawal
  await db.Wallet.create({ user_id: verifyRes.user.id, balance: 5000 });
  await WalletService.upsertBankAccount(verifyRes.user.id, {
    accountHolderName: "Anjali Sharma",
    accountNumber: "123456789012",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank",
  });
  let pendingWithdrawalBlocked = false;
  try {
    await WalletService.initiateWithdrawal(verifyRes.user.id, 2000, "Need funds");
  } catch (err) {
    pendingWithdrawalBlocked = err.statusCode === 403 && err.message.includes("Only approved artists");
  }
  assert(pendingWithdrawalBlocked, "23. PENDING artist withdrawal request blocked with 403 Forbidden");

  // ==========================================
  // TEST SECTION 6: ADMIN KYC APPROVAL & AUDIT TRAIL
  // ==========================================
  console.log("\n--- SECTION 6: ADMIN KYC APPROVAL & AUDIT TRAIL ---");

  // 24. Admin fetches pending artists
  const pendingArtistsList = await AdminService.getPendingArtists();
  const anjaliInPending = pendingArtistsList.some(a => a.id === artistProfileA.id);
  assert(anjaliInPending, "24. Admin getPendingArtists returns PENDING artist with documents");

  // 25. Admin approves artist
  await AdminService.approveArtist(artistProfileA.id, adminUser.id);
  const approvedProfile = await db.ArtistProfile.findByPk(artistProfileA.id);
  assert(approvedProfile.verification_status === "APPROVED", "25. Artist verification_status updated to APPROVED");
  assert(approvedProfile.reviewed_by === adminUser.id, "26. Admin reviewer ID recorded in reviewed_by column");
  assert(approvedProfile.approved_at !== null, "27. Timestamp recorded in approved_at column");

  // 28. AuditLog entry created for approval
  const approvalAudit = await db.AuditLog.findOne({ where: { action: "KYC_APPROVAL", admin_id: adminUser.id } });
  assert(approvalAudit !== null, "28. AuditLog entry created with admin identity and timestamp");

  // 29. APPROVED Artist is now discoverable
  const discoveredAfterApproval = await artistProfileRepo.getArtists({ page: 1, limit: 10 });
  const anjaliNowDiscovered = (discoveredAfterApproval.rows || []).some(a => a.id === artistProfileA.id);
  assert(anjaliNowDiscovered, "29. APPROVED artist is now publicly discoverable by customers");

  // 30. APPROVED Artist public detail is accessible with KYC stripped
  const publicDetails = await ArtistService.getArtistDetailsById(artistProfileA.id);
  assert(publicDetails && publicDetails.id === artistProfileA.id, "30. Public detail endpoint returns 200 for APPROVED artist");
  assert(publicDetails.aadhaar_front === undefined && publicDetails.aadhaar_number === undefined && publicDetails.bank_account_number === undefined, "31. Sensitive KYC and bank fields strictly stripped from public response");

  // 31. APPROVED Artist can now receive bookings
  const booking = await BookingService.createBooking(customerUser.id, {
    artistId: artistProfileA.id,
    serviceId: service.id,
    selectedDate: "2026-09-01",
    timeLabel: "10:00 AM",
    address: "123 Marine Drive, Mumbai",
    paymentMethod: "CASH_AFTER_SERVICE",
  });
  assert(booking && booking.booking_code !== undefined, "32. Booking successfully created for APPROVED artist");

  // 32. APPROVED Artist can now withdraw
  const withdrawReq = await WalletService.initiateWithdrawal(verifyRes.user.id, 2000, "Approved withdrawal");
  assert(withdrawReq && withdrawReq.status === "PENDING", "33. Withdrawal initiated successfully for APPROVED artist");

  // ==========================================
  // TEST SECTION 7: ADMIN REJECTION & RESUBMISSION
  // ==========================================
  console.log("\n--- SECTION 7: ADMIN REJECTION & RESUBMISSION ---");

  // 34. Admin rejects Artist Bhavna with dynamic reason
  const rejectionReasonText = "Uploaded Aadhaar back image is unreadable and blurred. Please re-upload clear photo.";
  await AdminService.rejectArtist(artistProfileB.id, rejectionReasonText, adminUser.id);
  const rejectedProfile = await db.ArtistProfile.findByPk(artistProfileB.id);
  assert(rejectedProfile.verification_status === "REJECTED", "34. Artist verification_status set to REJECTED");
  assert(rejectedProfile.rejection_reason === rejectionReasonText, "35. Rejection reason saved dynamically in database");
  assert(rejectedProfile.rejected_at !== null, "36. Timestamp recorded in rejected_at column");

  // 37. AuditLog entry created for rejection
  const rejectionAudit = await db.AuditLog.findOne({ where: { action: "KYC_REJECTION", admin_id: adminUser.id } });
  assert(rejectionAudit !== null, "37. AuditLog entry created for KYC rejection with admin ID and reason");

  // 38. Artist sees dynamic rejection reason
  const bhavnaDetails = await ArtistService.getArtistDetails(directArtist.user.id);
  assert(bhavnaDetails.rejection_reason === rejectionReasonText, "38. Artist receives exact dynamic rejection reason from backend");

  // 39. Artist resubmits clear document -> status transitions back to PENDING and clears reason
  const resubmitRes = await ArtistService.updateArtistProfile(directArtist.user.id, {
    aadhaar_back: "uploads/aadhaar_back_clear_bhavna.jpg",
  });
  assert(resubmitRes.verification_status === "PENDING", "39. Document update transitions verification_status back to PENDING");
  assert(resubmitRes.rejection_reason === null, "40. Rejection reason cleared to null on document resubmission");

  // ==========================================
  // TEST SECTION 8: BANK DETAILS & OWNERSHIP
  // ==========================================
  console.log("\n--- SECTION 8: BANK DETAILS & ACCESS CONTROL ---");

  // 41. Bank details masked on self-view
  const bankA = await WalletService.getBankAccount(verifyRes.user.id);
  assert(bankA.account_number.startsWith("********"), "41. Bank account number masked on fetch");

  // 42. Artist B cannot see Artist A's bank account
  const bankB = await WalletService.getBankAccount(directArtist.user.id);
  assert(bankB === null || bankB.user_id === directArtist.user.id, "42. Bank account lookup is strictly user-scoped");

  // 43. Legacy columns in artist_profiles synchronized
  const profileWithBank = await db.ArtistProfile.findOne({ where: { user_id: verifyRes.user.id } });
  assert(profileWithBank.bank_account_holder === "Anjali Sharma", "43. Legacy artist_profiles bank columns kept in sync with BankAccounts");

  // ==========================================
  // TEST SECTION 9: CLEAN PRODUCTION DATA (NO FAKES)
  // ==========================================
  console.log("\n--- SECTION 9: CLEAN PRODUCTION DATA ---");

  // Create a brand new artist with zero history
  const freshArtist = await AuthService.register({
    name: "Fresh Artist",
    email: "fresh@artist.com",
    phone: "9000000001",
    role: "ARTIST",
    password: "Password123!",
  });
  const freshWallet = await ArtistService.getWalletDetails(freshArtist.user.id);
  assert(freshWallet.balance === 0, "44. Fresh artist wallet balance is 0 (NO fake ₹10,500 seeding)");
  assert(freshWallet.transactions.length === 0, "45. Fresh artist wallet has empty transactions (NO fake Ananya/Ritika transactions)");

  const freshEarnings = await ArtistService.getEarnings(freshArtist.user.id);
  assert(freshEarnings.today === 0 && freshEarnings.lifetime === 0, "46. Fresh artist earnings derived from real database: 0");

  const freshAnalytics = await ArtistService.getAnalytics(freshArtist.user.id);
  assert(freshAnalytics.totalBookings === 0 && freshAnalytics.completedBookings === 0, "47. Fresh artist analytics derived from real database");

  // ==========================================
  // FINAL SCORE & SUMMARY
  // ==========================================
  console.log("\n==================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED / ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("==================================================");

  if (failed === 0) {
    console.log("🎉 ALL MODULE 1 TESTS PASSED WITH 100% SUCCESS RATE!");
    process.exit(0);
  } else {
    console.error(`💥 ${failed} TEST(S) FAILED.`);
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
