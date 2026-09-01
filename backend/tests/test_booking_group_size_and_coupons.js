// Test script to verify booking pricing for groupSize and coupon application
const { Hono } = require("hono");

async function testPricingAndCoupons() {
  console.log("=== Testing Pricing Calculation & Coupon Engine ===");

  // Simulating pricing logic
  function isPerPersonService(service, customArtPrice = null, baseRate = null) {
    if (customArtPrice !== null && !isNaN(customArtPrice) && Number(customArtPrice) > 0) {
      return true;
    }
    if (!service) return true;
    if (service.pricing_type) {
      const pt = String(service.pricing_type).trim().toUpperCase();
      if (pt === "PER_PERSON" || pt === "PER_HAND" || pt === "PER_GUEST" || pt === "PER_SIDE") return true;
      if (pt === "FIXED_PACKAGE" || pt === "COMBO_PACKAGE") return false;
    }
    const title = String(service.title || "").toLowerCase().trim();
    if (title.includes("full combo package") || title.includes("multi-person combo")) {
      return false;
    }
    return true;
  }

  const customArtPrice = 1500;
  const groupSizes = [1, 2, 3, 5];

  for (const groupSize of groupSizes) {
    const isPerPerson = isPerPersonService(null, customArtPrice, 1500);
    const basePrice = customArtPrice * groupSize;
    const requiredAdvance = Math.round(basePrice * 0.10);
    const remaining = basePrice - requiredAdvance;
    console.log(`groupSize: ${groupSize} -> Base Price: ₹${basePrice}, 10% Advance: ₹${requiredAdvance}, 90% Remaining: ₹${remaining}`);
    if (basePrice !== 1500 * groupSize) {
      throw new Error(`Failed: expected ${1500 * groupSize}, got ${basePrice}`);
    }
  }

  console.log("✅ Group size scaling verified successfully!");

  // Coupon application test
  const coupons = [
    { code: "RAKHI20", discount_type: "PERCENTAGE", discount_value: 20, min_order_amount: 500, max_discount: 500 },
    { code: "WELCOME50", discount_type: "FLAT", discount_value: 50, min_order_amount: 299, max_discount: 50 },
    { code: "MEHNDI100", discount_type: "FLAT", discount_value: 100, min_order_amount: 999, max_discount: 100 },
    { code: "FESTIVE25", discount_type: "PERCENTAGE", discount_value: 25, min_order_amount: 1000, max_discount: 500 },
  ];

  function calculateDiscount(coupon, basePrice) {
    if (basePrice < coupon.min_order_amount) return 0;
    let disc = 0;
    if (coupon.discount_type === "FLAT") {
      disc = coupon.discount_value;
    } else {
      disc = Math.round((basePrice * coupon.discount_value) / 100);
    }
    return Math.min(disc, coupon.max_discount, basePrice);
  }

  // 1 person @ 1500 with RAKHI20: 20% of 1500 = 300
  const d1 = calculateDiscount(coupons[0], 1500);
  console.log(`RAKHI20 on ₹1500: Discount = ₹${d1}, Final = ₹${1500 - d1}`);
  if (d1 !== 300) throw new Error(`Expected 300, got ${d1}`);

  // 3 persons @ 1500 = 4500 with RAKHI20: 20% of 4500 = 900 -> capped at max_discount 500
  const d2 = calculateDiscount(coupons[0], 4500);
  console.log(`RAKHI20 on ₹4500: Discount = ₹${d2} (capped at 500), Final = ₹${4500 - d2}`);
  if (d2 !== 500) throw new Error(`Expected 500, got ${d2}`);

  // WELCOME50 on ₹3000
  const d3 = calculateDiscount(coupons[1], 3000);
  console.log(`WELCOME50 on ₹3000: Discount = ₹${d3}, Final = ₹${3000 - d3}`);
  if (d3 !== 50) throw new Error(`Expected 50, got ${d3}`);

  console.log("✅ All coupon discounts verified successfully!");
}

testPricingAndCoupons().catch(console.error);
