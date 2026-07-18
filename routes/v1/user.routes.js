const express = require("express");

const router = express.Router();

const UserController = require("../../controller/user.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { validateBody } = require("../../middleware/validate.middleware");

// Authentication Routes
router.post("/register", validateBody(["fullName", "email", "password", "role"]), UserController.register);
router.post("/verify-email-otp", validateBody(["email", "otp"]), UserController.verifyEmailOtp);
router.post("/login", validateBody(["email", "password"]), UserController.login);
router.post("/forgot-password", validateBody(["email"]), UserController.forgotPassword);
router.post("/verify-forgot-password-otp", validateBody(["email", "otp"]), UserController.verifyForgotPasswordOtp);
router.post("/reset-password", validateBody(["email", "password"]), UserController.resetPassword);
router.post("/resend-otp", validateBody(["email"]), UserController.resendOtp);

// Admin Auth
router.post("/admin-send-otp", validateBody(["email", "password"]), UserController.adminSendOtp);
router.post("/admin-verify-otp", validateBody(["email", "otp"]), UserController.adminVerifyOtp);

// Profile management
router.get("/profile", authenticate, UserController.getProfile);
router.put("/profile", authenticate, UserController.updateProfile);

// Artists endpoints
router.get("/artists/nearby", authenticate, UserController.getArtistsBY);
router.get("/artists", UserController.getArtists);

module.exports = router;