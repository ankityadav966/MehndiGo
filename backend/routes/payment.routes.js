const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment/payment.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Webhooks (Public endpoint)
router.post("/webhook", PaymentController.handleWebhook);

// Protected payment endpoints
router.post("/create-order", authenticate, PaymentController.createOrder);
router.post("/verify", authenticate, PaymentController.verifyPayment);
router.get("/history", authenticate, PaymentController.getPaymentHistory);
router.get("/refund-history", authenticate, PaymentController.getRefundHistory);
router.post("/refund", authenticate, PaymentController.initiateRefund);
router.post("/retry", authenticate, PaymentController.retryPayment);
router.get("/invoice/:bookingId", authenticate, PaymentController.getInvoiceByBooking);
router.get("/:id", authenticate, PaymentController.getPaymentById);

module.exports = router;
