import apiRequest from "./api";

export async function createPaymentSession(bookingId, amount) {
  const res = await apiRequest("POST", "/payment/create-session", { bookingId, amount }, true);
  return res?.data || res;
}

export async function createPaymentOrder(bookingId, amount) {
  return await createPaymentSession(bookingId, amount);
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
