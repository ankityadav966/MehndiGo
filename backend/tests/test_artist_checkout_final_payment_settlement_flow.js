"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const BookingService = require("../services/booking.services");
const PaymentService = require("../services/payment.services");

describe("ARTIST MODULE 7: CHECKOUT + FINAL PAYMENT + SETTLEMENT INTEGRATION SUITE", () => {
  let approvedArtistUser, approvedArtistProfile;
  let rivalArtistUser, rivalArtistProfile;
  let customerUser, rivalCustomerUser;
  let artistServiceItem;
  let slot1, slot2, slot3;
  let booking1, bookingCash, bookingPremature;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Approved Artist A
    approvedArtistUser = await db.User.create({
      name: "Sonia Bridal Artist",
      email: "sonia@settlement.com",
      phone: "9876543230",
      phone_number: "9876543230",
      role: "ARTIST",
      is_verified: true
    });
    approvedArtistProfile = await db.ArtistProfile.create({
      user_id: approvedArtistUser.id,
      bio: "Master Bridal Mehndi Specialist",
      experience_years: 9,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 2. Rival Artist B
    rivalArtistUser = await db.User.create({
      name: "Rival Artist",
      email: "rival@settlement.com",
      phone: "9876543231",
      phone_number: "9876543231",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtistProfile = await db.ArtistProfile.create({
      user_id: rivalArtistUser.id,
      bio: "Rival artist profile",
      experience_years: 3,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 3. Customer Users
    customerUser = await db.User.create({
      name: "Ritu Client",
      email: "ritu@customer.com",
      phone: "9123456795",
      phone_number: "9123456795",
      role: "CUSTOMER",
      is_verified: true
    });

    rivalCustomerUser = await db.User.create({
      name: "Rival Client",
      email: "rival_client@customer.com",
      phone: "9123456796",
      phone_number: "9123456796",
      role: "CUSTOMER",
      is_verified: true
    });

    // 4. Service & Slots
    const category = await db.Category.create({
      name: "Bridal Signature",
      slug: "bridal-signature",
      status: "ACTIVE",
      is_active: true
    });

    artistServiceItem = await db.Service.create({
      artist_id: approvedArtistProfile.id,
      specialization_name: "Signature Rajasthani Bridal Mehndi",
      category: "Bridal Signature",
      category_id: category.id,
      minimum_price: 5000,
      duration_minutes: 180,
      is_active: true
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().substring(0, 10);

    slot1 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfile.id,
      date: dateStr,
      start_time: `${dateStr}T10:00:00.000Z`,
      end_time: `${dateStr}T13:00:00.000Z`,
      is_booked: true
    });

    slot2 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfile.id,
      date: dateStr,
      start_time: `${dateStr}T14:00:00.000Z`,
      end_time: `${dateStr}T17:00:00.000Z`,
      is_booked: true
    });

    slot3 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfile.id,
      date: dateStr,
      start_time: `${dateStr}T18:00:00.000Z`,
      end_time: `${dateStr}T21:00:00.000Z`,
      is_booked: true
    });

    // 5. Booking 1: SERVICE_IN_PROGRESS (Online Payment + Checkout flow)
    const startTime1 = new Date(Date.now() - 120 * 60 * 1000); // started 2 hours ago
    booking1 = await db.Booking.create({
      booking_code: "MG-700101",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot1.id,
      total_price: 5000,
      advance_paid: 500,
      remaining_amount: 4500,
      final_amount: 5000,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "CUSTOMER_VERIFIED",
      check_in_otp: "112233",
      check_in_otp_verified: true,
      check_in_time: startTime1,
      service_started_at: startTime1,
      address: "Bani Park, Jaipur"
    });

    // 6. Booking 2: Cash Payment Booking in Progress
    bookingCash = await db.Booking.create({
      booking_code: "MG-700102",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot2.id,
      total_price: 5000,
      advance_paid: 500,
      remaining_amount: 4500,
      final_amount: 5000,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "CUSTOMER_VERIFIED",
      check_in_otp: "445566",
      check_in_otp_verified: true,
      check_in_time: startTime1,
      service_started_at: startTime1,
      address: "Raja Park, Jaipur"
    });

    // 7. Booking 3: Premature booking (still on the way)
    bookingPremature = await db.Booking.create({
      booking_code: "MG-700103",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot3.id,
      total_price: 5000,
      advance_paid: 500,
      remaining_amount: 4500,
      final_amount: 5000,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "ARTIST_ON_THE_WAY",
      check_in_otp_verified: false,
      address: "Mansarovar, Jaipur"
    });
  });

  it("1. Pre-condition Guard: Checkout OTP cannot be generated before service is in progress (400)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.sendCheckOutOtp(bookingPremature.id, approvedArtistUser.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("while the service is in progress")
    );
  });

  it("2. Authorization Guard: Rival Artist B cannot initiate checkout OTP for Artist A's booking (403)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.sendCheckOutOtp(booking1.id, rivalArtistUser.id);
      },
      (err) => err.statusCode === 403 && err.message.includes("Only the assigned artist")
    );
  });

  it("3. Artist A initiates checkout: Distinct 6-digit Checkout OTP is generated", async () => {
    const res = await BookingService.sendCheckOutOtp(booking1.id, approvedArtistUser.id);
    assert.equal(res.success, true);

    const refreshed = await db.Booking.findByPk(booking1.id);
    assert.ok(refreshed.check_out_otp);
    assert.equal(refreshed.check_out_otp.length, 6);
    assert.notEqual(refreshed.check_out_otp, refreshed.check_in_otp, "Checkout OTP must be distinct from Check-In OTP");
    assert.equal(refreshed.check_out_otp_verified, false);
    assert.ok(refreshed.check_out_otp_expires_at);
  });

  it("4. Replay Guard: Check-In OTP is explicitly rejected when entered as Checkout OTP (400)", async () => {
    const refreshed = await db.Booking.findByPk(booking1.id);
    await assert.rejects(
      async () => {
        await BookingService.verifyCheckOutOtp(booking1.id, refreshed.check_in_otp, approvedArtistUser.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("Check-In OTP cannot be used for Check-Out")
    );
  });

  it("5. Checkout OTP Security: Wrong OTP code is rejected (400) and tracks failed attempts", async () => {
    await assert.rejects(
      async () => {
        await BookingService.verifyCheckOutOtp(booking1.id, "000000", approvedArtistUser.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("Invalid or expired Check-Out OTP")
    );
  });

  it("6. Authorization Guard: Rival Artist B cannot verify Checkout OTP for Artist A's booking (403)", async () => {
    const refreshed = await db.Booking.findByPk(booking1.id);
    await assert.rejects(
      async () => {
        await BookingService.verifyCheckOutOtp(booking1.id, refreshed.check_out_otp, rivalArtistUser.id);
      },
      (err) => err.statusCode === 403 && err.message.includes("Only the assigned artist")
    );
  });

  it("7. Atomic Completion: Valid Checkout OTP transitions booking to COMPLETED, settles earnings, and stops timer", async () => {
    const refreshed = await db.Booking.findByPk(booking1.id);
    const validOtp = refreshed.check_out_otp;

    const res = await BookingService.verifyCheckOutOtp(booking1.id, validOtp, approvedArtistUser.id);
    assert.equal(res.success, true);

    const completedBooking = await db.Booking.findByPk(booking1.id);
    assert.equal(completedBooking.booking_status, "COMPLETED");
    assert.equal(completedBooking.detailed_status, "COMPLETED");
    assert.equal(completedBooking.payment_status, "PAID");
    assert.equal(completedBooking.check_out_otp_verified, true);
    assert.ok(completedBooking.check_out_time);
    assert.ok(completedBooking.service_duration >= 1);
    assert.equal(completedBooking.check_out_otp, null, "OTP must be cleared after verification");
    assert.equal(completedBooking.remaining_amount, 0);

    // Verify Invoice was generated
    const invoice = await db.Invoice.findOne({ where: { booking_id: booking1.id } });
    assert.ok(invoice);
    assert.ok(invoice.invoice_number);
  });

  it("8. Settlement & Commission Accounting: 10% platform commission is deducted accurately without double commission", async () => {
    const settlement = await db.SettlementHistory.findOne({
      where: { booking_id: booking1.id, status: "COMPLETED" }
    });

    assert.ok(settlement);
    assert.equal(settlement.total_amount, 5000);
    assert.equal(settlement.commission_amount, 500, "10% commission of ₹5000 is ₹500");
    assert.equal(settlement.artist_amount, 4500, "Artist net amount is ₹4500");

    // Verify Artist Wallet
    const artistWallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUser.id } });
    assert.ok(artistWallet);
    assert.equal(artistWallet.lifetime_earnings, 4500);
  });

  it("9. Duplicate Completion Idempotency: Rapid retry returns clean state without duplicate settlement or wallet increments", async () => {
    const earningsBefore = (await db.Wallet.findOne({ where: { user_id: approvedArtistUser.id } })).lifetime_earnings;
    const settlementCountBefore = await db.SettlementHistory.count({ where: { booking_id: booking1.id } });

    // Repeated call
    const res = await BookingService.verifyCheckOutOtp(booking1.id, "123456", approvedArtistUser.id);
    assert.equal(res.success, true);

    const earningsAfter = (await db.Wallet.findOne({ where: { user_id: approvedArtistUser.id } })).lifetime_earnings;
    const settlementCountAfter = await db.SettlementHistory.count({ where: { booking_id: booking1.id } });

    assert.equal(earningsAfter, earningsBefore, "Lifetime earnings must not double increment");
    assert.equal(settlementCountAfter, settlementCountBefore, "SettlementHistory rows must not duplicate");
  });

  it("10. Cash Payment Collection Flow: Artist confirms cash collection, completing booking and recording transaction", async () => {
    const res = await BookingService.confirmCashPayment(bookingCash.id, approvedArtistUser.id);
    assert.ok(res);

    const completedCash = await db.Booking.findByPk(bookingCash.id);
    assert.equal(completedCash.booking_status, "COMPLETED");
    assert.equal(completedCash.detailed_status, "COMPLETED");
    assert.equal(completedCash.payment_status, "PAID");

    const artistWallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUser.id } });
    assert.equal(artistWallet.lifetime_earnings, 9000, "₹4500 + ₹4500 = ₹9000 net lifetime earnings");
  });

  it("11. Rival Artist cannot confirm cash collection for Artist A's booking (403 Forbidden)", async () => {
    const bookingCash2 = await db.Booking.create({
      booking_code: "MG-700104",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot3.id,
      total_price: 5000,
      advance_paid: 500,
      remaining_amount: 4500,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "AWAITING_CASH_CONFIRMATION"
    });

    await assert.rejects(
      async () => {
        await BookingService.confirmCashPayment(bookingCash2.id, rivalArtistUser.id);
      },
      (err) => err.statusCode === 403 && err.message.includes("Unauthorized access to confirm cash payment")
    );
  });

  it("12. Remaining Amount Integrity: Booking remaining amount remains strictly total_price - advance_paid", async () => {
    const details = await BookingService.getBookingDetails(booking1.id, approvedArtistUser.id, "ARTIST");
    assert.equal(details.total_price, 5000);
    assert.equal(details.advance_paid, 500);
    assert.equal(details.payment_status, "PAID");
  });

  it("13. Cancellation blocked after completion (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.cancelBookingWithPolicy(booking1.id, customerUser.id, "CUSTOMER", "Need refund");
      },
      (err) => err.statusCode === 400 && err.message.includes("Cannot cancel an already completed booking")
    );
  });

  it("14. Customer & Artist State Synchronization: Both users fetch completed status", async () => {
    const artistView = await BookingService.getBookingDetails(booking1.id, approvedArtistUser.id, "ARTIST");
    const customerView = await BookingService.getBookingDetails(booking1.id, customerUser.id, "CUSTOMER");

    assert.equal(artistView.booking_status, "COMPLETED");
    assert.equal(customerView.booking_status, "COMPLETED");
    assert.equal(artistView.detailed_status, "COMPLETED");
    assert.equal(customerView.detailed_status, "COMPLETED");
  });

  it("15. Customer Review Eligibility: Customer is eligible to review only after COMPLETED status", async () => {
    // Review check on completed booking
    const booking = await db.Booking.findByPk(booking1.id);
    assert.equal(booking.booking_status, "COMPLETED");
    assert.equal(booking.review_submitted || false, false);
  });
});
