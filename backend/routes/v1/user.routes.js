const express = require("express");

const router = express.Router();

const UserController = require("../../controller/user.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { validateBody } = require("../../middleware/validate.middleware");

// Routes
router.post("/register-send-otp", validateBody(["name", "email", "role"]), UserController.registerSendOtp);
router.post("/register-verify-otp", validateBody(["email", "otp"]), UserController.registerVerifyOtp);

router.post("/send-otp", validateBody(["email"]), UserController.sendOtp);
router.post("/verify-otp", validateBody(["email", "otp"]), UserController.verifyOtp);
router.post("/login", validateBody(["email"]), UserController.login);
router.post("/admin-send-otp", validateBody(["email", "password"]), UserController.adminSendOtp);
router.post("/admin-verify-otp", validateBody(["email", "otp"]), UserController.adminVerifyOtp);

// Profile management
router.get("/profile", authenticate, UserController.getProfile);
router.put("/profile", authenticate, UserController.updateProfile);

// Artists endpoints
router.get("/artists/nearby", authenticate, UserController.getArtistsBY);
router.get("/artists", UserController.getArtists);

module.exports = router;