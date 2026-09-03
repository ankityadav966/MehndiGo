import apiRequest from "./api";

// Fetch active available promo coupons
export async function getCoupons() {
  const res = await apiRequest("GET", "/coupon", null, true);
  return res?.data || res;
}

// Apply coupon code verification
export async function applyCoupon(couponCode, serviceId, basePrice) {
  const res = await apiRequest("POST", "/coupon/apply", { couponCode, serviceId, basePrice }, true);
  return res?.data || res;
}

// Remove coupon code
export async function removeCoupon(serviceId, basePrice) {
  const res = await apiRequest("POST", "/coupon/remove", { serviceId, basePrice }, true);
  return res?.data || res;
}

// Auto-apply best available coupon for cart/booking amount
export async function autoApplyCoupon(basePrice) {
  const res = await apiRequest("POST", "/coupon/auto-apply", { basePrice }, true);
  return res?.data || res;
}

// Fetch historical used coupon records
export async function getCouponHistory() {
  const res = await apiRequest("GET", "/coupon/history", null, true);
  return res?.data || res;
}
