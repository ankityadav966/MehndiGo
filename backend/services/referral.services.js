const db = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/errors/app.error");

class ReferralService {
  /**
   * Generate a unique, premium referral code for a user
   */
  async generateReferralCode(userId) {
    const user = await db.User.findByPk(userId);
    if (!user) throw new AppError("User not found", 404);

    const namePart = user.name
      ? user.name.replace(/\s+/g, "").substring(0, 3).toUpperCase()
      : "USR";
    
    let code = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      code = `MGO${namePart}${randomPart}`;

      const existing = await db.ReferralCode.findOne({ where: { code } });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    return await db.ReferralCode.create({
      user_id: userId,
      code
    });
  }

  /**
   * Retrieve or auto-create a referral code (self-healing for legacy accounts)
   */
  async getOrCreateReferralCode(userId) {
    let refRecord = await db.ReferralCode.findOne({ where: { user_id: userId } });
    if (!refRecord) {
      refRecord = await this.generateReferralCode(userId);
    }
    return refRecord;
  }

  /**
   * Link referred signup relation on registration (via body referralCode)
   */
  async recordReferralSignup(referredUserId, referrerCode) {
    if (!referrerCode) return null;

    try {
      const referrerRecord = await db.ReferralCode.findOne({
        where: { code: referrerCode }
      });

      if (!referrerRecord) {
        console.log(`[Referral] Signup skipped: code ${referrerCode} not found`);
        return null;
      }

      const referrerId = referrerRecord.user_id;

      // 1. Prevent self-referral
      if (referrerId === referredUserId) {
        console.log(`[Referral] Self-referral attempt restricted: User ${referredUserId}`);
        return null;
      }

      // 2. Prevent duplicate referrals
      const existingHistory = await db.ReferralHistory.findOne({
        where: { referred_id: referredUserId }
      });

      if (existingHistory) {
        console.log(`[Referral] Referral already registered for user ${referredUserId}`);
        return null;
      }

      // Look up active campaigns
      const activeCampaign = await db.ReferralCampaign.findOne({
        where: { is_active: true }
      });

      const rewardAmount = activeCampaign ? activeCampaign.referrer_reward : 100; // Flat ₹100 default bonus

      const history = await db.ReferralHistory.create({
        referrer_id: referrerId,
        referred_id: referredUserId,
        status: "PENDING",
        reward_amount: rewardAmount,
        reward_status: "PENDING"
      });

      // Notify referrer about joining friend
      const referredUser = await db.User.findByPk(referredUserId);
      await db.Notification.create({
        user_id: referrerId,
        title: "Friend Joined! 🤝",
        message: `${referredUser?.name || "A friend"} joined MehndiGo using your referral code. You will get ₹${rewardAmount} cashback once they complete their first booking!`,
        type: "SYSTEM"
      });

      return history;

    } catch (e) {
      console.error("[Referral] Error recording signup:", e.message);
      return null;
    }
  }

  /**
   * Evaluate first booking milestones on booking complete to award referrers and referred users
   */
  async verifyAndRewardReferral(referredUserId, bookingId) {
    try {
      // Find pending referral relation
      const relation = await db.ReferralHistory.findOne({
        where: {
          referred_id: referredUserId,
          status: "PENDING"
        }
      });

      if (!relation) return;

      // Verify this is the user's first completed booking
      const completedCount = await db.Booking.count({
        where: {
          user_id: referredUserId,
          booking_status: "COMPLETED",
          id: { [Op.ne]: bookingId } // Exclude current check
        }
      });

      if (completedCount > 0) {
        console.log(`[Referral] Not eligible: User ${referredUserId} already has other completed bookings`);
        return;
      }

      const referrerId = relation.referrer_id;
      const rewardAmount = relation.reward_amount;

      // 1. Credit Referrer Wallet
      const [referrerWallet] = await db.Wallet.findOrCreate({
        where: { user_id: referrerId },
        defaults: { user_id: referrerId, balance: 0 }
      });

      await referrerWallet.increment("balance", { by: rewardAmount });

      await db.WalletTransaction.create({
        wallet_id: referrerWallet.id,
        booking_id: bookingId,
        transaction_type: "REFERRAL",
        amount: rewardAmount,
        status: "SUCCESS",
        description: `Referral bonus cashback for inviting user ID #${referredUserId}`
      });

      // Update relation state
      await relation.update({
        status: "COMPLETED",
        reward_status: "CREDITED"
      });

      // Award XP & Points to Referrer & Referred Friend
      const xpService = require("./xp.services");
      const referredUser = await db.User.findByPk(referredUserId);
      const isArtistReferral = referredUser?.role === "ARTIST";

      const xpUserConf = await xpService.getSetting("XP_USER_REFERRAL", 300);
      const xpArtistConf = await xpService.getSetting("XP_ARTIST_REFERRAL", 500);
      const pointsUserConf = await xpService.getSetting("POINTS_USER_REFERRAL", 1);
      const pointsArtistConf = await xpService.getSetting("POINTS_ARTIST_VERIFIED", 3);

      const xpAmount = isArtistReferral ? parseInt(xpArtistConf) : parseInt(xpUserConf);
      const pointsAmount = isArtistReferral ? parseInt(pointsArtistConf) : parseInt(pointsUserConf);

      await xpService.awardXp(referrerId, xpAmount, `Referral Completed: ${referredUser?.name || "Friend"}`, referredUserId);
      await xpService.awardAmbassadorScore(referrerId, pointsAmount, `Referral Completed: ${referredUser?.name || "Friend"}`);
      await xpService.awardXp(referredUserId, 100, "Referral Welcome Bonus", referrerId);

      // Notify Referrer
      await db.Notification.create({
        user_id: referrerId,
        title: "Referral Cashback Credited! 💸",
        message: `Congratulations! Your friend completed their first service. ₹${rewardAmount} has been credited to your wallet.`,
        type: "SYSTEM"
      });

      // 2. Check if active campaign offers welcome cashback to the referred friend as well
      const activeCampaign = await db.ReferralCampaign.findOne({ where: { is_active: true } });
      const referredReward = activeCampaign ? activeCampaign.referred_reward : 0;

      if (referredReward > 0) {
        const [referredWallet] = await db.Wallet.findOrCreate({
          where: { user_id: referredUserId },
          defaults: { user_id: referredUserId, balance: 0 }
        });

        await referredWallet.increment("balance", { by: referredReward });

        await db.WalletTransaction.create({
          wallet_id: referredWallet.id,
          booking_id: bookingId,
          transaction_type: "REFERRAL",
          amount: referredReward,
          status: "SUCCESS",
          description: "Welcome referral sign-up bonus"
        });

        // Notify Referred user
        await db.Notification.create({
          user_id: referredUserId,
          title: "Welcome Cashback Credited! 🎁",
          message: `Thanks for using a referral code! ₹${referredReward} has been credited to your wallet.`,
          type: "SYSTEM"
        });
      }

    } catch (e) {
      console.error("[Referral] Milestone rewarding failure:", e.message);
    }
  }
}

module.exports = new ReferralService();
