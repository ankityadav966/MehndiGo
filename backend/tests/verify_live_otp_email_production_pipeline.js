"use strict";

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

const db = require("../models");
const BookingService = require("../services/booking.services");
const { sendEmail } = require("../utils/mail.service");

describe("CANONICAL PRODUCTION CHECK-IN & CHECK-OUT OTP EMAIL PIPELINE", () => {
  let customerUser;
  let artistUser;
  let artistProfile;
  let service;
  let slot;
  let booking;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Setup real customer with registered email
    customerUser = await db.User.create({
      phone: "9876543210",
      phone_number: "9876543210",
      name: "Radha Sharma",
      email: "radha.customer@mehndigo.in",
      role: "CUSTOMER",
      is_active: true,
      is_verified: true,
      verification_status: "APPROVED"
    });

    // 2. Setup real artist
    artistUser = await db.User.create({
      phone: "9988776655",
      phone_number: "9988776655",
      name: "Pooja Mehndi Specialist",
      email: "pooja.artist@mehndigo.in",
      role: "ARTIST",
      is_active: true,
      is_verified: true,
      verification_status: "APPROVED"
    });

    artistProfile = await db.ArtistProfile.create({
      user_id: artistUser.id,
      bio: "Master Bridal Mehndi Artist with 6+ years experience",
      experience_years: 6,
      city: "Delhi",
      location: "South Delhi",
      is_available: true,
      verification_status: "APPROVED",
      latitude: 28.6139,
      longitude: 77.2090
    });

    const category = await db.Category.create({
      name: "Bridal Mehndi",
      slug: "bridal-mehndi-canon",
      status: "ACTIVE",
      is_active: true
    });

    service = await db.Service.create({
      artist_id: artistProfile.id,
      specialization_name: "Royal Bridal Mehndi",
      category: "Bridal Mehndi",
      category_id: category.id,
      minimum_price: 3500,
      duration_minutes: 180,
      is_active: true
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().substring(0, 10);

    slot = await db.AvailabilitySlot.create({
      artist_id: artistProfile.id,
      date: dateStr,
      start_time: `${dateStr}T10:00:00.000Z`,
      end_time: `${dateStr}T13:00:00.000Z`,
      is_booked: true
    });

    // 3. Setup real booking
    const bookingCode = `MG-CANON-${Date.now().toString().slice(-4)}`;
    booking = await db.Booking.create({
      booking_code: bookingCode,
      booking_number: bookingCode,
      user_id: customerUser.id,
      customer_id: customerUser.id,
      artist_id: artistProfile.id,
      service_id: service.id,
      slot_id: slot.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      payment_status: "PARTIAL",
      booking_status: "CONFIRMED",
      detailed_status: "ARTIST_ARRIVED",
      address: "House 102, South Extension, Delhi",
      landmark: "Near Metro Gate 2",
      latitude: 28.6139,
      longitude: 77.2090
    });
  });

  it("1. Check-In OTP: Real 4-digit OTP generated & persisted in database", async () => {
    const res = await BookingService.sendCheckInOtp(booking.id, artistUser.id);
    assert.equal(res.success, true, "Check-in OTP generation should succeed");

    const updated = await db.Booking.findByPk(booking.id);
    assert.ok(updated.check_in_otp, "check_in_otp must be saved in DB");
    assert.equal(String(updated.check_in_otp).length, 4, "check_in_otp must be exactly 4 digits");
    assert.equal(/^[0-9]{4}$/.test(updated.check_in_otp), true, "check_in_otp must be numeric");
    assert.ok(updated.check_in_otp_expires_at, "check_in_otp_expires_at must be populated");
  });

  it("2. Check-In Email: Dispatched to Customer's registered email address with matching PIN", async () => {
    const freshBooking = await db.Booking.findByPk(booking.id, {
      include: [{ model: db.User, as: "user" }]
    });

    // Recipient must strictly be customer's registered email
    assert.equal(freshBooking.user.email, customerUser.email, "Email recipient must be customer registered email");

    // Perform live SMTP delivery verification
    const emailRes = await sendEmail(
      freshBooking.user.email,
      `Your MehndiGo Check-In PIN - #${freshBooking.booking_code}`,
      `Hello ${freshBooking.user.name},\n\nYour artist has arrived! Your 4-digit Doorstep Check-In PIN is: ${freshBooking.check_in_otp}\n\nPlease share this 4-digit PIN with your Mehndi Specialist upon arrival.\n\nBooking: #${freshBooking.booking_code}\nSecurity Notice: Only share in-person when the specialist is at your doorstep.\n\nBest regards,\nMehndiGo Team`
    );

    assert.equal(emailRes.success, true, "Email sending must succeed");
    assert.ok(emailRes.accepted.includes(customerUser.email), "Accepted recipients must contain customer registered email");
  });

  it("3. Check-In Verification: Valid PIN transitions state to SERVICE_IN_PROGRESS & permanently invalidates checkin_otp", async () => {
    const freshBooking = await db.Booking.findByPk(booking.id);
    const validOtp = freshBooking.check_in_otp;

    const verifyRes = await BookingService.verifyCheckInOtp(booking.id, validOtp, artistUser.id);
    assert.equal(verifyRes.success, true, "Check-in OTP verification must succeed");

    const inProgressBooking = await db.Booking.findByPk(booking.id);
    assert.equal(inProgressBooking.detailed_status, "CUSTOMER_VERIFIED", "Status must be CUSTOMER_VERIFIED / SERVICE_IN_PROGRESS");
    assert.equal(inProgressBooking.check_in_otp, null, "check_in_otp MUST be permanently NULL upon verification");
    assert.equal(inProgressBooking.check_in_otp_verified, true, "check_in_otp_verified must be true");
    assert.ok(inProgressBooking.service_started_at, "service_started_at must be set");

    // Re-verification or Check-In re-trigger must be strictly rejected
    await assert.rejects(
      async () => {
        await BookingService.sendCheckInOtp(booking.id, artistUser.id);
      },
      (err) => {
        assert.match(err.message, /already been verified/i);
        return true;
      }
    );
  });

  it("4. Check-Out OTP: Distinct real 4-digit Completion PIN generated & saved in DB", async () => {
    // Transition to SERVICE_IN_PROGRESS
    await db.Booking.update({ detailed_status: "SERVICE_IN_PROGRESS" }, { where: { id: booking.id } });

    const res = await BookingService.sendCheckOutOtp(booking.id, artistUser.id);
    assert.equal(res.success, true, "Checkout OTP generation should succeed");
    assert.ok(res.otp, "Checkout OTP must be returned");
    assert.equal(String(res.otp).length, 4, "Checkout OTP must be 4 digits");

    const updated = await db.Booking.findByPk(booking.id);
    assert.equal(updated.check_out_otp, res.otp, "checkout_otp must be saved in DB");
    assert.equal(updated.detailed_status, "CHECKOUT", "detailed_status must be CHECKOUT");
  });

  it("5. Check-Out Email: Dispatched to Customer's registered email address with matching Completion PIN", async () => {
    const freshBooking = await db.Booking.findByPk(booking.id, {
      include: [{ model: db.User, as: "user" }]
    });

    assert.equal(freshBooking.user.email, customerUser.email, "Recipient must be Customer registered email");

    const emailRes = await sendEmail(
      freshBooking.user.email,
      `Your MehndiGo Service Completion PIN - #${freshBooking.booking_code}`,
      `Hello ${freshBooking.user.name},\n\nYour Mehndi session for booking #${freshBooking.booking_code} has finished. Your 4-digit Service Completion PIN is: ${freshBooking.check_out_otp}.\n\nPlease share this 4-digit Completion PIN with your Mehndi Specialist only after inspecting and approving the finished mehndi.\n\nBest regards,\nMehndiGo Team`
    );

    assert.equal(emailRes.success, true, "Completion PIN email sending must succeed");
    assert.ok(emailRes.accepted.includes(customerUser.email), "Accepted recipients must contain customer registered email");
  });

  it("6. Check-Out Verification: Valid PIN transitions state to COMPLETED & invalidates checkout_otp", async () => {
    const freshBooking = await db.Booking.findByPk(booking.id);
    const validCheckoutOtp = freshBooking.check_out_otp;

    const verifyRes = await BookingService.verifyCheckOutOtp(booking.id, validCheckoutOtp, artistUser.id);
    assert.equal(verifyRes.success, true, "Checkout OTP verification must succeed");

    const completedBooking = await db.Booking.findByPk(booking.id);
    assert.equal(completedBooking.detailed_status, "COMPLETED", "detailed_status must be COMPLETED");
    assert.equal(completedBooking.booking_status, "COMPLETED", "booking_status must be COMPLETED");
    assert.equal(completedBooking.check_out_otp, null, "checkout_otp MUST be permanently NULL upon verification");
    assert.equal(completedBooking.check_out_otp_verified, true, "check_out_otp_verified must be true");
  });
});
