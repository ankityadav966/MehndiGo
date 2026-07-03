const express = require("express");

const router = express.Router();

const UserController = require("../../controller/user.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { validateBody } = require("../../middleware/validate.middleware");

router.post("/send-otp", validateBody(["phone", "role"]), UserController.sendOtp);
router.post("/verify-otp", validateBody(["phone", "otp", "role"]), UserController.verifyOtp);
router.post("/login", validateBody(["phone", "role"]), UserController.login);
router.post("/admin-send-otp", validateBody(["email", "password"]), UserController.adminSendOtp);
router.post("/admin-verify-otp", validateBody(["email", "otp"]), UserController.adminVerifyOtp);

// Profile management
router.get("/profile", authenticate, UserController.getProfile);
router.put("/profile", authenticate, UserController.updateProfile);

// Artists endpoints
router.get("/artists/nearby", authenticate, UserController.getArtistsBY);
router.get("/artists", UserController.getArtists);

module.exports = router;