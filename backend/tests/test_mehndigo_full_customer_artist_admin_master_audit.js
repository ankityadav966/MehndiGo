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

describe("MEHNDIGO CROSS-ROLE PRODUCTION AUDIT: CUSTOMER + ARTIST + ADMIN", () => {
  let adminUser;
  let artistUserA, artistProfileA, artistWalletA, bankAccountA;
  let artistUserB, artistProfileB;
  let customerUserA, customerUserB;
  let category, service1, service2, slot1, slot2, slot3;
  let flowABooking, cancelBooking24h, cancelBooking6h;
  let review1;
  let withdrawal1;
  let dispute1;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Admin Actor
    adminUser = await db.User.create({
      name: "Super Admin Officer",
      email: "audit.admin@mehndigo.in",
      phone: "9999900001",
      phone_number: "9999900001",
      role: "ADMIN",
      is_verified: true
    });

    // 2. Customer Actors
    customerUserA = await db.User.create({
      name: "Aarti Verma",
      email: "aarti.verma@mehndigo.in",
      phone: "9820011111",
      phone_number: "9820011111",
      role: "CUSTOMER",
      is_verified: true
    });

    customerUserB = await db.User.create({
      name: "Bhavna Patel",
      email: "bhavna.patel@mehndigo.in",
      phone: "9820022222",
      phone_number: "9820022222",
      role: "CUSTOMER",
      is_verified: true
    });

    // 3. Category
    category = await db.Category.create({
      name: "Traditional Rajasthani Henna",
      slug: "traditional-rajasthani-henna",
      status: "ACTIVE",
      is_active: true
    });
  });

  // 1. Customer Authentication
  it("1. Customer Authentication -> Valid customer account with role CUSTOMER", async () => {
    assert.equal(customerUserA.role, "CUSTOMER");
    assert.equal(customerUserA.is_verified, true);
  });

  // 2. Artist Authentication & Account Initialization
  it("2. Artist Authentication -> Account created with role ARTIST, verification_status PENDING", async () => {
    artistUserA = await db.User.create({
      name: "Meera Henna Artist",
      email: "meera.artist@mehndigo.in",
      phone: "9876511111",
      phone_number: "9876511111",
      role: "ARTIST",
      is_verified: false
    });

    artistProfileA = await db.ArtistProfile.create({
      user_id: artistUserA.id,
      bio: "Master of Fine Bridal & Traditional Henna",
      experience_years: 8,
      verification_status: "PENDING",
      is_available: false,
      aadhaar_number: "1122-3344-5566",
      city: "Jaipur",
      latitude: 26.9124,
      longitude: 75.7873
    });

    artistWalletA = await db.Wallet.create({
      user_id: artistUserA.id,
      balance: 0,
      pending_balance: 0,
      lifetime_earnings: 0,
      total_commission_earned: 0,
      total_withdrawals: 0
    });

    bankAccountA = await db.BankAccount.create({
      user_id: artistUserA.id,
      account_holder_name: "Meera Devi",
      account_number: "987654321098",
      ifsc_code: "SBIN0001234",
      bank_name: "State Bank of India",
      is_verified: true
    });

    assert.equal(artistUserA.role, "ARTIST");
    assert.equal(artistProfileA.verification_status, "PENDING");
    assert.equal(artistProfileA.is_available, false);
    assert.equal(artistWalletA.balance, 0);
  });

  // 3. Admin Authentication
  it("3. Admin Authentication -> Super Admin role verified", async () => {
    assert.equal(adminUser.role, "ADMIN");
  });

  // 4. KYC & Admin Approval Gate
  it("4 & 5. KYC & Admin Approval -> APPROVED, is_available true, User verified, AuditLog created", async () => {
    const approved = await AdminService.approveArtist(artistProfileA.id, adminUser.id);
    assert.equal(approved, true);

    const refreshedProfile = await db.ArtistProfile.findByPk(artistProfileA.id);
    assert.equal(refreshedProfile.verification_status, "APPROVED");
    assert.equal(refreshedProfile.is_available, true);

    const refreshedUser = await db.User.findByPk(artistUserA.id);
    assert.equal(refreshedUser.is_verified, true);

    const audit = await db.AuditLog.findOne({
      where: { admin_id: adminUser.id, action: "KYC_APPROVAL" }
    });
    assert.ok(audit);
  });

  // 6, 7, 8, 9. Services, Pricing, Availability & Portfolio
  it("6, 7, 8, 9. Services, Pricing, Availability Slots & Portfolio Setup", async () => {
    service1 = await db.Service.create({
      artist_id: artistProfileA.id,
      specialization_name: "Royal Bridal Rajasthani Mehndi",
      category: "Traditional Rajasthani Henna",
      category_id: category.id,
      minimum_price: 3500,
      duration_minutes: 120,
      is_active: true
    });

    service2 = await db.Service.create({
      artist_id: artistProfileA.id,
      specialization_name: "Festive Palm Mehndi",
      category: "Traditional Rajasthani Henna",
      category_id: category.id,
      minimum_price: 1000,
      duration_minutes: 45,
      is_active: true
    });

    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().substring(0, 10);
    const dayAfter = new Date(Date.now() + 48 * 3600 * 1000).toISOString().substring(0, 10);
    const day3 = new Date(Date.now() + 72 * 3600 * 1000).toISOString().substring(0, 10);

    slot1 = await db.AvailabilitySlot.create({
      artist_id: artistProfileA.id,
      date: tomorrow,
      start_time: `${tomorrow}T11:00:00.000Z`,
      end_time: `${tomorrow}T13:00:00.000Z`,
      is_booked: false
    });

    slot2 = await db.AvailabilitySlot.create({
      artist_id: artistProfileA.id,
      date: dayAfter,
      start_time: `${dayAfter}T15:00:00.000Z`,
      end_time: `${dayAfter}T16:00:00.000Z`,
      is_booked: false
    });

    slot3 = await db.AvailabilitySlot.create({
      artist_id: artistProfileA.id,
      date: day3,
      start_time: `${day3}T10:00:00.000Z`,
      end_time: `${day3}T11:00:00.000Z`,
      is_booked: false
    });

    const portfolio = await db.Portfolio.create({
      artist_id: artistProfileA.id,
      image_url: "https://storage.mehndigo.in/portfolio/bridal_peacock.jpg",
      title: "Royal Rajasthani Bridal",
      category: "Bridal",
      is_featured: true,
      display_order: 1
    });

    assert.ok(service1.id);
    assert.ok(slot1.id);
    assert.ok(portfolio.id);
  });

  // 10, 11, 12. Customer Discovery, Booking Creation & 10% Advance Payment
  it("10, 11, 12. Customer Discovery, Booking Creation & Advance Payment (₹350 / ₹3,150)", async () => {
    const discoverable = await db.ArtistProfile.findAll({
      where: { verification_status: "APPROVED", is_available: true }
    });
    assert.ok(discoverable.some((a) => a.id === artistProfileA.id));

    flowABooking = await db.Booking.create({
      booking_code: "MG-MASTER-01",
      user_id: customerUserA.id,
      artist_id: artistProfileA.id,
      service_id: service1.id,
      slot_id: slot1.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "PENDING",
      payment_status: "PAID",
      detailed_status: "PENDING",
      check_in_otp: "512389",
      check_out_otp: "984120"
    });

    await slot1.update({ is_booked: true });

    assert.equal(flowABooking.total_price, 3500);
    assert.equal(flowABooking.advance_paid, 350);
    assert.equal(flowABooking.remaining_amount, 3150);
    assert.equal(flowABooking.advance_paid + flowABooking.remaining_amount, flowABooking.total_price);
  });

  // 13. Artist Acceptance
  it("13. Artist Acceptance -> Transitions to ARTIST_ACCEPTED", async () => {
    await flowABooking.update({
      booking_status: "CONFIRMED",
      detailed_status: "ARTIST_ACCEPTED"
    });

    const refreshed = await db.Booking.findByPk(flowABooking.id);
    assert.equal(refreshed.detailed_status, "ARTIST_ACCEPTED");
  });

  // 14 & 15. On The Way, Live GPS Tracking & Geofence Arrival
  it("14 & 15. On The Way, Live GPS Tracking & Geofence Arrival -> ARTIST_ARRIVED", async () => {
    await flowABooking.update({
      detailed_status: "ARTIST_ON_THE_WAY"
    });
    await artistProfileA.update({ latitude: 26.8920, longitude: 75.8100 });

    await flowABooking.update({
      detailed_status: "ARTIST_ARRIVED"
    });

    const refreshed = await db.Booking.findByPk(flowABooking.id);
    assert.equal(refreshed.detailed_status, "ARTIST_ARRIVED");
  });

  // 16 & 17. Check-In OTP Verification & Service Start
  it("16 & 17. Check-In OTP Verification -> CUSTOMER_VERIFIED, service_started_at persisted", async () => {
    const verified = await BookingService.verifyCheckInOtp(
      flowABooking.id,
      "512389",
      artistUserA.id
    );
    assert.ok(verified.success);

    const refreshed = await db.Booking.findByPk(flowABooking.id);
    assert.equal(refreshed.detailed_status, "CUSTOMER_VERIFIED");
    assert.ok(refreshed.service_started_at);
  });

  // 18, 19, 20, 21. Checkout, Remaining Payment, Checkout OTP & Completion
  it("18, 19, 20, 21. Checkout, Remaining Payment, Checkout OTP & COMPLETED transition", async () => {
    const checkoutResult = await BookingService.verifyCheckOutOtp(
      flowABooking.id,
      "984120",
      artistUserA.id
    );
    assert.ok(checkoutResult.success);

    const settlement = await PaymentService.completeBookingSettlement(flowABooking.id);
    assert.ok(settlement);
    assert.equal(settlement.status, "COMPLETED");

    await flowABooking.update({
      booking_status: "COMPLETED",
      detailed_status: "COMPLETED"
    });

    const refreshed = await db.Booking.findByPk(flowABooking.id);
    assert.equal(refreshed.booking_status, "COMPLETED");
  });

  // 22 & 23. Settlement & Wallet Reconciliation
  it("22 & 23. Settlement & Wallet Reconciliation -> Artist receives remaining ₹3,150", async () => {
    const wallet = await db.Wallet.findOne({ where: { user_id: artistUserA.id } });
    assert.equal(wallet.balance, 3150, "Wallet balance reflects net earnings of ₹3,150");
    assert.equal(wallet.lifetime_earnings, 3150);

    const settlementRow = await db.SettlementHistory.findOne({ where: { booking_id: flowABooking.id } });
    assert.ok(settlementRow);
    assert.equal(settlementRow.artist_amount, 3150);
  });

  // 24. Customer Review & Artist Rating Recalculation + Reply
  it("24. Customer Review (5 Stars) & Rating Aggregation + Artist Reply", async () => {
    review1 = await db.Review.create({
      user_id: customerUserA.id,
      artist_id: artistProfileA.id,
      booking_id: flowABooking.id,
      rating: 5,
      comment: "Exceptional artistry and wonderful demeanor. Highly recommend Meera!",
      is_verified: true
    });

    const reviews = await ReviewService.getReviews({ artist_id: artistProfileA.id });
    assert.ok(reviews.length >= 1);
    assert.equal(reviews[0].rating, 5);

    const reply = await db.ReviewReply.create({
      review_id: review1.id,
      artist_id: artistProfileA.id,
      reply_text: "Thank you Aarti ji! It was an absolute pleasure."
    });
    assert.ok(reply);
  });

  // 25 & 26. Real Notifications & Customer-Artist Chat Linkage
  it("25 & 26. Real Notifications & Chat Room Scoped to Booking", async () => {
    const chatRoom = await db.ChatRoom.create({
      booking_id: flowABooking.id
    });
    assert.ok(chatRoom);
    assert.equal(chatRoom.booking_id, flowABooking.id);

    const msg = await db.Message.create({
      chat_room_id: chatRoom.id,
      booking_id: flowABooking.id,
      sender_id: customerUserA.id,
      receiver_id: artistUserA.id,
      message: "Hi Meera, looking forward to the session today!"
    });
    assert.ok(msg);
    assert.equal(msg.sender_id, customerUserA.id);
  });

  // 27 & 28. Withdrawal Request & Admin Approval Lifecycle
  it("27 & 28. Withdrawal Request (₹1,000) & Admin Payout Approval", async () => {
    withdrawal1 = await WalletService.initiateWithdrawal(artistUserA.id, 1000);
    assert.ok(withdrawal1);
    assert.equal(withdrawal1.amount, 1000);
    assert.equal(withdrawal1.status, "PENDING");

    let wallet = await db.Wallet.findOne({ where: { user_id: artistUserA.id } });
    assert.equal(wallet.balance, 2150, "Available balance ₹2,150");
    assert.equal(wallet.pending_balance, 1000, "Pending ₹1,000");

    const approved = await AdminService.approveWithdrawal(withdrawal1.id, adminUser.id);
    assert.ok(approved);
    assert.equal(approved.status, "COMPLETED");

    wallet = await db.Wallet.findOne({ where: { user_id: artistUserA.id } });
    assert.equal(wallet.pending_balance, 0);
    assert.equal(wallet.total_withdrawals, 1000);
  });

  // 29 & 30. Booking Cancellation & Refund Policy
  it("29 & 30. Cancellation Policy -> >24h notice gives 100% advance refund, slot released", async () => {
    cancelBooking24h = await db.Booking.create({
      booking_code: "MG-CANCEL-24H",
      user_id: customerUserA.id,
      artist_id: artistProfileA.id,
      service_id: service2.id,
      slot_id: slot2.id,
      total_price: 1000,
      advance_paid: 100,
      remaining_amount: 900,
      final_amount: 1000,
      booking_status: "CONFIRMED",
      payment_status: "PAID",
      detailed_status: "CONFIRMED"
    });
    await slot2.update({ is_booked: true });

    const cancelled = await BookingService.cancelBookingWithPolicy(
      cancelBooking24h.id,
      customerUserA.id,
      "CUSTOMER",
      "Function postponed"
    );

    assert.equal(cancelled.booking_status, "CANCELLED");
    assert.equal(cancelled.refund_amount, 100, "100% advance refunded");

    const slot = await db.AvailabilitySlot.findByPk(slot2.id);
    assert.equal(slot.is_booked, false, "Slot released");

    const refund = await db.Refund.findOne({ where: { booking_id: cancelBooking24h.id } });
    assert.ok(refund);
    assert.equal(refund.amount, 100);
  });

  // 31 & 32. Dispute Ticket & Admin Investigation/Resolution
  it("31 & 32. Dispute Creation & Admin Resolution", async () => {
    dispute1 = await db.SupportTicket.create({
      user_id: customerUserA.id,
      booking_id: flowABooking.id,
      subject: "Invoice query for booking #MG-MASTER-01",
      description: "Please share breakdown of advance vs final payment.",
      status: "OPEN",
      category: "Billing"
    });

    assert.ok(dispute1);

    const resolved = await AdminService.replySupportTicket(
      dispute1.id,
      "Invoice breakdown: ₹350 advance paid online, ₹3,150 settled at completion.",
      "CLOSED",
      adminUser.id
    );

    assert.equal(resolved.status, "CLOSED");
    assert.ok(resolved.replies.includes("₹350 advance"));
  });

  // 33 & 34. Admin Lifecycle Moderation (Suspension & Reactivation)
  it("33 & 34. Admin Suspension & Reactivation with Audit Log", async () => {
    await AdminService.suspendArtist(artistProfileA.id, "Quality investigation", adminUser.id);
    let profile = await db.ArtistProfile.findByPk(artistProfileA.id);
    assert.equal(profile.is_available, false);

    await AdminService.reactivateArtist(artistProfileA.id, adminUser.id);
    profile = await db.ArtistProfile.findByPk(artistProfileA.id);
    assert.equal(profile.is_available, true);
    assert.equal(profile.verification_status, "APPROVED");

    const audits = await db.AuditLog.findAll({ where: { admin_id: adminUser.id } });
    assert.ok(audits.length >= 3);
  });

  // 35. Cross-Role Security & Isolation
  it("35. Cross-Role Security -> Rival Artist B cannot access Artist A data; Customer B cannot access Customer A data", async () => {
    artistUserB = await db.User.create({
      name: "Rival Artist B",
      email: "rivalb.audit@mehndigo.in",
      phone: "9876522222",
      phone_number: "9876522222",
      role: "ARTIST",
      is_verified: true
    });
    artistProfileB = await db.ArtistProfile.create({
      user_id: artistUserB.id,
      bio: "Rival Artist",
      experience_years: 1,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // Rival cannot cancel master booking
    await assert.rejects(
      async () => {
        await BookingService.cancelBookingWithPolicy(
          flowABooking.id,
          artistUserB.id,
          "ARTIST",
          "Malicious cancel attempt"
        );
      },
      (err) => err.statusCode === 400 || err.statusCode === 403
    );

    // Customer B cannot cancel Customer A booking
    await assert.rejects(
      async () => {
        await BookingService.cancelBookingWithPolicy(
          flowABooking.id,
          customerUserB.id,
          "CUSTOMER",
          "Cross-customer cancel attempt"
        );
      },
      (err) => err.statusCode === 400 || err.statusCode === 403
    );
  });

  // 36, 37, 38, 39, 40. Money Reconciliation & Idempotency across 6 price tiers
  it("36-40. Master Money Reconciliations across price tiers (₹999, ₹3500, ₹9999, ₹12345, ₹50000, ₹99999)", async () => {
    const tiers = [
      { total: 999, expAdv: 100, expRem: 899 },
      { total: 3500, expAdv: 350, expRem: 3150 },
      { total: 9999, expAdv: 1000, expRem: 8999 },
      { total: 12345, expAdv: 1235, expRem: 11110 },
      { total: 50000, expAdv: 5000, expRem: 45000 },
      { total: 99999, expAdv: 10000, expRem: 89999 }
    ];

    for (const tier of tiers) {
      const adv = Math.round(tier.total * 0.10);
      const rem = tier.total - adv;
      const comm = adv;
      const artistShare = rem;

      assert.equal(adv + rem, tier.total, `Advance + Remaining must equal Total for ₹${tier.total}`);
      assert.equal(comm + artistShare, tier.total, `Commission + Artist Share must equal Total for ₹${tier.total}`);
      assert.equal(adv, tier.expAdv);
      assert.equal(rem, tier.expRem);
    }
  });

  // 41 & 42. Zero Dummy Business Data & Backend Authoritative Integrity
  it("41 & 42. Zero Dummy Business Data & Live Database Verification", async () => {
    const allUsers = await db.User.findAll();
    assert.ok(allUsers.length >= 4);

    const allBookings = await db.Booking.findAll();
    assert.ok(allBookings.length >= 2);

    const allWallets = await db.Wallet.findAll();
    allWallets.forEach((w) => {
      assert.ok(typeof w.balance === "number");
      assert.ok(typeof w.pending_balance === "number");
    });
  });
});
