const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/auth/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { otpRateLimiter } = require("../middleware/rateLimiter.middleware");

// Public authentication routes
router.post("/check-email", AuthController.checkEmail);
router.post("/send-otp", otpRateLimiter, AuthController.sendOtp);
router.post("/verify-otp", AuthController.verifyOtp);

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);

// Protected routes (require JWT verification)
router.post("/logout", authenticate, AuthController.logout);
router.get("/profile", authenticate, AuthController.getProfile);
router.put("/profile", authenticate, AuthController.updateProfile);

module.exports = router;
