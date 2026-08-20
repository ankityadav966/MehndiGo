const express = require("express");

const router = express.Router();

const UserController = require("../../controller/user.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { validateBody, validateAtLeastOne } = require("../../middleware/validate.middleware");
const { otpRateLimiter } = require("../../middleware/rateLimiter.middleware");

// Routes
router.post("/register-send-otp", otpRateLimiter, validateBody(["name", "role"]), validateAtLeastOne(["email", "phone"]), UserController.registerSendOtp);
router.post("/register-verify-otp", validateBody(["otp"]), validateAtLeastOne(["email", "phone"]), UserController.registerVerifyOtp);

router.post("/send-otp", otpRateLimiter, validateAtLeastOne(["email", "phone"]), UserController.sendOtp);
router.post("/verify-otp", validateBody(["otp"]), validateAtLeastOne(["email", "phone"]), UserController.verifyOtp);
router.post("/login", validateAtLeastOne(["email", "phone"]), UserController.login);
router.post("/admin-send-otp", otpRateLimiter, validateBody(["email", "password"]), UserController.adminSendOtp);
router.post("/admin-verify-otp", validateBody(["email", "otp"]), UserController.adminVerifyOtp);

// Profile management
router.get("/profile", authenticate, UserController.getProfile);
router.put("/profile", authenticate, UserController.updateProfile);

// Artists endpoints
router.get("/artists/nearby", authenticate, UserController.getArtistsBY);
router.get("/artists", UserController.getArtists);

module.exports = router;