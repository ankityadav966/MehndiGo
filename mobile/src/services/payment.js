import apiRequest from "./api";

export async function createPaymentSession(bookingIdOrPayload, paymentMethodOrAmount, purpose, isSettlement = false) {
  let payload = {};
  if (typeof bookingIdOrPayload === "object" && bookingIdOrPayload !== null) {
    payload = {
      ...bookingIdOrPayload,
      bookingId: bookingIdOrPayload.bookingId || bookingIdOrPayload.booking_id || null,
      checkoutData: bookingIdOrPayload.checkoutData || bookingIdOrPayload.checkout_data || null,
      isSettlement: Boolean(bookingIdOrPayload.isSettlement || bookingIdOrPayload.is_settlement)
    };
  } else {
    const bookingId = bookingIdOrPayload;
    const isNumber = typeof paymentMethodOrAmount === "number";
    const isSet = isSettlement || paymentMethodOrAmount === "SETTLEMENT" || paymentMethodOrAmount === "REMAINING_PAYMENT" || paymentMethodOrAmount === "FINAL" || purpose === "settlement" || purpose === "booking_remaining";
    payload = isNumber
      ? {
          bookingId,
          amount: paymentMethodOrAmount,
          payment_mode: isSet ? "SETTLEMENT" : "FULL_ONLINE",
          purpose: purpose || (isSet ? "booking_remaining" : (!bookingId ? "recharge" : "booking")),
          isSettlement: Boolean(isSet)
        }
      : {
          bookingId,
          payment_mode: paymentMethodOrAmount || (isSet ? "SETTLEMENT" : "ADVANCE_CASH"),
          purpose: purpose || (isSet ? "booking_remaining" : "booking"),
          isSettlement: Boolean(isSet),
          is_settlement: Boolean(isSet)
        };
  }
  const res = await apiRequest("POST", "/payment/create-session", payload, true);
  return res?.data || res;
}

export async function createPaymentOrder(bookingId, paymentMethodOrAmount, purpose, isSettlement = false) {
  return await createPaymentSession(bookingId, paymentMethodOrAmount, purpose, isSettlement);
}

export async function verifyPaymentSignature(paymentDetails) {
  const res = await apiRequest("POST", "/payment/verify", paymentDetails, true);
  return res?.data || res;
}

export async function getPaymentHistory() {
  const res = await apiRequest("GET", "/payment/history", null, true);
  return res?.data || res;
}

export async function getRefundHistory() {
  const res = await apiRequest("GET", "/payment/refund-history", null, true);
  return res?.data || res;
}

export async function getTransactionDetails(paymentId) {
  const res = await apiRequest("GET", `/payment/${paymentId}`, null, true);
  return res?.data || res;
}

export async function initiatePaymentRefund(bookingId, reason) {
  const res = await apiRequest("POST", "/payment/refund", { bookingId, reason }, true);
  return res?.data || res;
}

export async function retryPaymentOrder(bookingId) {
  const res = await apiRequest("POST", "/payment/retry", { bookingId }, true);
  return res?.data || res;
}

export async function getInvoiceDetails(bookingId) {
  const res = await apiRequest("GET", `/payment/invoice/${bookingId}`, null, true);
  return res?.data || res;
}

export async function payWithWallet(bookingId) {
  const res = await apiRequest("POST", "/payment/wallet-pay", { bookingId }, true);
  return res?.data || res;
}
