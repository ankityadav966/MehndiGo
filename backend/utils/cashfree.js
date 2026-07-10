const AppError = require("./errors/app.error");

const getCashfreeConfig = () => {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const env = process.env.CASHFREE_ENV || "SANDBOX";

  const baseUrl = env.toUpperCase() === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

  return { clientId, clientSecret, baseUrl };
};

const createCashfreeOrder = async (orderData) => {
  const { clientId, clientSecret, baseUrl } = getCashfreeConfig();

  if (!clientId || !clientSecret) {
    throw new AppError("Cashfree API keys are not configured in environment variables", 500);
  }

  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer_details: {
          customer_id: String(orderData.customerId),
          customer_email: orderData.customerEmail || "customer@example.com",
          customer_phone: orderData.customerPhone || "9999999999",
          customer_name: orderData.customerName || "Customer"
        },
        order_id: orderData.orderId,
        order_amount: Number(orderData.amount),
        order_currency: orderData.currency || "INR",
        order_note: orderData.note || "MehndiGo Payment"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Cashfree Order Creation Error Response:", data);
      throw new AppError(data.message || "Failed to create Cashfree order", response.status || 400);
    }
    return data;
  } catch (error) {
    console.error("Cashfree API Exception:", error.message);
    throw error;
  }
};

const getCashfreeOrder = async (orderId) => {
  const { clientId, clientSecret, baseUrl } = getCashfreeConfig();

  if (!clientId || !clientSecret) {
    throw new AppError("Cashfree API keys are not configured in environment variables", 500);
  }

  try {
    const response = await fetch(`${baseUrl}/orders/${orderId}`, {
      method: "GET",
      headers: {
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2023-08-01"
      }
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Cashfree Fetch Order Error Response:", data);
      throw new AppError(data.message || "Failed to fetch Cashfree order", response.status || 400);
    }
    return data;
  } catch (error) {
    console.error("Cashfree Fetch Order Exception:", error.message);
    throw error;
  }
};

const initiateCashfreeRefund = async (orderId, refundAmount, refundId, note) => {
  const { clientId, clientSecret, baseUrl } = getCashfreeConfig();

  if (!clientId || !clientSecret) {
    throw new AppError("Cashfree API keys are not configured in environment variables", 500);
  }

  try {
    const response = await fetch(`${baseUrl}/orders/${orderId}/refunds`, {
      method: "POST",
      headers: {
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refund_amount: Number(refundAmount),
        refund_id: refundId,
        refund_note: note || "Booking Cancellation Refund"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Cashfree Refund Error Response:", data);
      throw new AppError(data.message || "Failed to initiate Cashfree refund", response.status || 400);
    }
    return data;
  } catch (error) {
    console.error("Cashfree Refund Exception:", error.message);
    throw error;
  }
};

module.exports = {
  createCashfreeOrder,
  getCashfreeOrder,
  initiateCashfreeRefund
};
