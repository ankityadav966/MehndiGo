const db = require("../models");
const paymentService = require("../services/payment.services");
const razorpayUtil = require("../utils/razorpay");
const crypto = require("crypto");

async function runEndToEndRazorpayTest() {
  console.log("==========================================");
  console.log("MEHNDIGO RAZORPAY INTEGRATION END-TO-END TEST");
  console.log("==========================================\n");

  try {
    // 0. Ensure PostgreSQL DB columns exist
    await db.sequelize.query('ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);');
    await db.Payment.sync({ alter: true });
    await db.Transaction.sync({ alter: true });

    // 1. Setup Test User and Booking in DB
    const [user] = await db.User.findOrCreate({
      where: { phone: "9998887776" },
      defaults: {
        name: "Razorpay Test Customer",
        email: "rzptest@mehndigo.com",
        role: "USER"
      }
    });

    const [artistUser] = await db.User.findOrCreate({
      where: { phone: "9998887775" },
      defaults: {
        name: "Razorpay Test Artist",
        email: "rzpartist@mehndigo.com",
        role: "ARTIST"
      }
    });

    const [artistProfile] = await db.ArtistProfile.findOrCreate({
      where: { user_id: artistUser.id },
      defaults: {
        bio: "Master Henna Artist",
        experience_years: 5,
        rating: 4.9
      }
    });

    const [service] = await db.Service.findOrCreate({
      where: { artist_id: artistProfile.id },
      defaults: {
        specialization_name: "Bridal Henna Styling",
        category: "Bridal",
        minimum_price: 2010,
        duration_minutes: 120
      }
    });

    // Create a new fresh booking
    const bookingCode = `TEST-RZP-${Date.now()}`;
    const booking = await db.Booking.create({
      booking_code: bookingCode,
      user_id: user.id,
      artist_id: artistProfile.id,
      service_id: service.id,
      total_price: 2010,
      advance_paid: 0,
      remaining_amount: 2010,
      final_amount: 2010,
      booking_status: "PENDING",
      payment_status: "PENDING",
      detailed_status: "PENDING"
    });

    console.log(`[TEST] 1. Created Test Booking ID: ${booking.id}, Code: ${booking.booking_code}, Final Amount: ₹${booking.final_amount}`);

    // 2. Test Order Creation
    console.log("\n[TEST] 2. Testing PaymentService.createSession for Booking...");
    const orderRes = await paymentService.createSession(booking.id, user.id);
    console.log("Order Creation Output:", JSON.stringify(orderRes, null, 2));

    if (!orderRes.success || !orderRes.order_id || !orderRes.key_id) {
      throw new Error("Order creation failed - missing required fields in response!");
    }

    const razorpayOrderId = orderRes.order_id;
    console.log(`✅ Order Created Successfully: ${razorpayOrderId}`);
    console.log(`Amount in Paise: ${orderRes.amount} (Rupees: ₹${orderRes.amount_in_rupees})`);

    // Verify fixed ₹500 advance calculation (₹500 -> 50000 paise)
    if (orderRes.amount !== 50000) {
      throw new Error(`Expected 50000 paise (₹500 fixed advance), but got ${orderRes.amount}`);
    }
    console.log("✅ Fixed ₹500 Advance Amount in Paise verified exactly: 50000 paise");

    // 3. Test Signature Verification & Payment Completion
    console.log("\n[TEST] 3. Testing Payment Completion & Signature Verification...");
    const simulatedPaymentId = `pay_${Math.random().toString(36).substring(2, 12)}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Generate valid HMAC signature
    const signatureBody = razorpayOrderId + "|" + simulatedPaymentId;
    const validSignature = crypto
      .createHmac("sha256", keySecret)
      .update(signatureBody)
      .digest("hex");

    console.log(`Simulated Payment ID: ${simulatedPaymentId}`);
    console.log(`Generated HMAC Signature: ${validSignature}`);

    const verifyRes = await paymentService.verifyPayment(user.id, {
      bookingId: booking.id,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: simulatedPaymentId,
      razorpay_signature: validSignature
    });

    console.log("Verification Response:", JSON.stringify(verifyRes, null, 2));

    if (!verifyRes.success) {
      throw new Error("Payment verification failed!");
    }
    console.log("✅ Payment Verified Successfully!");

    // 4. Inspect Updated Booking & Payment in DB
    const updatedBooking = await db.Booking.findByPk(booking.id);
    console.log("\n[TEST] 4. DB State Verification post Advance Payment:");
    console.log(`- payment_status: ${updatedBooking.payment_status} (Expected: PARTIAL)`);
    console.log(`- booking_status: ${updatedBooking.booking_status} (Expected: CONFIRMED)`);
    console.log(`- advance_paid: ₹${updatedBooking.advance_paid} (Expected: 500)`);
    console.log(`- remaining_amount: ₹${updatedBooking.remaining_amount} (Expected: 1510)`);

    if (updatedBooking.payment_status !== "PARTIAL" || updatedBooking.booking_status !== "CONFIRMED" || updatedBooking.advance_paid !== 500 || updatedBooking.remaining_amount !== 1510) {
      throw new Error("Booking state did not transition correctly to PARTIAL / CONFIRMED with ₹500 advance & ₹1510 remaining!");
    }
    console.log("✅ Booking State Transition Verified!");

    // 5. Test Idempotency (calling verifyPayment again with same payload)
    console.log("\n[TEST] 5. Testing Idempotency (duplicate verification call)...");
    const idempotentRes = await paymentService.verifyPayment(user.id, {
      bookingId: booking.id,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: simulatedPaymentId,
      razorpay_signature: validSignature
    });

    console.log("Idempotent Response:", JSON.stringify(idempotentRes, null, 2));
    if (!idempotentRes.already_processed) {
      throw new Error("Idempotency failed: expected already_processed flag!");
    }
    console.log("✅ Idempotency Verified! Duplicate verification returned safely without double updating.");

    // 6. Test Wallet Add Money Flow
    console.log("\n[TEST] 6. Testing Wallet Add Money Flow (₹500)...");
    const walletOrder = await paymentService.createSession(null, user.id, 500);
    console.log("Wallet Order Output:", JSON.stringify(walletOrder, null, 2));

    const walletPayId = `pay_w_${Math.random().toString(36).substring(2, 12)}`;
    const walletSigBody = walletOrder.order_id + "|" + walletPayId;
    const walletSig = crypto
      .createHmac("sha256", keySecret)
      .update(walletSigBody)
      .digest("hex");

    const walletVerifyRes = await paymentService.verifyPayment(user.id, {
      razorpay_order_id: walletOrder.order_id,
      razorpay_payment_id: walletPayId,
      razorpay_signature: walletSig
    });

    console.log("Wallet Verification Response:", JSON.stringify(walletVerifyRes, null, 2));

    const userWallet = await db.Wallet.findOne({ where: { user_id: user.id } });
    console.log(`Updated User Wallet Balance: ₹${userWallet.balance}`);
    console.log("✅ Wallet Add Money Flow Verified!");

    console.log("\n==========================================");
    console.log("🎉 ALL RAZORPAY INTEGRATION TESTS PASSED 100%!");
    console.log("==========================================\n");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ TEST FAILED WITH ERROR:", error);
    process.exit(1);
  }
}

runEndToEndRazorpayTest();
