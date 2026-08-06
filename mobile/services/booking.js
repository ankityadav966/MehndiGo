import apiRequest from "./api";

export async function getPriceDetails(serviceId, couponCode = null, slotCount = 1) {
  let endpoint = `/booking/price-details?serviceId=${serviceId}&slotCount=${slotCount}`;
  if (couponCode) {
    endpoint += `&couponCode=${encodeURIComponent(couponCode)}`;
  }
  const res = await apiRequest("GET", endpoint, null, true);
  return res?.data || res;
}

export async function createBooking(bookingData) {
  const res = await apiRequest("POST", "/booking/create", bookingData, true);
  return res?.data || res;
}

export async function getBookingDetails(id) {
  const res = await apiRequest("GET", `/booking/details/${id}`, null, true);
  return res?.data || res;
}

export async function getBookingHistory() {
  const res = await apiRequest("GET", "/booking/history", null, true);
  return res?.data || res;
}

export async function applyCoupon(couponCode, serviceId) {
  const res = await apiRequest("POST", "/booking/apply-coupon", { couponCode, serviceId }, true);
  return res?.data || res;
}

export async function createPaymentSession(bookingId) {
  const res = await apiRequest("POST", "/booking/create-session", { bookingId }, true);
  return res?.data || res;
}

export async function verifyPayment(paymentDetails) {
  const res = await apiRequest("POST", "/booking/verify-payment", paymentDetails, true);
  return res?.data || res;
}

export async function checkRestrictedBooking() {
  try {
    const res = await apiRequest("GET", "/booking/check-restricted", null, true);
    return res?.data || res || { hasRestricted: false };
  } catch (err) {
    return { hasRestricted: false };
  }
}

export async function selectCashPayment(bookingId) {
  const res = await apiRequest("PUT", "/booking/select-cash", { bookingId }, true);
  return res?.data || res;
}

export async function confirmCashPayment(bookingId) {
  const res = await apiRequest("PUT", "/booking/confirm-cash", { bookingId }, true);
  return res?.data || res;
}

export async function rejectCashPayment(bookingId) {
  const res = await apiRequest("PUT", "/booking/reject-cash", { bookingId }, true);
  return res?.data || res;
}

export async function cancelBooking(bookingId, cancelReason) {
  const res = await apiRequest("PUT", "/booking/cancel", { bookingId, cancelReason }, true);
  return res?.data || res;
}

export async function rescheduleBooking(bookingId, date, time) {
  const res = await apiRequest("PUT", "/booking/reschedule", { bookingId, date, time }, true);
  return res?.data || res;
}

export async function acceptBooking(bookingId) {
  const res = await apiRequest("PUT", "/booking/accept", { bookingId }, true);
  return res?.data || res;
}

export async function rejectBooking(bookingId, rejectReason) {
  const res = await apiRequest("PUT", "/booking/reject", { bookingId, rejectReason }, true);
  return res?.data || res;
}

export async function updateOnTheWay(bookingId) {
  const res = await apiRequest("PUT", "/booking/on-the-way", { bookingId }, true);
  return res?.data || res;
}

export async function updateArrived(bookingId) {
  const res = await apiRequest("PUT", "/booking/arrived", { bookingId }, true);
  return res?.data || res;
}

export async function startService(bookingId) {
  const res = await apiRequest("PUT", "/booking/start", { bookingId }, true);
  return res?.data || res;
}

export async function completeService(bookingId) {
  const res = await apiRequest("PUT", "/booking/complete", { bookingId }, true);
  return res?.data || res;
}

export async function getInvoice(bookingId) {
  const res = await apiRequest("GET", `/booking/invoice?bookingId=${bookingId}`, null, true);
  return res?.data || res;
}

export async function getPendingPayment() {
  const res = await apiRequest("GET", "/booking/pending", null, true);
  return res && res.success ? res.data : null;
}

export async function updateArtistLocation(payload) {
  const res = await apiRequest("POST", "/api/v1/mehndigo/artist/location/update", payload, true);
  return res?.data || res;
}

export async function getArtistLocation(bookingId) {
  const res = await apiRequest("GET", `/booking/${bookingId}/location`, null, true);
  return res?.data || res;
}

export async function sendCheckInOtp(bookingId) {
  const res = await apiRequest("POST", "/booking/send-checkin-otp", { bookingId }, true);
  return res?.data || res;
}

export async function verifyCheckInOtp(bookingId, otp) {
  const res = await apiRequest("POST", "/booking/verify-checkin-otp", { bookingId, otp }, true);
  return res?.data || res;
}

export async function sendCheckOutOtp(bookingId) {
  const res = await apiRequest("POST", "/booking/send-checkout-otp", { bookingId }, true);
  return res?.data || res;
}

export async function verifyCheckOutOtp(bookingId, otp) {
  const res = await apiRequest("POST", "/booking/verify-checkout-otp", { bookingId, otp }, true);
  return res?.data || res;
}
