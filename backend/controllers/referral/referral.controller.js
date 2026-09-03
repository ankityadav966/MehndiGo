const referralService = require("../../services/referral.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

// GET /api/v1/mehndigo/referral/dashboard — Customer
async function getCustomerDashboard(req, res) {
  try {
    const data = await referralService.getCustomerDashboard(req.user.id);
    return res.status(200).json(SuccessResponse("Referral dashboard fetched", data));
  } catch (err) {
    return res.status(500).json(ErrorResponse(err.message, err));
  }
}

// GET /api/v1/mehndigo/referral/artist-dashboard — Artist
async function getArtistDashboard(req, res) {
  try {
    const data = await referralService.getArtistDashboard(req.user.id);
    return res.status(200).json(SuccessResponse("Artist referral dashboard fetched", data));
  } catch (err) {
    return res.status(500).json(ErrorResponse(err.message, err));
  }
}

// GET /api/v1/mehndigo/referral/history
async function getReferralHistory(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const data  = await referralService.getReferralHistory(req.user.id, page, limit);
    return res.status(200).json(SuccessResponse("Referral history fetched", data));
  } catch (err) {
    return res.status(500).json(ErrorResponse(err.message, err));
  }
}

// GET /api/v1/mehndigo/referral/share-link — returns code + link for sharing
async function getShareLink(req, res) {
  try {
    const codeRecord = await referralService.getOrCreateReferralCode(req.user.id);
    const link = `https://mehndigo.in/invite?ref=${codeRecord.code}`;
    return res.status(200).json(SuccessResponse("Referral share link generated", {
      referralCode: codeRecord.code,
      referralLink: link,
      playStoreFallback: "https://play.google.com/store/apps/details?id=com.sonuy123.mehendigoo&hl=en_IN"
    }));
  } catch (err) {
    return res.status(500).json(ErrorResponse(err.message, err));
  }
}

// ─── ADMIN ───────────────────────────────────────────────────────

// GET /api/v1/mehndigo/admin/referral/stats
async function adminGetStats(req, res) {
  try {
    const data = await referralService.getAdminStats();
    return res.status(200).json(SuccessResponse("Admin referral stats fetched", data));
  } catch (err) {
    return res.status(500).json(ErrorResponse(err.message, err));
  }
}

// GET /api/v1/mehndigo/admin/referral/config — list configurable thresholds
async function adminGetConfig(req, res) {
  try {
    const db = require("../../models");
    const keys = ["REFERRAL_C2C_COUNT", "REFERRAL_C2C_BOOKINGS", "REFERRAL_C2A_COUNT", "REFERRAL_A2A_COUNT"];
    const rows = await db.SystemSetting.findAll({ where: { key: keys } });
    const config = {};
    rows.forEach(r => { config[r.key] = r.value; });
    return res.status(200).json(SuccessResponse("Referral config fetched", config));
  } catch (err) {
    return res.status(500).json(ErrorResponse(err.message, err));
  }
}

// POST /api/v1/mehndigo/admin/referral/config — update thresholds
async function adminUpdateConfig(req, res) {
  try {
    const db = require("../../models");
    const allowed = ["REFERRAL_C2C_COUNT", "REFERRAL_C2C_BOOKINGS", "REFERRAL_C2A_COUNT", "REFERRAL_A2A_COUNT"];
    for (const key of Object.keys(req.body)) {
      if (!allowed.includes(key)) continue;
      const [record, created] = await db.SystemSetting.findOrCreate({
        where: { key },
        defaults: { key, value: String(req.body[key]) }
      });
      if (!created) await record.update({ value: String(req.body[key]) });
    }
    return res.status(200).json(SuccessResponse("Referral config updated"));
  } catch (err) {
    return res.status(500).json(ErrorResponse(err.message, err));
  }
}

module.exports = {
  getCustomerDashboard,
  getArtistDashboard,
  getReferralHistory,
  getShareLink,
  adminGetStats,
  adminGetConfig,
  adminUpdateConfig,
  // Keep old exports for admin routes that still reference them
  adminGetCampaigns:    async (req, res) => res.status(200).json({ success: true, data: [] }),
  adminCreateCampaign:  async (req, res) => res.status(200).json({ success: true, message: "Campaigns replaced by SystemSettings config" }),
  adminGetAnalytics:    adminGetStats,
};
