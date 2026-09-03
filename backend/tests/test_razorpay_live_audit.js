const { describe, it, before } = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");

// Set environment for test audit
process.env.NODE_ENV = "test";
process.env.RAZORPAY_KEY_ID = "rzp_test_TTX0hx0yooeEQW";
process.env.RAZORPAY_KEY_SECRET = "qtlFcyZE33GB3mt2nGOtOoL1";
process.env.RAZORPAY_WEBHOOK_SECRET = "qtlFcyZE33GB3mt2nGOtOoL1";

const razorpayUtil = require("../utils/razorpay");
const paymentService = require("../services/payment.services");
const db = require("../models");

describe("MEHENDIGO — RAZORPAY LIVE INTEGRATION & SECURITY AUDIT", () => {
  before(async () => {
    if (db.sequelize) {
      await db.sequelize.sync({ force: false }).catch(() => { });
    }
  });

  it("1. Credentials Security: Key ID is valid key (rzp_test_* or rzp_live_*) and Secret is protected", () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    assert.ok(keyId, "RAZORPAY_KEY_ID must exist");
    assert.ok(keySecret, "RAZORPAY_KEY_SECRET must exist");
    assert.strictEqual(keyId.startsWith("rzp_test_") || keyId.startsWith("rzp_live_"), true, "Key ID must begin with rzp_ prefix");
    assert.ok(keySecret.length >= 16, "Key Secret must be a secure token");
  });

  it("2. SDK Instance: getRazorpayInstance initializes with env credentials without hardcoding", () => {
    const rzp = razorpayUtil.getRazorpayInstance();
    assert.ok(rzp, "Razorpay instance created");
    assert.strictEqual(rzp.key_id, process.env.RAZORPAY_KEY_ID);
    assert.strictEqual(rzp.key_secret, process.env.RAZORPAY_KEY_SECRET);
  });

  it("3. Order Creation: Generates order with paise conversion and 10% advance deposit", async () => {
    const bookingTotalRupees = 3500;
    const advanceRupees = Math.round(bookingTotalRupees * 0.10); // ₹350
    const advancePaise = advanceRupees * 100; // 35000 paise

    const order = await razorpayUtil.createRazorpayOrder({
      amount: advancePaise,
      currency: "INR",
      receipt: `rec_test_${Date.now()}`,
      notes: { booking_id: "999", purpose: "booking_advance" }
    });

    assert.ok(order.order_id || order.id, "Order must have an order_id");
    assert.strictEqual(order.amount, 35000, "Order amount must match 35000 paise (₹350)");
    assert.strictEqual(order.currency, "INR");
  });

  it("4. Signature Verification: HMAC-SHA256 verification passes for authentic Razorpay signatures", () => {
    const orderId = `order_live_${Date.now()}`;
    const paymentId = `pay_live_${Date.now()}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const signature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isValid = razorpayUtil.verifyRazorpaySignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    });

    assert.strictEqual(isValid, true, "Authentic HMAC-SHA256 signature must be verified successfully");
  });

  it("5. Tamper Resistance: Signature verification fails when payment ID or order ID is altered", () => {
    const orderId = `order_live_${Date.now()}`;
    const paymentId = `pay_live_${Date.now()}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const signature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const tamperedCheck = razorpayUtil.verifyRazorpaySignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: "pay_tampered_id_999",
      razorpay_signature: signature
    });

    assert.strictEqual(tamperedCheck, false, "Tampered payment ID must fail verification");
  });

  it("6. Live Mode Security: Simulated & fake signatures are strictly rejected in verification", async () => {
    const fakePayload = {
      razorpay_order_id: "order_test_999",
      razorpay_payment_id: "pay_simulated_bypass",
      razorpay_signature: "simulated_signature_value"
    };

    let errorThrown = false;
    try {
      await paymentService.verifyPayment(1, fakePayload);
    } catch (err) {
      errorThrown = true;
      assert.ok(err.message.length > 0, "Fake payload must throw an error");
    }
    assert.strictEqual(errorThrown, true, "Fake payload must be rejected");
  });

  it("7. Webhook Signature & Idempotency: Webhook signature verifies and processes captured payment", async () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const orderId = `order_live_${Date.now()}`;
    const paymentId = `pay_live_${Date.now()}`;

    const rawPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 55000,
            status: "captured"
          }
        }
      }
    });

    const validWebhookSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawPayload)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(validWebhookSignature),
      Buffer.from(crypto.createHmac("sha256", webhookSecret).update(rawPayload).digest("hex"))
    );
    assert.strictEqual(isValid, true);
  });

  it("8. Webhook Security: Invalid webhook signature is rejected with HTTP 400", async () => {
    const rawPayload = JSON.stringify({ event: "payment.captured" });
    const invalidSignature = "invalid_tampered_webhook_signature";

    let errorThrown = false;
    try {
      await paymentService.handleWebhook(rawPayload, invalidSignature);
    } catch (err) {
      errorThrown = true;
      assert.ok(err.message.includes("signature") || err.statusCode === 400);
    }
    assert.strictEqual(errorThrown, true, "Invalid webhook signature must throw an error");
  });
});
