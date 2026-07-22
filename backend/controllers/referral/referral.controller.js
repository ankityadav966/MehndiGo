const db = require("../../models");
const referralService = require("../../services/referral.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

// 1. GET /referral (dashboard stats)
async function getReferralDashboard(req, res) {
  try {
    const userId = req.user.id;
    const { Op } = require("sequelize");

    // Self-healing: get or create referral code
    const codeRecord = await referralService.getOrCreateReferralCode(userId);

    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json(ErrorResponse("User not found"));
    }

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

    const referralLink = `https://mehndigo.com/invite?ref=${codeRecord.code}`;

    // Get rank (by lifetime_xp)
    const rank = await db.User.count({
      where: {
        lifetime_xp: { [Op.gt]: user.lifetime_xp }
      }
    }) + 1;

    // Today's XP earned
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayXp = await db.XpLog.sum("amount", {
      where: {
        user_id: userId,
        amount: { [Op.gt]: 0 },
        createdAt: { [Op.gte]: today }
      }
    }) || 0;

    // Count referred artists
    const artistReferredCount = await db.ReferralHistory.count({
      where: { referrer_id: userId },
      include: [
        {
          model: db.User,
          as: "referred",
          where: { role: "ARTIST" }
        }
      ]
    });

    // Get user badges
    const userBadges = await db.UserBadge.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.Badge,
          as: "badge"
        }
      ]
    });
    const badges = userBadges.map(ub => ({
      id: ub.id,
      name: ub.badge?.name,
      description: ub.badge?.description,
      iconName: ub.badge?.icon_name,
      earnedAt: ub.createdAt
    }));

    return res.status(200).json(SuccessResponse("Referral dashboard details fetched", {
      referralCode: codeRecord.code,
      referralLink,
      stats: {
        totalInvites,
        pendingInvites,
        completedInvites,
        totalEarnings,
        artistReferredCount
      },
      xp: {
        level: user.current_level,
        currentXp: user.current_xp,
        lifetimeXp: user.lifetime_xp,
        nextLevelXp: user.current_level * 500,
        todayXp,
        rank,
        tier: user.ambassador_tier
      },
      badges,
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

// 7. GET /referral/leaderboard (ranks list)
async function getLeaderboard(req, res) {
  try {
    const { period = "all-time", type = "XP" } = req.query;
    const userId = req.user.id;
    const { Op } = require("sequelize");

    let usersList = [];
    if (type === "XP") {
      usersList = await db.User.findAll({
        attributes: ["id", "name", "profile_image", "current_level", "lifetime_xp", "ambassador_tier"],
        order: [["lifetime_xp", "DESC"]],
        limit: 20
      });
    } else {
      usersList = await db.User.findAll({
        attributes: [
          "id", "name", "profile_image", "current_level", "ambassador_tier",
          [
            db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM "ReferralHistories" AS rh
              WHERE rh.referrer_id = "User".id AND rh.status = 'COMPLETED'
            )`),
            "referralsCount"
          ]
        ],
        order: [[db.sequelize.literal('"referralsCount"'), "DESC"]],
        limit: 20
      });
    }

    const leaderboard = usersList.map((u, index) => ({
      rank: index + 1,
      id: u.id,
      name: u.name,
      profileImage: u.profile_image,
      level: u.current_level,
      tier: u.ambassador_tier,
      value: type === "XP" ? u.lifetime_xp : parseInt(u.dataValues.referralsCount || 0)
    }));

    const currentUser = await db.User.findByPk(userId);
    let myRank = 0;
    let myValue = 0;

    if (type === "XP") {
      myValue = currentUser.lifetime_xp;
      myRank = await db.User.count({
        where: {
          lifetime_xp: { [Op.gt]: myValue }
        }
      }) + 1;
    } else {
      const myCount = await db.ReferralHistory.count({
        where: { referrer_id: userId, status: "COMPLETED" }
      });
      myValue = myCount;
      myRank = leaderboard.find(l => l.id === userId)?.rank || 21;
    }

    return res.status(200).json(SuccessResponse("Leaderboard retrieved", {
      leaderboard,
      myRank,
      myValue
    }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 8. GET /admin/referral/config (fetch all SystemSettings related to growth)
async function adminGetConfig(req, res) {
  try {
    const list = await db.SystemSetting.findAll();
    const config = {};
    list.forEach(item => {
      config[item.key] = item.value;
    });
    return res.status(200).json(SuccessResponse("Admin growth configurations fetched", config));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 9. POST /admin/referral/config (update growth settings)
async function adminUpdateConfig(req, res) {
  try {
    const updates = req.body; // e.g. { XP_USER_REFERRAL: 350, POINTS_ARTIST_VERIFIED: 4 }
    for (const key of Object.keys(updates)) {
      const [record, created] = await db.SystemSetting.findOrCreate({
        where: { key },
        defaults: { key, value: String(updates[key]) }
      });
      if (!created) {
        await record.update({ value: String(updates[key]) });
      }
    }
    return res.status(200).json(SuccessResponse("Admin growth configurations updated successfully"));
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
  adminGetAnalytics,
  getLeaderboard,
  adminGetConfig,
  adminUpdateConfig
};
