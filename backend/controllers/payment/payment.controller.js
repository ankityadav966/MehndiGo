const PaymentService = require("../../services/payment.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

async function createOrder(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await PaymentService.createOrder(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Razorpay order created successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function verifyPayment(req, res) {
  try {
    const response = await PaymentService.verifyPayment(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Payment verified successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function handleWebhook(req, res) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    const response = await PaymentService.handleWebhook(rawBody, signature);
    return res.status(200).json(SuccessResponse("Webhook event processed", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getPaymentHistory(req, res) {
  try {
    const response = await PaymentService.getPaymentHistory(req.user.id, req.user.role);
    return res.status(200).json(SuccessResponse("Payment history fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getPaymentById(req, res) {
  try {
    const response = await PaymentService.getPaymentById(req.params.id);
    return res.status(200).json(SuccessResponse("Payment details fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function initiateRefund(req, res) {
  try {
    const { bookingId, reason } = req.body;
    const response = await PaymentService.initiateRefund(bookingId, reason, req.user.id);
    return res.status(200).json(SuccessResponse("Refund processed successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getRefundHistory(req, res) {
  try {
    const response = await PaymentService.getRefundHistory(req.user.id, req.user.role);
    return res.status(200).json(SuccessResponse("Refund history fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getInvoiceByBooking(req, res) {
  try {
    const response = await PaymentService.getInvoiceByBooking(req.params.bookingId);
    return res.status(200).json(SuccessResponse("Invoice fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function retryPayment(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await PaymentService.retryPayment(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Payment retry order created", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentById,
  initiateRefund,
  getRefundHistory,
  getInvoiceByBooking,
  retryPayment
};
