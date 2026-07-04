const express = require("express");
const router = express.Router();
const ReferralController = require("../controllers/referral/referral.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Customer referral operations
router.get("/", authenticate, ReferralController.getReferralDashboard);
router.get("/history", authenticate, ReferralController.getReferralHistory);
router.get("/rewards", authenticate, ReferralController.getRewardsHistory);
router.get("/leaderboard", authenticate, ReferralController.getLeaderboard);

module.exports = router;
