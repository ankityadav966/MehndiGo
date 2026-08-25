import apiRequest from "./api";

export async function createPaymentSession(bookingId, paymentMethodOrAmount, purpose) {
  const isNumber = typeof paymentMethodOrAmount === "number";
  const isSettlementMode = paymentMethodOrAmount === "SETTLEMENT" || paymentMethodOrAmount === "REMAINING_PAYMENT" || paymentMethodOrAmount === "FINAL" || purpose === "settlement" || purpose === "booking_remaining";
  const payload = isNumber
    ? { bookingId, amount: paymentMethodOrAmount, payment_mode: "FULL_ONLINE", purpose: purpose || (!bookingId ? "recharge" : "booking") }
    : {
        bookingId,
        payment_mode: paymentMethodOrAmount || (isSettlementMode ? "SETTLEMENT" : "ADVANCE_CASH"),
        purpose: purpose || (isSettlementMode ? "booking_remaining" : "booking_advance"),
        isSettlement: isSettlementMode,
        is_settlement: isSettlementMode
      };
  const res = await apiRequest("POST", "/payment/create-session", payload, true);
  return res?.data || res;
}

export async function createPaymentOrder(bookingId, paymentMethodOrAmount) {
  return await createPaymentSession(bookingId, paymentMethodOrAmount);
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
