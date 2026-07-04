const express = require("express");
const router = express.Router();
const RewardController = require("../controllers/reward/reward.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.get("/", authenticate, RewardController.listRewards);
router.post("/claim", authenticate, RewardController.claimReward);

module.exports = router;
