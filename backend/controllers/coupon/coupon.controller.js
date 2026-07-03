const db = require("../../models");
const couponService = require("../../services/coupon.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");
const { Op } = require("sequelize");

// 1. GET /coupon (list active coupons)
async function getCoupons(req, res) {
  try {
    const coupons = await db.Coupon.findAll({
      where: {
        is_active: true,
        expires_at: {
          [Op.gt]: new Date()
        }
      },
      order: [["expires_at", "ASC"]]
    });

    return res.status(200).json(SuccessResponse("Active coupons fetched successfully", coupons));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 2. GET /coupon/:id
async function getCouponById(req, res) {
  try {
    const { id } = req.params;
    const coupon = await db.Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json(ErrorResponse("Coupon not found"));
    }

    return res.status(200).json(SuccessResponse("Coupon fetched successfully", coupon));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 3. POST /coupon/apply
async function applyCoupon(req, res) {
  try {
    const userId = req.user.id;
    const { couponCode, serviceId, basePrice } = req.body;

    if (!couponCode || !serviceId || !basePrice) {
      return res.status(400).json(ErrorResponse("couponCode, serviceId, and basePrice are required"));
    }

    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json(ErrorResponse("Service not found"));
    }

    const details = {
      categoryId: service.category_id || null,
      artistId: service.artist_id || null
    };

    const validation = await couponService.validateCoupon(
      couponCode,
      userId,
      basePrice,
      details
    );

    return res.status(200).json(SuccessResponse("Coupon applied successfully", {
      code: validation.coupon.code,
      discount: validation.discount,
      minBookingValue: validation.coupon.min_booking_value,
      maxDiscount: validation.coupon.max_discount
    }));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

// 4. POST /coupon/remove
async function removeCoupon(req, res) {
  try {
    const { serviceId, basePrice } = req.body;
    
    if (!serviceId || !basePrice) {
      return res.status(400).json(ErrorResponse("serviceId and basePrice are required"));
    }

    // Reset pricing parameters
    const travelCharges = 150;
    const platformFee = 50;
    const taxableAmount = basePrice + travelCharges + platformFee;
    const gst = Math.round(taxableAmount * 0.18);
    const finalAmount = taxableAmount + gst;

    return res.status(200).json(SuccessResponse("Coupon removed successfully", {
      servicePrice: basePrice,
      travelCharges,
      couponDiscount: 0,
      platformFee,
      gst,
      finalAmount
    }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 5. GET /coupon/history (used coupons log)
async function getCouponHistory(req, res) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await db.CouponUsage.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: db.Coupon,
          as: "coupon",
          attributes: ["code", "discount_type", "discount_value"]
        },
        {
          model: db.Booking,
          as: "booking",
          attributes: ["booking_code", "final_amount"]
        }
      ],
      order: [["used_at", "DESC"]],
      limit,
      offset
    });

    return res.status(200).json(SuccessResponse("Coupon usage history fetched", {
      usages: rows,
      totalCount: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit)
    }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 6. POST /admin/coupon (Admin create)
async function adminCreate(req, res) {
  try {
    const coupon = await db.Coupon.create(req.body);
    return res.status(201).json(SuccessResponse("Coupon created successfully", coupon));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 7. PUT /admin/coupon/:id (Admin update)
async function adminUpdate(req, res) {
  try {
    const { id } = req.params;
    const coupon = await db.Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json(ErrorResponse("Coupon not found"));
    }

    await coupon.update(req.body);
    return res.status(200).json(SuccessResponse("Coupon updated successfully", coupon));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 8. DELETE /admin/coupon/:id (Admin delete)
async function adminDelete(req, res) {
  try {
    const { id } = req.params;
    const coupon = await db.Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json(ErrorResponse("Coupon not found"));
    }

    await coupon.destroy();
    return res.status(200).json(SuccessResponse("Coupon deleted successfully"));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 9. GET /admin/coupons (Admin list all)
async function adminGetCoupons(req, res) {
  try {
    const coupons = await db.Coupon.findAll({
      order: [["createdAt", "DESC"]]
    });
    return res.status(200).json(SuccessResponse("All coupons fetched for admin", coupons));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getCoupons,
  getCouponById,
  applyCoupon,
  removeCoupon,
  getCouponHistory,
  adminCreate,
  adminUpdate,
  adminDelete,
  adminGetCoupons
};
