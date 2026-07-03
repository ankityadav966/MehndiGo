import apiRequest from "./api";

export async function getPriceDetails(serviceId, couponCode = null) {
  let endpoint = `/booking/price-details?serviceId=${serviceId}`;
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

export async function createRazorpayOrder(bookingId) {
  const res = await apiRequest("POST", "/booking/create-order", { bookingId }, true);
  return res?.data || res;
}

export async function verifyPayment(paymentDetails) {
  const res = await apiRequest("POST", "/booking/verify-payment", paymentDetails, true);
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
