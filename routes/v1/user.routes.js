const express = require("express");

const router = express.Router();

const UserController =
  require("../../controller/user.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/role.middleware");

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



//get all artist bu user location realte
router.get(
  "/artists",
  authenticate,
  UserController.getArtistsBY
);


router.get( "/artists", UserController.getArtists );

module.exports = router;