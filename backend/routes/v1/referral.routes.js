const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/role.middleware");
const ReferralController = require("../../controllers/referral/referral.controller");

// ── User-facing ───────────────────────────────────────────────────
// Customer dashboard (role USER)
router.get("/dashboard",       authenticate, ReferralController.getCustomerDashboard);
// Artist dashboard (role ARTIST)
router.get("/artist-dashboard",authenticate, ReferralController.getArtistDashboard);
// Paginated referral history (both roles)
router.get("/history",         authenticate, ReferralController.getReferralHistory);
// Generate / return share link (both roles)
router.get("/share-link",      authenticate, ReferralController.getShareLink);

// ── Admin ─────────────────────────────────────────────────────────
router.get("/admin/stats",     authenticate, authorize("ADMIN"), ReferralController.adminGetStats);
router.get("/admin/config",    authenticate, authorize("ADMIN"), ReferralController.adminGetConfig);
router.post("/admin/config",   authenticate, authorize("ADMIN"), ReferralController.adminUpdateConfig);

// Legacy routes (kept for admin panel backward compat)
router.get("/admin/campaigns", authenticate, authorize("ADMIN"), ReferralController.adminGetCampaigns);
router.post("/admin/campaign", authenticate, authorize("ADMIN"), ReferralController.adminCreateCampaign);
router.get("/admin/analytics", authenticate, authorize("ADMIN"), ReferralController.adminGetAnalytics);

module.exports = router;
