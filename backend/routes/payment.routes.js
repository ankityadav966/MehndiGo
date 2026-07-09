const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment/payment.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Webhooks (Public endpoint)
router.post("/webhook", PaymentController.handleWebhook);

// Public hosted payment endpoints
router.get("/checkout", PaymentController.renderCheckoutPage);
router.post("/verify-hosted", PaymentController.verifyHostedPayment);

// Protected payment endpoints
router.post("/create-session", authenticate, PaymentController.createSession);
router.post("/verify", authenticate, PaymentController.verifyPayment);
router.post("/wallet-pay", authenticate, PaymentController.payWithWallet);
router.get("/history", authenticate, PaymentController.getPaymentHistory);
router.get("/refund-history", authenticate, PaymentController.getRefundHistory);
router.post("/refund", authenticate, PaymentController.initiateRefund);
router.post("/retry", authenticate, PaymentController.retryPayment);
router.get("/invoice/:bookingId", authenticate, PaymentController.getInvoiceByBooking);
router.get("/receipt/:bookingId", PaymentController.getReceiptHTML);
router.get("/:id", authenticate, PaymentController.getPaymentById);

module.exports = router;
