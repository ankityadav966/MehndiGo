const express = require("express");
const router = express.Router();
const artist = require("./artist.routes")
const admin = require("./admin.routes")
const user = require("./user.routes")
const chat = require("./chat.routes");


router.use("/mehndigo/artist",artist);
router.use("/mehndigo/admin",admin);
router.use("/mehndigo/user",user);
router.use("/mehndigo/chat", chat);

module.exports = router;