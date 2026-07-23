const express = require("express");
const router = express.Router();
const v1Routes = require("./v1");
const razorpayUtil = require("../utils/razorpay");
const ArtistService = require("../services/artist.services");

router.use("/v1", v1Routes);

/**
 * @route POST /api/create-order
 * @desc Create a Razorpay payment order
 */
router.post("/create-order", async (req, res) => {
  try {
    const { amount, currency, receipt, booking_id } = req.body;

    if (booking_id) {
      const response = await ArtistService.createOrder(booking_id, amount);
      return res.status(200).json({
        success: true,
        order_id: response.order_id,
        amount: response.amount,
        currency: response.currency
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount in paise is required"
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum order amount must be at least 100 paise"
      });
    }

    const order = await razorpayUtil.createRazorpayOrder({
      amount: numericAmount,
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`
    });

    return res.status(200).json({
      success: true,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
      error
    });
  }
});

/**
 * @route POST /api/verify-payment
 * @desc Verify Razorpay payment HMAC-SHA256 signature
 */
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
      payment_id,
      signature,
      booking_id
    } = req.body;

    const rOrderId = razorpay_order_id || order_id;
    const rPaymentId = razorpay_payment_id || payment_id;
    const rSignature = razorpay_signature || signature;

    if (!rOrderId || !rPaymentId || !rSignature) {
      return res.status(400).json({
        success: false,
        message: "Missing required verification fields (order_id, payment_id, signature)"
      });
    }

    if (booking_id) {
      const result = await ArtistService.verifyPayment({
        booking_id,
        razorpay_order_id: rOrderId,
        razorpay_payment_id: rPaymentId,
        razorpay_signature: rSignature
      });

      return res.status(200).json(result);
    }

    const isValid = razorpayUtil.verifyRazorpaySignature({
      razorpay_order_id: rOrderId,
      razorpay_payment_id: rPaymentId,
      razorpay_signature: rSignature
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature. Payment verification failed."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      order_id: rOrderId,
      payment_id: rPaymentId
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Payment verification failed",
      error
    });
  }
});

module.exports = router;
