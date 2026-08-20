const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const AuthController = require("../controllers/auth/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Configure OTP rate limiter (max 10 requests per 10 minutes per IP)
const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests from this IP. Please try again after 10 minutes."
  }
});

// Public authentication routes
router.post("/send-otp", otpRateLimiter, AuthController.sendOtp);
router.post("/send-email-dispatch", AuthController.sendEmailDispatch);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);

// Protected routes (require JWT verification)
router.post("/logout", authenticate, AuthController.logout);
router.get("/profile", authenticate, AuthController.getProfile);
router.put("/profile", authenticate, AuthController.updateProfile);
router.post("/change-password", authenticate, AuthController.changePassword);
router.delete("/account", authenticate, AuthController.deleteAccount);

module.exports = router;
