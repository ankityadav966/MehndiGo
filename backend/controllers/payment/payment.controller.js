const PaymentService = require("../../services/payment.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

async function createSession(req, res) {
  try {
    const { bookingId, amount } = req.body;
    const response = await PaymentService.createSession(bookingId, req.user.id, amount);
    return res.status(200).json(SuccessResponse("Razorpay payment order created successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function verifyPayment(req, res) {
  try {
    console.log("[VERIFY_PAYMENT_ROUTE] User ID:", req.user.id, "Request body:", JSON.stringify(req.body, null, 2));
    const response = await PaymentService.verifyPayment(req.user.id, req.body);
    console.log("[VERIFY_PAYMENT_ROUTE] Success. Response:", JSON.stringify(response, null, 2));
    return res.status(200).json(SuccessResponse("Payment verified successfully", response));
  } catch (error) {
    console.error("[VERIFY_PAYMENT_ROUTE] Error processing payment verification:", error.message, error.stack);
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function handleWebhook(req, res) {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    const response = await PaymentService.handleWebhook(rawBody, signature, timestamp);
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

async function getReceiptHTML(req, res) {
  try {
    const { bookingId } = req.params;
    const BookingService = require("../../services/booking.services");
    
    let inv;
    try {
      inv = await BookingService.getInvoice(bookingId);
    } catch (e) {}
    
    const booking = await BookingService.getBookingDetails(bookingId, null, null);
    if (!booking) {
      return res.status(404).send("Booking not found");
    }
    
    const invoiceNum = inv ? inv.invoice_number : `INV-${Date.now()}`;
    const dateStr = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-US", {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : new Date().toLocaleDateString("en-US", {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MehndiGo Receipt - Invoice</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9; }
    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); background: #fff; border-radius: 12px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ff7e5f; padding-bottom: 20px; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: 800; color: #ff7e5f; }
    .company-details { text-align: right; font-size: 12px; color: #777; }
    .invoice-details { margin-bottom: 20px; font-size: 13px; color: #555; line-height: 1.6; }
    .billing-section { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px; }
    .billing-col { width: 48%; }
    .billing-title { font-weight: 700; color: #ff7e5f; border-bottom: 1px dashed #eee; padding-bottom: 5px; margin-bottom: 10px; font-size: 14px; }
    .billing-text { font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #fdf5f2; color: #ff7e5f; text-align: left; padding: 12px; font-size: 13px; font-weight: 700; border-bottom: 2px solid #eee; }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 300px; margin-top: 10px; }
    .totals-table td { border-bottom: none; padding: 6px 12px; }
    .grand-total { font-weight: 800; color: #ff7e5f; font-size: 16px; border-top: 2px solid #eee; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }
    @media (max-width: 600px) {
      .header { flex-direction: column; text-align: center; gap: 10px; }
      .company-details { text-align: center; }
      .billing-section { flex-direction: column; gap: 20px; }
      .billing-col { width: 100%; }
      .totals { justify-content: center; }
      .totals-table { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div class="logo">MehndiGo</div>
      <div class="company-details">
        <strong>MehndiGo Technologies Pvt. Ltd.</strong><br>
        info@mehndigo.com<br>
        www.mehndigo.com
      </div>
    </div>
    
    <div class="invoice-details">
      <strong>Receipt Number:</strong> ${invoiceNum}<br>
      <strong>Date:</strong> ${dateStr}<br>
      <strong>Booking Code:</strong> ${booking.booking_code}<br>
      <strong>Status:</strong> ${booking.payment_status || 'PAID'}
    </div>
    
    <div class="billing-section">
      <div class="billing-col">
        <div class="billing-title">Customer Details</div>
        <div class="billing-text">
          <strong>${booking.user?.name || 'Customer'}</strong><br>
          Phone: ${booking.user?.phone || 'N/A'}<br>
          Email: ${booking.user?.email || 'N/A'}<br>
          Address: ${booking.address || 'N/A'}
        </div>
      </div>
      <div class="billing-col">
        <div class="billing-title">Artist Details</div>
        <div class="billing-text">
          <strong>${booking.artist?.user?.name || 'Artist'}</strong><br>
          Phone: ${booking.artist?.user?.phone || 'N/A'}<br>
          Email: ${booking.artist?.user?.email || 'N/A'}
        </div>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Service Name</th>
          <th>Rate</th>
          <th>Travel</th>
          <th>GST</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${booking.service?.specialization_name || 'Henna Styling'}</td>
          <td>₹${booking.total_price}</td>
          <td>₹${booking.travel_charges}</td>
          <td>₹${booking.gst}</td>
          <td>₹${booking.final_amount}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td style="text-align: right;">₹${booking.total_price + booking.travel_charges}</td>
        </tr>
        <tr>
          <td>GST (18%):</td>
          <td style="text-align: right;">₹${booking.gst}</td>
        </tr>
        ${booking.coupon_discount > 0 ? `
        <tr style="color: #ff7e5f;">
          <td>Discount:</td>
          <td style="text-align: right;">-₹${booking.coupon_discount}</td>
        </tr>
        ` : ''}
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td style="text-align: right;">₹${booking.final_amount}</td>
        </tr>
      </table>
    </div>
    
    <div class="footer">
      Thank you for choosing MehndiGo. This is a computer generated invoice and does not require physical signature.
    </div>
  </div>
</body>
</html>
    `;
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send("Error generating receipt html");
  }
}

async function payWithWallet(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await PaymentService.payWithWallet(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Payment completed using MehndiGo Wallet", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function renderCheckoutPage(req, res) {
  try {
    const { orderId, amount, bookingId, redirect, paymentSessionId } = req.query;
    const env = process.env.CASHFREE_ENV === "PRODUCTION" ? "api" : "sandbox";
    const sessionId = paymentSessionId || orderId;
    const cfUrl = `https://${env}.cashfree.com/pg/view/checkout?session_id=${sessionId}`;
    return res.redirect(cfUrl);
  } catch (error) {
    return res.status(500).send("Error redirecting to Cashfree checkout");
  }
}

async function verifyHostedPayment(req, res) {
  try {
    const response = await PaymentService.verifyPaymentPublic(req.body);
    return res.status(200).json(SuccessResponse("Payment verified successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  createSession,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentById,
  initiateRefund,
  getRefundHistory,
  getInvoiceByBooking,
  retryPayment,
  getReceiptHTML,
  payWithWallet,
  renderCheckoutPage,
  verifyHostedPayment
};
