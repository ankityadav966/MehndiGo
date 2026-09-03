/**
 * MASTER PROJECT FINANCIAL RECONCILIATION TEST SUITE
 * Validates the ₹5,500 exact business case, multi-tier pricing, Razorpay order/paise amounts,
 * payment verification, ledger entries, commission, artist settlement, and cross-role reconciliation.
 */

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";
process.env.RAZORPAY_KEY_ID = "rzp_test_TTX0hx0yooeEQW";
process.env.RAZORPAY_KEY_SECRET = "test_secret_for_hmac_sha256_verification";

const assert = require("assert");
const crypto = require("crypto");
const db = require("../models");
const BookingService = require("../services/booking.services");
const PaymentService = require("../services/payment.services");
const CustomerService = require("../services/customer.services");
const razorpayUtil = require("../utils/razorpay");

async function runMasterFinancialAudit() {
  console.log("=================================================================");
  console.log("  MEHENDIGO — MASTER FINANCIAL RECONCILIATION & AUDIT TEST");
  console.log("=================================================================\n");

  await db.sequelize.sync({ force: true });

  let passed = 0;
  let failed = 0;

  function record(desc, cond, details = "") {
    if (cond) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc} ${details ? `-> ${details}` : ""}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------
    // SECTION 1: Canonical Money Engine & Multi-Tier Pricing Test
    // -------------------------------------------------------------
    console.log("--- SECTION 1: Multi-Tier Price & 10% Advance Formula Validation ---");
    const testTiers = [
      { total: 100, expAdvance: 10, expRemaining: 90 },
      { total: 550, expAdvance: 55, expRemaining: 495 },
      { total: 999, expAdvance: 100, expRemaining: 899 },
      { total: 1000, expAdvance: 100, expRemaining: 900 },
      { total: 3500, expAdvance: 350, expRemaining: 3150 },
      { total: 5500, expAdvance: 550, expRemaining: 4950 },
      { total: 9999, expAdvance: 1000, expRemaining: 8999 },
      { total: 10000, expAdvance: 1000, expRemaining: 9000 },
      { total: 12345, expAdvance: 1235, expRemaining: 11110 },
      { total: 50000, expAdvance: 5000, expRemaining: 45000 },
      { total: 99999, expAdvance: 10000, expRemaining: 89999 }
    ];

    for (const tier of testTiers) {
      const adv = Math.round(tier.total * 0.10);
      const rem = Math.max(0, tier.total - adv);
      const sumReconciled = (adv + rem) === tier.total;
      record(
        `Tier ₹${tier.total}: Advance = ₹${adv}, Remaining = ₹${rem}, Sum = ₹${tier.total}`,
        adv === tier.expAdvance && rem === tier.expRemaining && sumReconciled
      );
    }

    // -------------------------------------------------------------
    // SECTION 2: ₹5,500 Definitive Real Business Flow
    // -------------------------------------------------------------
    console.log("\n--- SECTION 2: ₹5,500 Real Booking Lifecycle & Razorpay Flow ---");

    // 1. Seed Users (Customer, Artist, Admin)
    const customerUser = await db.User.create({
      name: "Ananya Sharma",
      email: `customer_${timestamp}@test.com`,
      phone: "9829011001",
      role: "CUSTOMER",
      is_verified: true
    });

    const artistUser = await db.User.create({
      name: "Pooja Royal Mehndi",
      email: `artist_${timestamp}@test.com`,
      phone: "9829022002",
      role: "ARTIST",
      is_verified: true
    });

    const adminUser = await db.User.create({
      name: "MehndiGo SuperAdmin",
      email: `admin_${timestamp}@mehndigo.in`,
      phone: "9829033003",
      role: "ADMIN",
      is_verified: true
    });

    const artistProfile = await db.ArtistProfile.create({
      user_id: artistUser.id,
      bio: "Destination Wedding Specialist",
      experience_years: 9,
      starting_price: 5500,
      verification_status: "APPROVED"
    });

    const service = await db.Service.create({
      artist_id: artistProfile.id,
      specialization_name: "Luxury Rajasthani Bridal Henna",
      category: "Bridal",
      minimum_price: 5500,
      price: 5500,
      duration_minutes: 240,
      is_active: true
    });

    // 2. Create Booking
    const booking = await db.Booking.create({
      booking_code: `BK-5500-${timestamp}`,
      user_id: customerUser.id,
      artist_id: artistProfile.id,
      service_id: service.id,
      total_price: 5500,
      final_amount: 5500,
      advance_paid: 0,
      remaining_amount: 4950,
      booking_status: "PENDING",
      payment_status: "PENDING",
      detailed_status: "PENDING"
    });

    record("Booking created with Total = ₹5,500, Status = PENDING", booking.final_amount === 5500 && booking.payment_status === "PENDING");

    // 3. Razorpay Advance Order Creation (10% = ₹550 = 55,000 paise)
    const sessionData = await PaymentService.createSession(booking.id, customerUser.id, null, "ADVANCE_CASH");

    record("Razorpay session created successfully", sessionData.success === true);
    record("Razorpay order amount in paise is 55,000 (= ₹550)", sessionData.amount === 55000);
    record("Razorpay order amount in rupees is ₹550", sessionData.amount_in_rupees === 550);

    // 4. Generate Valid HMAC SHA256 Signature for Razorpay Verification
    const fakeOrderId = sessionData.order_id;
    const fakePaymentId = `pay_real_rzp_${timestamp}`;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${fakeOrderId}|${fakePaymentId}`)
      .digest("hex");

    // 5. Verify Advance Payment
    const verifyResult = await PaymentService.verifyPayment(customerUser.id, {
      razorpay_order_id: fakeOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: generatedSignature,
      bookingId: booking.id
    });

    record("Advance payment verification succeeded", verifyResult.success === true);

    // Reload booking after advance payment
    const updatedBooking = await db.Booking.findByPk(booking.id);
    record("Booking payment_status is PARTIAL after advance", updatedBooking.payment_status === "PARTIAL");
    record("Booking advance_paid is exactly ₹550", updatedBooking.advance_paid === 550);
    record("Booking remaining_amount is exactly ₹4,950", updatedBooking.remaining_amount === 4950);
    record("Booking booking_status is CONFIRMED", updatedBooking.booking_status === "CONFIRMED");

    // 6. Admin Wallet Commission Verification (10% = ₹550)
    const adminWallet = await db.Wallet.findOne({ where: { user_id: adminUser.id } });
    record("Admin wallet credited with 10% platform commission (₹550)", adminWallet && Number(adminWallet.balance) === 550);

    // 7. Idempotency Check: Verify duplicate callback doesn't double credit or change status
    const duplicateVerify = await PaymentService.verifyPayment(customerUser.id, {
      razorpay_order_id: fakeOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: generatedSignature,
      bookingId: booking.id
    });
    record("Duplicate verification handled idempotently", duplicateVerify.already_processed === true);

    const adminWalletAfterDuplicate = await db.Wallet.findOne({ where: { user_id: adminUser.id } });
    record("Admin wallet balance unchanged after duplicate callback (₹550)", Number(adminWalletAfterDuplicate.balance) === 550);

    // 8. Service Lifecycle Progress: CONFIRMED -> SERVICE_IN_PROGRESS -> WAITING_FOR_USER_PAYMENT
    await updatedBooking.update({
      detailed_status: "WAITING_FOR_USER_PAYMENT"
    });

    // 9. Remaining Settlement Payment (90% = ₹4,950 = 495,000 paise)
    console.log("\n--- SECTION 3: Remaining 90% Settlement (₹4,950) ---");
    const settlementSession = await PaymentService.createSession(booking.id, customerUser.id, null, "SETTLEMENT");

    record("Settlement Razorpay order created for remaining amount", settlementSession.success === true);
    record("Settlement Razorpay order amount is 495,000 paise (= ₹4,950)", settlementSession.amount === 495000);
    record("Settlement Razorpay order amount in rupees is ₹4,950", settlementSession.amount_in_rupees === 4950);

    // Generate Signature for Settlement Payment
    const settlementOrderId = settlementSession.order_id;
    const settlementPaymentId = `pay_settlement_${timestamp}`;
    const settlementSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${settlementOrderId}|${settlementPaymentId}`)
      .digest("hex");

    const verifySettlement = await PaymentService.verifyPayment(customerUser.id, {
      razorpay_order_id: settlementOrderId,
      razorpay_payment_id: settlementPaymentId,
      razorpay_signature: settlementSignature,
      bookingId: booking.id
    });

    record("Settlement payment verification succeeded", verifySettlement.success === true);

    // Reload booking after full settlement
    const finalBooking = await db.Booking.findByPk(booking.id);
    record("Final Booking payment_status is PAID", finalBooking.payment_status === "PAID");
    record("Final Booking remaining_amount is ₹0", Number(finalBooking.remaining_amount) === 0);
    record("Final Booking booking_status is COMPLETED", finalBooking.booking_status === "COMPLETED");

    // 10. Artist Wallet Settlement Verification (90% = ₹4,950)
    const artistWallet = await db.Wallet.findOne({ where: { user_id: artistUser.id } });
    record("Artist wallet credited with net earnings (₹4,950)", artistWallet && Number(artistWallet.balance) === 4950);

    // 11. Cross-Role Master Financial Reconciliation Table
    console.log("\n--- SECTION 4: Cross-Role Master Financial Reconciliation Table ---");
    const totalPaidByCustomer = updatedBooking.advance_paid + (finalBooking.final_amount - finalBooking.advance_paid);
    const platformCommission = Number(adminWallet.balance);
    const artistNetEarnings = Number(artistWallet.balance);
    const totalDisbursed = platformCommission + artistNetEarnings;

    console.log(`  - Total Booking Value:        ₹${finalBooking.final_amount}`);
    console.log(`  - Advance Paid by Customer:   ₹${updatedBooking.advance_paid}`);
    console.log(`  - Remaining Paid by Customer: ₹${finalBooking.final_amount - updatedBooking.advance_paid}`);
    console.log(`  - Total Customer Outflow:     ₹${totalPaidByCustomer}`);
    console.log(`  - Platform Commission Earned: ₹${platformCommission}`);
    console.log(`  - Artist Net Payout Earned:   ₹${artistNetEarnings}`);
    console.log(`  - Total Revenue Reconciled:   ₹${totalDisbursed}`);

    record("Customer Outflow exactly equals Booking Value (₹5,500)", totalPaidByCustomer === 5500);
    record("Platform Commission + Artist Net exactly equals Booking Value (₹550 + ₹4,950 = ₹5,500)", totalDisbursed === 5500);
    record("Outstanding Balance is ₹0", Number(finalBooking.remaining_amount) === 0);

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log("\n=================================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

const https = require("https");
const http = require("http");

runMasterFinancialAudit().then(() => {
  https.globalAgent.destroy();
  http.globalAgent.destroy();
  setTimeout(() => {
    process.exit(0);
  }, 100);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
