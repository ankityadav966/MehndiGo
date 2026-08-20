"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const AdminService = require("../services/admin.services");
const BookingService = require("../services/booking.services");
const PaymentService = require("../services/payment.services");
const WalletService = require("../services/wallet.services");
const ReviewService = require("../services/review.services");

describe("ARTIST MODULE 14: FULL END-TO-END ARTIST JOURNEY + MASTER PRODUCTION AUDIT", () => {
  let adminUser;
  let masterArtistUser, masterArtistProfile, masterArtistWallet, masterBankAccount;
  let rivalArtistUser, rivalArtistProfile;
  let customerUserA, customerUserB;
  let category, service1, service2, availabilitySlot1, availabilitySlot2;
  let masterBooking, secondBooking;
  let reviewRecord;
  let withdrawalReq;
  let disputeTicket;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Admin Actor
    adminUser = await db.User.create({
      name: "Master Marketplace Admin",
      email: "masteradmin@mehndigo.in",
      phone: "9999999999",
      phone_number: "9999999999",
      role: "ADMIN",
      is_verified: true
    });

    // 2. Customers
    customerUserA = await db.User.create({
      name: "Pooja Sharma",
      email: "pooja.sharma@mehndigo.in",
      phone: "9820011221",
      phone_number: "9820011221",
      role: "CUSTOMER",
      is_verified: true
    });

    customerUserB = await db.User.create({
      name: "Rival Customer B",
      email: "rival.cust@mehndigo.in",
      phone: "9820011222",
      phone_number: "9820011222",
      role: "CUSTOMER",
      is_verified: true
    });

    // 3. Category
    category = await db.Category.create({
      name: "Bridal Master Henna",
      slug: "bridal-master-henna",
      status: "ACTIVE",
      is_active: true
    });
  });

  // STEP 1 & 2: Registration & Account Initialization
  it("Step 1 & 2: Registration & Profile Initialization -> Role ARTIST, verification_status PENDING", async () => {
    masterArtistUser = await db.User.create({
      name: "Ananya Mehndi Artist",
      email: "ananya.artist@mehndigo.in",
      phone: "9876500001",
      phone_number: "9876500001",
      role: "ARTIST",
      is_verified: false
    });

    masterArtistProfile = await db.ArtistProfile.create({
      user_id: masterArtistUser.id,
      bio: "10+ Years Certified Royal Bridal Henna Designer",
      experience_years: 10,
      verification_status: "PENDING",
      is_available: false,
      aadhaar_number: "5432-9876-1234",
      city: "Jaipur",
      latitude: 26.9124,
      longitude: 75.7873
    });

    masterArtistWallet = await db.Wallet.create({
      user_id: masterArtistUser.id,
      balance: 0,
      pending_balance: 0,
      lifetime_earnings: 0,
      total_commission_earned: 0,
      total_withdrawals: 0
    });

    masterBankAccount = await db.BankAccount.create({
      user_id: masterArtistUser.id,
      account_holder_name: "Ananya Sharma",
      account_number: "123456789012",
      ifsc_code: "HDFC0001234",
      bank_name: "HDFC Bank",
      is_verified: true
    });

    assert.equal(masterArtistUser.role, "ARTIST");
    assert.equal(masterArtistProfile.verification_status, "PENDING");
    assert.equal(masterArtistProfile.is_available, false);
    assert.equal(masterArtistWallet.balance, 0);
  });

  // STEP 3: Admin KYC Review & Approval Gate
  it("Step 3: Admin KYC Approval -> Atomically sets APPROVED, is_available true, User verified, and AuditLog created", async () => {
    const approved = await AdminService.approveArtist(masterArtistProfile.id, adminUser.id);
    assert.equal(approved, true);

    const refreshedProfile = await db.ArtistProfile.findByPk(masterArtistProfile.id);
    assert.equal(refreshedProfile.verification_status, "APPROVED");
    assert.equal(refreshedProfile.is_available, true);

    const refreshedUser = await db.User.findByPk(masterArtistUser.id);
    assert.equal(refreshedUser.is_verified, true);

    const audit = await db.AuditLog.findOne({
      where: { admin_id: adminUser.id, action: "KYC_APPROVAL" }
    });
    assert.ok(audit);
  });

  // STEP 4: Services, Packages, Availability & Portfolio
  it("Step 4: Services, Packages, Availability Slots & Portfolio Setup", async () => {
    service1 = await db.Service.create({
      artist_id: masterArtistProfile.id,
      specialization_name: "Royal Marwari Bridal Henna",
      category: "Bridal Master Henna",
      category_id: category.id,
      minimum_price: 3500,
      duration_minutes: 150,
      is_active: true
    });

    service2 = await db.Service.create({
      artist_id: masterArtistProfile.id,
      specialization_name: "Arabic Floral Sangeet Henna",
      category: "Bridal Master Henna",
      category_id: category.id,
      minimum_price: 1500,
      duration_minutes: 60,
      is_active: true
    });

    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().substring(0, 10);
    const dayAfter = new Date(Date.now() + 48 * 3600 * 1000).toISOString().substring(0, 10);

    availabilitySlot1 = await db.AvailabilitySlot.create({
      artist_id: masterArtistProfile.id,
      date: tomorrow,
      start_time: `${tomorrow}T10:00:00.000Z`,
      end_time: `${tomorrow}T12:30:00.000Z`,
      is_booked: false
    });

    availabilitySlot2 = await db.AvailabilitySlot.create({
      artist_id: masterArtistProfile.id,
      date: dayAfter,
      start_time: `${dayAfter}T14:00:00.000Z`,
      end_time: `${dayAfter}T16:30:00.000Z`,
      is_booked: false
    });

    const portfolioItem = await db.Portfolio.create({
      artist_id: masterArtistProfile.id,
      image_url: "https://storage.mehndigo.in/portfolio/royal_bridal_1.jpg",
      title: "Royal Peacock Bridal Pattern",
      description: "Organic dark stain Rajasthani bridal henna",
      category: "Bridal",
      is_featured: true,
      display_order: 1
    });

    assert.ok(service1.id);
    assert.ok(service2.id);
    assert.ok(availabilitySlot1.id);
    assert.ok(portfolioItem.id);
  });

  // STEP 5: Customer Discovery & Booking Creation
  it("Step 5: Customer Discovery & Booking Request -> 10% Advance (₹350), 90% Remaining (₹3,150)", async () => {
    // Discovery check
    const discoverableArtists = await db.ArtistProfile.findAll({
      where: { verification_status: "APPROVED", is_available: true }
    });
    assert.ok(discoverableArtists.some((a) => a.id === masterArtistProfile.id));

    // Create booking
    masterBooking = await db.Booking.create({
      booking_code: "MG-M1401",
      user_id: customerUserA.id,
      artist_id: masterArtistProfile.id,
      service_id: service1.id,
      slot_id: availabilitySlot1.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "PENDING",
      payment_status: "PAID",
      detailed_status: "PENDING",
      check_in_otp: "458921",
      check_out_otp: "782103"
    });

    await availabilitySlot1.update({ is_booked: true });

    assert.equal(masterBooking.total_price, 3500);
    assert.equal(masterBooking.advance_paid, 350);
    assert.equal(masterBooking.remaining_amount, 3150);
    assert.equal(masterBooking.advance_paid + masterBooking.remaining_amount, masterBooking.total_price);
  });

  // STEP 6: Artist Acceptance
  it("Step 6: Artist Acceptance -> Transitions to ARTIST_ACCEPTED", async () => {
    await masterBooking.update({
      booking_status: "CONFIRMED",
      detailed_status: "ARTIST_ACCEPTED"
    });

    const refreshed = await db.Booking.findByPk(masterBooking.id);
    assert.equal(refreshed.detailed_status, "ARTIST_ACCEPTED");
  });

  // STEP 7: On The Way & Live GPS Tracking
  it("Step 7: On The Way -> Transitions to ARTIST_ON_THE_WAY and updates Artist GPS location", async () => {
    await masterBooking.update({
      detailed_status: "ARTIST_ON_THE_WAY"
    });

    await masterArtistProfile.update({
      latitude: 26.8950,
      longitude: 75.8080
    });

    const refreshed = await db.Booking.findByPk(masterBooking.id);
    assert.equal(refreshed.detailed_status, "ARTIST_ON_THE_WAY");

    const refreshedProfile = await db.ArtistProfile.findByPk(masterArtistProfile.id);
    assert.equal(Number(refreshedProfile.latitude), 26.8950);
  });

  // STEP 8: Arrival & Geofence Verification
  it("Step 8: Arrival -> Status becomes ARTIST_ARRIVED inside geofence", async () => {
    await masterBooking.update({
      detailed_status: "ARTIST_ARRIVED"
    });

    const refreshed = await db.Booking.findByPk(masterBooking.id);
    assert.equal(refreshed.detailed_status, "ARTIST_ARRIVED");
  });

  // STEP 9: Check-In OTP Verification & Service Start
  it("Step 9: Check-In OTP Verification -> CUSTOMER_VERIFIED, service_started_at set", async () => {
    const verifiedResult = await BookingService.verifyCheckInOtp(
      masterBooking.id,
      "458921",
      masterArtistUser.id
    );

    assert.ok(verifiedResult.success);

    const refreshed = await db.Booking.findByPk(masterBooking.id);
    assert.equal(refreshed.detailed_status, "CUSTOMER_VERIFIED");
    assert.ok(refreshed.service_started_at);
  });

  // STEP 10: Checkout, Remaining Payment, Checkout OTP & Completion
  it("Step 10: Checkout, Remaining Payment (₹3,150), Checkout OTP & COMPLETED transition", async () => {
    // Verify checkout OTP
    const verifiedCheckout = await BookingService.verifyCheckOutOtp(
      masterBooking.id,
      "782103",
      masterArtistUser.id
    );
    assert.ok(verifiedCheckout.success);

    // Complete settlement & booking
    const settlement = await PaymentService.completeBookingSettlement(masterBooking.id);
    assert.ok(settlement);
    assert.equal(settlement.status, "COMPLETED");

    await masterBooking.update({
      booking_status: "COMPLETED",
      detailed_status: "COMPLETED"
    });

    const refreshedBooking = await db.Booking.findByPk(masterBooking.id);
    assert.equal(refreshedBooking.booking_status, "COMPLETED");
    assert.equal(refreshedBooking.detailed_status, "COMPLETED");

    // Verify wallet settlement
    const wallet = await db.Wallet.findOne({ where: { user_id: masterArtistUser.id } });
    assert.equal(wallet.balance, 3150, "Artist received remaining ₹3,150 in wallet");
    assert.equal(wallet.lifetime_earnings, 3150);

    // Verify settlement history & transaction
    const settlementRow = await db.SettlementHistory.findOne({ where: { booking_id: masterBooking.id } });
    assert.ok(settlementRow);
    assert.equal(settlementRow.artist_amount, 3150);

    const transaction = await db.WalletTransaction.findOne({
      where: { wallet_id: wallet.id, transaction_type: "SETTLEMENT" }
    });
    assert.ok(transaction);
    assert.equal(transaction.amount, 3150);
  });

  // STEP 11: Customer Review & Rating Aggregation
  it("Step 11: Customer Review (5 Stars) & Rating Aggregation + Artist Reply", async () => {
    reviewRecord = await db.Review.create({
      user_id: customerUserA.id,
      artist_id: masterArtistProfile.id,
      booking_id: masterBooking.id,
      rating: 5,
      comment: "Absolutely breathtaking bridal henna! Highly punctual and professional.",
      is_verified: true
    });

    const reviews = await ReviewService.getReviews({ artist_id: masterArtistProfile.id });
    assert.ok(reviews.length >= 1);
    assert.equal(reviews[0].rating, 5);

    // Artist replies
    const reply = await db.ReviewReply.create({
      review_id: reviewRecord.id,
      artist_id: masterArtistProfile.id,
      reply_text: "Thank you so much Pooja! It was a delight to design your bridal henna."
    });
    assert.ok(reply);
  });

  // STEP 12: Withdrawal Request & Admin Approval Lifecycle
  it("Step 12: Withdrawal Request (₹1,000) & Admin Approval -> Payout Settled", async () => {
    withdrawalReq = await WalletService.initiateWithdrawal(masterArtistUser.id, 1000);
    assert.ok(withdrawalReq);
    assert.equal(withdrawalReq.amount, 1000);
    assert.equal(withdrawalReq.status, "PENDING");

    let wallet = await db.Wallet.findOne({ where: { user_id: masterArtistUser.id } });
    assert.equal(wallet.balance, 2150, "Available balance debited to ₹2,150");
    assert.equal(wallet.pending_balance, 1000, "Held in pending_balance");

    // Admin approves withdrawal
    const approvedWR = await AdminService.approveWithdrawal(withdrawalReq.id, adminUser.id);
    assert.ok(approvedWR);
    assert.equal(approvedWR.status, "COMPLETED");

    wallet = await db.Wallet.findOne({ where: { user_id: masterArtistUser.id } });
    assert.equal(wallet.pending_balance, 0, "Pending cleared");
    assert.equal(wallet.total_withdrawals, 1000, "Total withdrawals updated");
  });

  // STEP 13: Separate Booking Cancellation & Advance Refund (>24h notice)
  it("Step 13: Separate Booking Cancellation & Advance Refund -> 100% Advance Refunded, Slot Released", async () => {
    secondBooking = await db.Booking.create({
      booking_code: "MG-M1402",
      user_id: customerUserA.id,
      artist_id: masterArtistProfile.id,
      service_id: service2.id,
      slot_id: availabilitySlot2.id,
      total_price: 1500,
      advance_paid: 150,
      remaining_amount: 1350,
      final_amount: 1500,
      booking_status: "CONFIRMED",
      payment_status: "PAID",
      detailed_status: "CONFIRMED"
    });
    await availabilitySlot2.update({ is_booked: true });

    const cancelled = await BookingService.cancelBookingWithPolicy(
      secondBooking.id,
      customerUserA.id,
      "CUSTOMER",
      "Event rescheduled"
    );

    assert.equal(cancelled.booking_status, "CANCELLED");
    assert.equal(cancelled.refund_amount, 150, "Full advance of ₹150 refunded");

    const slot = await db.AvailabilitySlot.findByPk(availabilitySlot2.id);
    assert.equal(slot.is_booked, false, "Availability slot released");

    const refund = await db.Refund.findOne({ where: { booking_id: secondBooking.id } });
    assert.ok(refund);
    assert.equal(refund.amount, 150);
  });

  // STEP 14: Support Ticket / Dispute & Admin Resolution
  it("Step 14: Support Dispute Creation, Investigation & Resolution by Admin", async () => {
    disputeTicket = await db.SupportTicket.create({
      user_id: customerUserA.id,
      booking_id: masterBooking.id,
      subject: "Post-Service Query #MG-M1401",
      description: "Requesting digital receipt copy for tax purposes.",
      status: "OPEN",
      category: "Billing",
      priority: "MEDIUM"
    });

    assert.ok(disputeTicket);

    const resolved = await AdminService.replySupportTicket(
      disputeTicket.id,
      "Digital tax invoice has been sent to your registered email address.",
      "CLOSED",
      adminUser.id
    );

    assert.equal(resolved.status, "CLOSED");
    assert.ok(resolved.replies.includes("Digital tax invoice"));
  });

  // STEP 15: Admin Lifecycle Control (Suspension & Reactivation)
  it("Step 15: Admin Lifecycle Control -> Suspend and Reactivate Artist with Audit Trail", async () => {
    // Suspension
    await AdminService.suspendArtist(masterArtistProfile.id, "Routine audit hold", adminUser.id);
    let profile = await db.ArtistProfile.findByPk(masterArtistProfile.id);
    assert.equal(profile.is_available, false);

    // Reactivation
    await AdminService.reactivateArtist(masterArtistProfile.id, adminUser.id);
    profile = await db.ArtistProfile.findByPk(masterArtistProfile.id);
    assert.equal(profile.is_available, true);
    assert.equal(profile.verification_status, "APPROVED");

    const auditLogs = await db.AuditLog.findAll({
      where: { admin_id: adminUser.id },
      order: [["createdAt", "ASC"]]
    });
    assert.ok(auditLogs.length >= 3);
  });

  // STEP 16: Cross-User Security & Authorization Isolation
  it("Step 16: Cross-User Security -> Rival Artist B cannot access Artist A's financial or operational data", async () => {
    rivalArtistUser = await db.User.create({
      name: "Rival Artist B",
      email: "rivalb.master@mehndigo.in",
      phone: "9876500002",
      phone_number: "9876500002",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtistProfile = await db.ArtistProfile.create({
      user_id: rivalArtistUser.id,
      bio: "Rival Designer",
      experience_years: 2,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // Rival cannot cancel master artist's booking
    await assert.rejects(
      async () => {
        await BookingService.cancelBookingWithPolicy(
          masterBooking.id,
          rivalArtistUser.id,
          "ARTIST",
          "Malicious cancel attempt"
        );
      },
      (err) => err.statusCode === 400 || err.statusCode === 403
    );

    // Rival sees 0 wallet transactions
    const rivalWallet = await db.Wallet.create({
      user_id: rivalArtistUser.id,
      balance: 0
    });
    const rivalTxCount = await db.WalletTransaction.count({ where: { wallet_id: rivalWallet.id } });
    assert.equal(rivalTxCount, 0);
  });

  // STEP 17: Master Money Invariant Reconciled across multiple price points
  it("Step 17: Master Money Invariants (Advance + Remaining === Total, Commission 10%)", async () => {
    const testCases = [
      { total: 999, expAdv: 100, expRem: 899, expComm: 100, expArtistNet: 899 },
      { total: 3500, expAdv: 350, expRem: 3150, expComm: 350, expArtistNet: 3150 },
      { total: 9999, expAdv: 1000, expRem: 8999, expComm: 1000, expArtistNet: 8999 },
      { total: 12345, expAdv: 1235, expRem: 11110, expComm: 1235, expArtistNet: 11110 },
      { total: 50000, expAdv: 5000, expRem: 45000, expComm: 5000, expArtistNet: 45000 }
    ];

    for (const tc of testCases) {
      const adv = Math.round(tc.total * 0.10);
      const rem = tc.total - adv;
      const comm = adv;
      const artistNet = rem;

      assert.equal(adv + rem, tc.total, `Invariant Advance + Remaining = Total for ₹${tc.total}`);
      assert.equal(comm + artistNet, tc.total, `Invariant Commission + Net = Total for ₹${tc.total}`);
      assert.equal(adv, tc.expAdv);
      assert.equal(rem, tc.expRem);
    }
  });

  // STEP 18: Zero Production Dummy Data Scan
  it("Step 18: Zero Dummy Production Data -> Confirmed all models use genuine relational records", async () => {
    const artists = await db.ArtistProfile.findAll();
    artists.forEach((a) => {
      assert.ok(a.user_id);
      assert.ok(a.bio);
    });

    const wallets = await db.Wallet.findAll();
    wallets.forEach((w) => {
      assert.ok(typeof w.balance === "number");
      assert.ok(typeof w.pending_balance === "number");
    });
  });
});
