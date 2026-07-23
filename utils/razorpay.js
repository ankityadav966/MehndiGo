const Razorpay = require("razorpay");
const crypto = require("crypto");
const AppError = require("./errors/app.error");

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_SECRET;

  if (!key_id || !key_secret) {
    throw new AppError("Razorpay API keys are not configured in environment variables", 500);
  }

  return new Razorpay({
    key_id: key_id,
    key_secret: key_secret,
  });
};

const createRazorpayOrder = async (orderData) => {
  try {
    const razorpay = getRazorpayInstance();
    const options = {
      amount: Math.round(Number(orderData.amount) * 100), // Amount in paise
      currency: orderData.currency || "INR",
      receipt: String(orderData.orderId),
      notes: {
        customerId: String(orderData.customerId),
        customerEmail: orderData.customerEmail || "",
        customerPhone: orderData.customerPhone || "",
        note: orderData.note || "MehndiGo Payment"
      }
    };
    
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    throw new AppError(error.description || error.message || "Failed to create Razorpay order", 400);
  }
};

const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  try {
    const key_secret = process.env.RAZORPAY_SECRET;
    if (!key_secret) {
      throw new AppError("Razorpay secret not configured", 500);
    }
    
    const generatedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
      
    if (generatedSignature === signature) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Razorpay Signature Verification Error:", error);
    return false;
  }
};

const initiateRazorpayRefund = async (paymentId, refundAmount, note) => {
  try {
    const razorpay = getRazorpayInstance();
    const options = {
      amount: Math.round(Number(refundAmount) * 100), // Amount in paise
      notes: {
        reason: note || "Booking Cancellation Refund"
      }
    };
    
    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    console.error("Razorpay Refund Error:", error);
    throw new AppError(error.description || error.message || "Failed to initiate Razorpay refund", 400);
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  initiateRazorpayRefund
};
