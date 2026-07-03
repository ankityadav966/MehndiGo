const express = require("express");
const router = express.Router();
const CouponController = require("../controllers/coupon/coupon.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

// Customer facing coupons
router.get("/", authenticate, CouponController.getCoupons);
router.get("/history", authenticate, CouponController.getCouponHistory);
router.get("/:id", authenticate, CouponController.getCouponById);
router.post("/apply", authenticate, CouponController.applyCoupon);
router.post("/remove", authenticate, CouponController.removeCoupon);

// Admin-facing coupons management
router.post("/admin", authenticate, authorize("ADMIN"), CouponController.adminCreate);
router.put("/admin/:id", authenticate, authorize("ADMIN"), CouponController.adminUpdate);
router.delete("/admin/:id", authenticate, authorize("ADMIN"), CouponController.adminDelete);

module.exports = router;
