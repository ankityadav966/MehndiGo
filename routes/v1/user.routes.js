const express = require("express");

const router = express.Router();

const UserController =
  require("../../controller/user.controller");

router.post(
  "/send-otp",
  UserController.sendOtp
);

router.post(
  "/verify-otp",
  UserController.verifyOtp
);
router.get( "/artists", UserController.getArtists );

module.exports = router;