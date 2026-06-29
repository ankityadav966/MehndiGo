const express = require("express");

const router = express.Router();

const UserController = require("../../controller/user.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { validateBody } = require("../../middleware/validate.middleware");

router.post("/register-send-otp", validateBody(["name", "password", "role"]), UserController.registerSendOtp);
router.post("/register-verify-otp", validateBody(["otp"]), UserController.registerVerifyOtp);

router.post("/send-otp", UserController.sendOtp); // Legacy / Login send OTP
router.post("/verify-otp", UserController.verifyOtp); // Legacy / Login verify OTP
router.post("/login", UserController.login); // Legacy
router.post("/admin-send-otp", UserController.adminSendOtp);
router.post("/admin-verify-otp", UserController.adminVerifyOtp);

// Profile management
router.get("/profile", authenticate, UserController.getProfile);
router.put("/profile", authenticate, UserController.updateProfile);

// Artists endpoints
router.get("/artists/nearby", authenticate, UserController.getArtistsBY);
router.get("/artists", UserController.getArtists);

module.exports = router;