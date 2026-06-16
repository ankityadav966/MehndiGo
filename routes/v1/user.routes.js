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

router.post(
  "/login",
  UserController.login
);

router.get( "/artists", UserController.getArtists );

module.exports = router;