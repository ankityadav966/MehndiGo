const db = require("../../models");
const referralService = require("../../services/referral.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

// 1. GET /referral (dashboard stats)
async function getReferralDashboard(req, res) {
  try {
    const userId = req.user.id;

    // Self-healing: get or create referral code
    const codeRecord = await referralService.getOrCreateReferralCode(userId);

    // Referral stats calculations
    const invites = await db.ReferralHistory.findAll({
      where: { referrer_id: userId }
    });

    const totalInvites = invites.length;
    const pendingInvites = invites.filter(i => i.status === "PENDING").length;
    const completedInvites = invites.filter(i => i.status === "COMPLETED").length;

    // Total earnings sum
    const totalEarnings = invites
      .filter(i => i.reward_status === "CREDITED")
      .reduce((sum, item) => sum + item.reward_amount, 0);

    // Active Campaign settings
    const activeCampaign = await db.ReferralCampaign.findOne({
      where: { is_active: true }
    });

    const referralLink = `https://mehendigoo.com/auth/register?ref=${codeRecord.code}`;

    return res.status(200).json(SuccessResponse("Referral dashboard details fetched", {
      referralCode: codeRecord.code,
      referralLink,
      stats: {
        totalInvites,
        pendingInvites,
        completedInvites,
        totalEarnings
      },
      campaign: activeCampaign ? {
        title: activeCampaign.title,
        referrerReward: activeCampaign.referrer_reward,
        referredReward: activeCampaign.referred_reward
      } : {
        title: "Standard Refer & Earn",
        referrerReward: 100,
        referredReward: 0
      }
    }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 2. GET /referral/history (invited friends list)
async function getReferralHistory(req, res) {
  try {
    const userId = req.user.id;

    const history = await db.ReferralHistory.findAll({
      where: { referrer_id: userId },
      include: [
        {
          model: db.User,
          as: "referred",
          attributes: ["id", "name", "profile_image", "createdAt"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const formattedList = history.map(item => ({
      id: item.id,
      friendName: item.referred?.name || "Invited Friend",
      friendImage: item.referred?.profile_image,
      joinedAt: item.referred?.createdAt || item.createdAt,
      status: item.status, // PENDING, COMPLETED, REJECTED
      rewardAmount: item.reward_amount,
      rewardStatus: item.reward_status // PENDING, CREDITED, FAILED
    }));

    return res.status(200).json(SuccessResponse("Referral history logs retrieved", formattedList));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 3. GET /referral/rewards (wallet rewards logs)
async function getRewardsHistory(req, res) {
  try {
    const userId = req.user.id;

    const wallet = await db.Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      return res.status(200).json(SuccessResponse("No rewards found", []));
    }

    const txs = await db.WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        transaction_type: "REFERRAL",
        status: "SUCCESS"
      },
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json(SuccessResponse("Referral wallet transactions fetched", txs));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 4. GET /admin/referral/campaigns (Admin list all)
async function adminGetCampaigns(req, res) {
  try {
    const campaigns = await db.ReferralCampaign.findAll({
      order: [["createdAt", "DESC"]]
    });
    return res.status(200).json(SuccessResponse("Referral campaigns fetched for admin", campaigns));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 5. POST /admin/referral/campaign (Admin create/activate)
async function adminCreateCampaign(req, res) {
  try {
    const { title, referrer_reward, referred_reward, is_active } = req.body;

    if (is_active) {
      // Deactivate all others
      await db.ReferralCampaign.update(
        { is_active: false },
        { where: { is_active: true } }
      );
    }

    const campaign = await db.ReferralCampaign.create({
      title,
      referrer_reward: parseInt(referrer_reward) || 0,
      referred_reward: parseInt(referred_reward) || 0,
      is_active: is_active !== false
    });

    return res.status(201).json(SuccessResponse("Referral campaign created successfully", campaign));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 6. GET /admin/referral/analytics (Admin view analytics)
async function adminGetAnalytics(req, res) {
  try {
    const signupsCount = await db.ReferralHistory.count();
    const completedCount = await db.ReferralHistory.count({ where: { status: "COMPLETED" } });
    
    const creditedSum = await db.ReferralHistory.sum("reward_amount", {
      where: { reward_status: "CREDITED" }
    });

    return res.status(200).json(SuccessResponse("Referral analytics fetched", {
      totalSignups: signupsCount,
      completedInvites: completedCount,
      payoutAmount: creditedSum || 0,
      conversionRate: signupsCount > 0 ? Math.round((completedCount / signupsCount) * 100) : 0
    }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getReferralDashboard,
  getReferralHistory,
  getRewardsHistory,
  adminGetCampaigns,
  adminCreateCampaign,
  adminGetAnalytics
};
