const db = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/errors/app.error");

class CouponService {
  /**
   * Validate a coupon against customer status, service constraints, and amount limits
   */
  async validateCoupon(couponCode, userId, bookingValue, details = {}) {
    const coupon = await db.Coupon.findOne({
      where: {
        code: couponCode,
        is_active: true,
        expires_at: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!coupon) {
      throw new AppError("Invalid or expired coupon code", 400);
    }

    // 1. Min Booking Value constraint
    if (bookingValue < coupon.min_booking_value) {
      throw new AppError(`Minimum booking value of ₹${coupon.min_booking_value} is required to apply this coupon`, 400);
    }

    // 2. Global Usage Limit check
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      throw new AppError("This coupon code has reached its maximum usage limit", 400);
    }

    // 3. Per User Limit check
    const userUsageCount = await db.CouponUsage.count({
      where: {
        user_id: userId,
        coupon_id: coupon.id
      }
    });

    if (userUsageCount >= coupon.per_user_limit) {
      throw new AppError(`You can only use this coupon code ${coupon.per_user_limit} time(s)`, 400);
    }

    // 4. First Booking / Welcome check
    if (coupon.first_booking_only) {
      const completedBookings = await db.Booking.count({
        where: {
          user_id: userId,
          booking_status: { [Op.in]: ["CONFIRMED", "COMPLETED"] }
        }
      });

      if (completedBookings > 0) {
        throw new AppError("This Welcome coupon is only applicable on your first booking", 400);
      }
    }

    // 5. City Specific constraint check
    if (coupon.applicable_cities && details.city) {
      // Expect comma-separated or JSON list of cities
      let cities = [];
      try {
        cities = JSON.parse(coupon.applicable_cities);
      } catch (e) {
        cities = coupon.applicable_cities.split(",").map(c => c.trim().toLowerCase());
      }
      
      const isApplicable = cities.some(c => c.toLowerCase() === details.city.toLowerCase());
      if (!isApplicable) {
        throw new AppError("This coupon code is not applicable in your city", 400);
      }
    }

    // 6. Category Specific constraint check
    if (coupon.applicable_categories && details.categoryId) {
      const categories = coupon.applicable_categories.split(",").map(c => c.trim());
      const isApplicable = categories.includes(details.categoryId.toString());
      if (!isApplicable) {
        throw new AppError("This coupon code is not applicable on the selected service category", 400);
      }
    }

    // 7. Artist Specific constraint check
    if (coupon.applicable_artists && details.artistId) {
      const artists = coupon.applicable_artists.split(",").map(c => c.trim());
      const isApplicable = artists.includes(details.artistId.toString());
      if (!isApplicable) {
        throw new AppError("This coupon code is not applicable on bookings for this artist", 400);
      }
    }

    // 8. Calculate Discount
    let discount = 0;
    if (coupon.discount_type === "FLAT") {
      discount = coupon.discount_value;
    } else {
      // Percentage
      const percentage = coupon.discount_percentage || coupon.discount_value || 0;
      discount = Math.round((bookingValue * percentage) / 100);
    }

    // Clamp discount to max_discount limit
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }

    return {
      coupon,
      discount: Math.min(discount, bookingValue)
    };
  }

  /**
   * Log Coupon application usage in DB
   */
  async logCouponUsage(userId, couponId, bookingId) {
    const coupon = await db.Coupon.findByPk(couponId);
    if (!coupon) return;

    await db.CouponUsage.create({
      user_id: userId,
      coupon_id: couponId,
      booking_id: bookingId,
      used_at: new Date()
    });

    await coupon.increment("used_count", { by: 1 });
  }
}

module.exports = new CouponService();
