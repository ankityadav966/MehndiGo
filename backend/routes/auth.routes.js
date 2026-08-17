const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/auth/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Public authentication routes
<<<<<<< HEAD
router.post("/send-otp", AuthController.sendOtp);
=======
router.post("/send-otp", otpRateLimiter, AuthController.sendOtp);
router.post("/send-email-dispatch", AuthController.sendEmailDispatch);
>>>>>>> 3d724d199dd5257dfe28c46b3e3429559b9d412b
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);

// Protected routes (require JWT verification)
router.post("/logout", authenticate, AuthController.logout);
router.get("/profile", authenticate, AuthController.getProfile);
router.put("/profile", authenticate, AuthController.updateProfile);

module.exports = router;
