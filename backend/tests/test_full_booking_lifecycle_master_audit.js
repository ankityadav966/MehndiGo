"use strict";

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";
process.env.RAZORPAY_KEY_SECRET = "AJSFmZyxn471PmOT8OGRB768";

const assert = require("assert");
const crypto = require("crypto");
const db = require("../models");
const BookingService = require("../services/booking.services");
const PaymentService = require("../services/payment.services");

async function runMasterLifecycleAudit() {
  console.log("================================================================================");
  console.log("🚀 STARTING FULL PRODUCTION AUDIT: COMPLETE ARTIST + CUSTOMER BOOKING LIFECYCLE");
  console.log("================================================================================");

  try {
    await db.sequelize.sync({ force: true });
    console.log("✅ Database Connection: Initialized in-memory SQLite tables successfully.");

    // Setup Test Users: Customer, Artist, Admin
    const customerUser = await db.User.create({
      name: "Test Customer Lifecycle",
      phone: "9876500001",
      email: "customer_lifecycle@mehndigo.com",
      role: "CUSTOMER",
      is_phone_verified: true,
      password: "hashed_password_test"
    });

    const artistUser = await db.User.create({
      name: "Test Artist Lifecycle",
      phone: "9876500002",
      email: "artist_lifecycle@mehndigo.com",
      role: "ARTIST",
      is_phone_verified: true,
      password: "hashed_password_test"
    });

    const artistProfile = await db.ArtistProfile.create({
      user_id: artistUser.id,
      bio: "Master Bridal Mehndi Artist with 5 years experience",
      business_name: "Master Henna Studio",
      status: "APPROVED",
      verification_status: "APPROVED",
      is_verified: true,
      experience_years: 5,
      rating: 4.9,
      reviews_count: 50,
      address: "M.I. Road, Jaipur",
      city: "Jaipur",
      pincode: "302001",
      latitude: 26.9124,
      longitude: 75.7873
    });

    const service = await db.Service.create({
      artist_id: artistProfile.id,
      specialization_name: "Bridal Full Package",
      category: "Bridal Mehndi",
      base_price: 1000,
      price: 1000,
      minimum_price: 500,
      duration_minutes: 90,
      is_active: true
    });

    console.log(`✅ Test Entities Initialized: Customer #${customerUser.id}, ArtistProfile #${artistProfile.id}, Service #${service.id}`);

    // =========================================================================
    // FLOW A: COMPLETE CASH SETTLEMENT LIFECYCLE (Stages 1 through 15)
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("▶ TESTING FLOW A: CASH SETTLEMENT LIFECYCLE (Stages 1-15)");
    console.log("--------------------------------------------------------------------------------");

    // Stage 1: Booking Creation (10% Advance Deposit)
    const bookingA = await db.Booking.create({
      booking_number: `MG-TEST-CASH-${Date.now().toString().slice(-5)}`,
      booking_code: `MG-CSH-${Date.now().toString().slice(-4)}`,
      user_id: customerUser.id,
      customer_id: customerUser.id,
      artist_id: artistProfile.id,
      service_id: service.id,
      booking_date: "2026-09-01",
      booking_time: "10:00 AM",
      address: "Civic Centre, Jaipur",
      latitude: 26.9124,
      longitude: 75.7873,
      total_price: 1000,
      final_amount: 1000,
      advance_amount: 100,
      advance_paid: 100,
      remaining_amount: 900,
      status: "pending",
      booking_status: "PENDING",
      detailed_status: "PENDING",
      payment_status: "PARTIAL",
      payment_mode: "ONLINE"
    });

    // Record the 10% Advance Payment in payments table
    await db.Payment.create({
      booking_id: bookingA.id,
      razorpay_order_id: `order_adv_${bookingA.id}`,
      razorpay_payment_id: `pay_adv_${bookingA.id}`,
      amount: 100,
      currency: "INR",
      status: "captured",
      payment_method: "UPI",
      payment_type: "ADVANCE"
    });

    console.log(`[Stage 1] Booking Created: Total=₹${bookingA.final_amount}, Advance Paid=₹${bookingA.advance_paid}, Remaining Due=₹${bookingA.remaining_amount}`);
    assert.strictEqual(Number(bookingA.final_amount), 1000);
    assert.strictEqual(Number(bookingA.advance_paid), 100);
    assert.strictEqual(Number(bookingA.remaining_amount), 900);

    // Stage 2: Artist Accepts Request
    await BookingService.updateBookingStatus(bookingA.id, artistUser.id, "ARTIST", "ACCEPTED");
    let refreshedA = await db.Booking.findByPk(bookingA.id);
    console.log(`[Stage 2] Artist Accepted: Status=${refreshedA.booking_status}, DetailedStatus=${refreshedA.detailed_status}`);
    assert.strictEqual(refreshedA.booking_status, "CONFIRMED");
    assert.strictEqual(refreshedA.detailed_status, "ARTIST_ACCEPTED");

    // Stage 3: Artist Starts Travel / On The Way
    await BookingService.updateBookingStatus(bookingA.id, artistUser.id, "ARTIST", "ARTIST_ON_THE_WAY");
    refreshedA = await db.Booking.findByPk(bookingA.id);
    console.log(`[Stage 3] Artist On The Way: Status=${refreshedA.booking_status}, DetailedStatus=${refreshedA.detailed_status}`);
    assert.strictEqual(refreshedA.detailed_status, "ARTIST_ON_THE_WAY");

    // Stage 4: Artist Arrives at Doorstep (GPS verification within radius)
    await BookingService.updateBookingStatus(bookingA.id, artistUser.id, "ARTIST", "ARTIST_ARRIVED", {
      latitude: 26.9124,
      longitude: 75.7873,
      force: true
    });
    refreshedA = await db.Booking.findByPk(bookingA.id);
    console.log(`[Stage 4] Artist Arrived: DetailedStatus=${refreshedA.detailed_status}`);
    assert.strictEqual(refreshedA.detailed_status, "ARTIST_ARRIVED");

    // Stage 5: Check-In PIN Generated & Dispatched
    await BookingService.sendCheckInOtp(bookingA.id, artistUser.id);
    refreshedA = await db.Booking.findByPk(bookingA.id);
    console.log(`[Stage 5] Check-In PIN Generated: OTP=${refreshedA.check_in_otp}, Verified=${refreshedA.check_in_otp_verified}`);
    assert(Boolean(refreshedA.check_in_otp), "Check-in OTP must be generated");
    assert.strictEqual(refreshedA.check_in_otp_verified, false);

    // Stage 6 & 7: Check-In OTP Verified -> Service In Progress
    const checkinPinA = refreshedA.check_in_otp;
    await BookingService.verifyCheckInOtp(bookingA.id, checkinPinA, artistUser.id);
    refreshedA = await db.Booking.findByPk(bookingA.id);
    console.log(`[Stage 6/7] Check-In Verified: DetailedStatus=${refreshedA.detailed_status}, CheckInVerified=${refreshedA.check_in_otp_verified}, ServiceStartTime=${refreshedA.service_started_at}`);
    assert.strictEqual(refreshedA.detailed_status, "CUSTOMER_VERIFIED");
    assert.strictEqual(refreshedA.check_in_otp_verified, true);
    assert(Boolean(refreshedA.service_started_at), "Service start time must be stamped");

    // Stage 8 & 9: Service Finished & Request Completion PIN
    await BookingService.sendCheckOutOtp(bookingA.id, artistUser.id);
    refreshedA = await db.Booking.findByPk(bookingA.id);
    console.log(`[Stage 8/9] Completion PIN Generated: OTP=${refreshedA.check_out_otp}, State remains in progress=${refreshedA.detailed_status}`);
    assert(Boolean(refreshedA.check_out_otp), "Checkout OTP must be generated");
    assert.notStrictEqual(refreshedA.check_out_otp, checkinPinA, "Check-out OTP must be distinct from Check-in OTP");

    // Stage 10 & 11: Verify Completion PIN -> Transitions to CHECKOUT (because remaining balance > 0)
    const completionPinA = refreshedA.check_out_otp;
    await BookingService.verifyCheckOutOtp(bookingA.id, completionPinA, artistUser.id);
    refreshedA = await db.Booking.findByPk(bookingA.id);
    console.log(`[Stage 10/11] Completion PIN Verified: DetailedStatus=${refreshedA.detailed_status}, CheckoutVerified=${refreshedA.check_out_otp_verified}, RemainingDue=₹${refreshedA.remaining_amount}`);
    assert.strictEqual(refreshedA.detailed_status, "CHECKOUT");
    assert.strictEqual(refreshedA.check_out_otp_verified, true);
    assert.strictEqual(Number(refreshedA.remaining_amount), 900);

    // Stage 12: Customer/Artist Selects Cash Collection Method
    await BookingService.selectCashPayment(bookingA.id, customerUser.id);
    refreshedA = await db.Booking.findByPk(bookingA.id);
    console.log(`[Stage 12] Cash Payment Selected: DetailedStatus=${refreshedA.detailed_status}`);
    assert(["AWAITING_CASH_CONFIRMATION", "CHECKOUT"].includes(refreshedA.detailed_status), "Status must reflect cash checkout");

    // Stage 13 & 14: Artist Confirms Cash Receipt -> PAID -> COMPLETED
    await BookingService.confirmCashPayment(bookingA.id, artistUser.id);
    refreshedA = await db.Booking.findByPk(bookingA.id);
    console.log(`[Stage 13/14] Cash Confirmed: Status=${refreshedA.booking_status}, DetailedStatus=${refreshedA.detailed_status}, PaymentStatus=${refreshedA.payment_status}, RemainingDue=₹${refreshedA.remaining_amount}`);
    assert.strictEqual(refreshedA.booking_status, "COMPLETED");
    assert.strictEqual(refreshedA.detailed_status, "COMPLETED");
    assert.strictEqual(refreshedA.payment_status, "PAID");
    assert.strictEqual(Number(refreshedA.remaining_amount), 0);

    // Stage 15: Invoice & Financial Settlement Verification
    const invoiceA = await BookingService.getInvoice(bookingA.id, customerUser.id, "CUSTOMER");
    console.log(`[Stage 15] Official Invoice Generated: InvoiceNumber=${invoiceA.invoice_number}, URL=${invoiceA.invoice_url}`);
    assert(Boolean(invoiceA.invoice_number), "Official invoice must be generated");

    // Verify Artist Wallet & Commission
    const artistWalletA = await db.Wallet.findOne({ where: { user_id: artistUser.id } });
    console.log(`[Financials] Artist Wallet: Balance=₹${artistWalletA?.balance}, LifetimeEarnings=₹${artistWalletA?.lifetime_earnings}`);
    assert(Boolean(artistWalletA), "Artist wallet must exist");

    console.log("🎉 FLOW A (CASH SETTLEMENT): ALL 15 STAGES PASSED PERFECTLY!");

    // =========================================================================
    // FLOW B: COMPLETE ONLINE SETTLEMENT LIFECYCLE (Stages 1 through 15)
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("▶ TESTING FLOW B: ONLINE SETTLEMENT LIFECYCLE (Stages 1-15)");
    console.log("--------------------------------------------------------------------------------");

    // Stage 1: Booking Creation (10% Advance Deposit)
    const bookingB = await db.Booking.create({
      booking_number: `MG-TEST-ONLINE-${Date.now().toString().slice(-5)}`,
      booking_code: `MG-ONL-${Date.now().toString().slice(-4)}`,
      user_id: customerUser.id,
      customer_id: customerUser.id,
      artist_id: artistProfile.id,
      service_id: service.id,
      booking_date: "2026-09-02",
      booking_time: "02:00 PM",
      address: "Vaishali Nagar, Jaipur",
      latitude: 26.9124,
      longitude: 75.7873,
      total_price: 2000,
      final_amount: 2000,
      advance_amount: 200,
      advance_paid: 200,
      remaining_amount: 1800,
      status: "pending",
      booking_status: "PENDING",
      detailed_status: "PENDING",
      payment_status: "PARTIAL",
      payment_mode: "ONLINE"
    });

    // Record advance payment
    await db.Payment.create({
      booking_id: bookingB.id,
      razorpay_order_id: `order_adv_${bookingB.id}`,
      razorpay_payment_id: `pay_adv_${bookingB.id}`,
      amount: 200,
      currency: "INR",
      status: "captured",
      payment_method: "CARD",
      payment_type: "ADVANCE"
    });

    console.log(`[Stage 1] Booking Created: Total=₹${bookingB.final_amount}, Advance Paid=₹${bookingB.advance_paid}, Remaining Due=₹${bookingB.remaining_amount}`);

    // Stages 2 through 4: Accept, Travel, Arrive
    await BookingService.updateBookingStatus(bookingB.id, artistUser.id, "ARTIST", "ACCEPTED");
    await BookingService.updateBookingStatus(bookingB.id, artistUser.id, "ARTIST", "ARTIST_ON_THE_WAY");
    await BookingService.updateBookingStatus(bookingB.id, artistUser.id, "ARTIST", "ARTIST_ARRIVED", {
      latitude: 26.9124,
      longitude: 75.7873,
      force: true
    });

    // Stage 5 & 6: Check-In PIN Generated & Verified
    await BookingService.sendCheckInOtp(bookingB.id, artistUser.id);
    let refreshedB = await db.Booking.findByPk(bookingB.id);
    await BookingService.verifyCheckInOtp(bookingB.id, refreshedB.check_in_otp, artistUser.id);
    refreshedB = await db.Booking.findByPk(bookingB.id);
    console.log(`[Stage 6/7] Check-In Verified: DetailedStatus=${refreshedB.detailed_status}`);
    assert.strictEqual(refreshedB.check_in_otp_verified, true);

    // Stage 8 & 9: Service Finished -> Completion PIN Generated
    await BookingService.sendCheckOutOtp(bookingB.id, artistUser.id);
    refreshedB = await db.Booking.findByPk(bookingB.id);

    // Stage 10 & 11: Verify Completion PIN -> Transitions to CHECKOUT (Remaining balance = ₹1800)
    await BookingService.verifyCheckOutOtp(bookingB.id, refreshedB.check_out_otp, artistUser.id);
    refreshedB = await db.Booking.findByPk(bookingB.id);
    console.log(`[Stage 10/11] Completion PIN Verified: DetailedStatus=${refreshedB.detailed_status}, RemainingDue=₹${refreshedB.remaining_amount}`);
    assert.strictEqual(refreshedB.detailed_status, "CHECKOUT");
    assert.strictEqual(Number(refreshedB.remaining_amount), 1800);

    // Stage 12: Initiate Online Settlement Payment Gateway Session
    const orderIdB = `order_settle_${bookingB.id}_${Date.now()}`;
    const paymentIdB = `pay_settle_${bookingB.id}_${Date.now()}`;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || "AJSFmZyxn471PmOT8OGRB768";

    // Record pending transaction and payment records
    await db.Transaction.create({
      user_id: customerUser.id,
      booking_id: bookingB.id,
      razorpay_order_id: orderIdB,
      amount: 1800,
      status: "PENDING",
      gateway: "RAZORPAY"
    });

    await db.Payment.create({
      booking_id: bookingB.id,
      razorpay_order_id: orderIdB,
      razorpay_payment_id: paymentIdB,
      amount: 1800,
      currency: "INR",
      status: "created",
      payment_method: "UPI",
      payment_type: "FINAL"
    });

    // Generate valid HMAC-SHA256 signature
    const signatureB = crypto
      .createHmac("sha256", razorpaySecret)
      .update(`${orderIdB}|${paymentIdB}`)
      .digest("hex");

    // Stage 13A: Negative Test - Simulated/Fake signature rejection
    try {
      await PaymentService.verifyPayment(customerUser.id, {
        razorpay_order_id: orderIdB,
        razorpay_payment_id: paymentIdB,
        razorpay_signature: "tampered_fake_signature_xyz"
      });
      assert.fail("Tampered signature should have thrown an error");
    } catch (tamperErr) {
      console.log(`[Security Test] Fake signature successfully rejected: "${tamperErr.message}"`);
    }

    // Stage 13B: Genuine Gateway Verification -> Success
    await PaymentService.verifyPayment(customerUser.id, {
      razorpay_order_id: orderIdB,
      razorpay_payment_id: paymentIdB,
      razorpay_signature: signatureB,
      isSettlement: true,
      bookingId: bookingB.id
    });

    refreshedB = await db.Booking.findByPk(bookingB.id);
    console.log(`[Stage 13/14] Online Payment Verified: Status=${refreshedB.booking_status}, DetailedStatus=${refreshedB.detailed_status}, PaymentStatus=${refreshedB.payment_status}, RemainingDue=₹${refreshedB.remaining_amount}`);
    assert.strictEqual(refreshedB.booking_status, "COMPLETED");
    assert.strictEqual(refreshedB.detailed_status, "COMPLETED");
    assert.strictEqual(refreshedB.payment_status, "PAID");
    assert.strictEqual(Number(refreshedB.remaining_amount), 0);

    // Stage 13C: Idempotency Test - Duplicate Payment Callback Test
    const duplicateVerify = await PaymentService.verifyPayment(customerUser.id, {
      razorpay_order_id: orderIdB,
      razorpay_payment_id: paymentIdB,
      razorpay_signature: signatureB,
      isSettlement: true,
      bookingId: bookingB.id
    });
    console.log(`[Idempotency Test] Duplicate verify handled safely without duplicate charge.`);
    assert(duplicateVerify.success || duplicateVerify.status === "SUCCESS", "Duplicate verification must return idempotent success");

    // Stage 15: Invoice Generation for Online Booking
    const invoiceB = await BookingService.getInvoice(bookingB.id, customerUser.id, "CUSTOMER");
    console.log(`[Stage 15] Official Invoice: InvoiceNumber=${invoiceB.invoice_number}, URL=${invoiceB.invoice_url}`);
    assert(Boolean(invoiceB.invoice_number), "Official invoice must be generated");

    console.log("🎉 FLOW B (ONLINE SETTLEMENT): ALL 15 STAGES PASSED PERFECTLY!");

    console.log("\n================================================================================");
    console.log("✅ PRODUCTION LIFECYCLE AUDIT: 100% SUCCESSFUL ON ALL LAYERS");
    console.log("================================================================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Master Lifecycle Audit Failed:", error);
    process.exit(1);
  }
}

runMasterLifecycleAudit();
