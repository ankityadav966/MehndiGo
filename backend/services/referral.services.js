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

      // Look up active campaigns for future reference if needed
      const activeCampaign = await db.ReferralCampaign.findOne({
        where: { is_active: true }
      });

      const boostDays = activeCampaign ? activeCampaign.artist_boost_days : 7;
      const customerBenefit = activeCampaign ? activeCampaign.customer_benefit : "Priority Support & Exclusive Offers";

      const history = await db.ReferralHistory.create({
        referrer_id: referrerId,
        referred_id: referredUserId,
        status: "PENDING",
        boost_days_awarded: boostDays,
        customer_benefit_awarded: customerBenefit,
        reward_status: "PENDING"
      });

      // Notify referrer about joining friend
      const referredUser = await db.User.findByPk(referredUserId);
      const isCustomerReferrer = (await db.User.findByPk(referrerId))?.role === "USER";
      
      let rewardMessage = `You will get a ${boostDays}-Day Profile Boost once they complete their first booking!`;
      if (isCustomerReferrer) {
        rewardMessage = `You will unlock ${customerBenefit} once they complete their first booking!`;
      }

      await db.Notification.create({
        user_id: referrerId,
        title: "Friend Joined! 🤝",
        message: `${referredUser?.name || "A friend"} joined MehndiGo using your referral code. ${rewardMessage}`,
        type: "SYSTEM"
      });

      return history;

    } catch (e) {
      console.error("[Referral] Error recording signup:", e.message);
      return null;
    }
  }

  /**
   * Helper function to add boost days to a user
   */
  async grantProfileBoost(userId, daysToAdd) {
    const user = await db.User.findByPk(userId);
    if (!user) return;
    
    const now = new Date();
    let currentExpiry = user.boost_expires_at ? new Date(user.boost_expires_at) : now;
    
    // If boost has already expired, reset it to now before adding
    if (currentExpiry < now) {
      currentExpiry = now;
    }
    
    // Add days
    currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
    
    await user.update({
      boost_start_at: user.boost_start_at && new Date(user.boost_start_at) > now ? user.boost_start_at : now,
      boost_expires_at: currentExpiry
    });
    
    return currentExpiry;
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
      const boostDaysToAward = relation.boost_days_awarded;
      const customerBenefitToAward = relation.customer_benefit_awarded;

      const referrer = await db.User.findByPk(referrerId);
      const referredUser = await db.User.findByPk(referredUserId);
      const isArtistReferral = referredUser?.role === "ARTIST";
      
      // Update relation state
      await relation.update({
        status: "COMPLETED",
        reward_status: "CREDITED"
      });

      // 1. Grant Reward to Referrer (Boost or Customer Benefit)
      if (referrer?.role === "ARTIST") {
        await this.grantProfileBoost(referrerId, boostDaysToAward);
        await db.Notification.create({
          user_id: referrerId,
          title: "Referral Successful 🎉",
          message: `Congratulations! Your friend ${referredUser?.name || ""} completed their first service. You earned a ${boostDaysToAward}-Day Profile Boost for increased visibility!`,
          type: "SYSTEM"
        });
      } else {
        // Customer Referrer gets non-cash benefit
        await db.Notification.create({
          user_id: referrerId,
          title: "Referral Successful 🎉",
          message: `Congratulations! Your friend completed their first service. You've unlocked: ${customerBenefitToAward}!`,
          type: "SYSTEM"
        });
      }

      // Award XP & Points to Referrer & Referred Friend
      const xpService = require("./xp.services");

      const xpUserConf = await xpService.getSetting("XP_USER_REFERRAL", 300);
      const xpArtistConf = await xpService.getSetting("XP_ARTIST_REFERRAL", 500);
      const pointsUserConf = await xpService.getSetting("POINTS_USER_REFERRAL", 1);
      const pointsArtistConf = await xpService.getSetting("POINTS_ARTIST_VERIFIED", 3);

      const xpAmount = isArtistReferral ? parseInt(xpArtistConf) : parseInt(xpUserConf);
      const pointsAmount = isArtistReferral ? parseInt(pointsArtistConf) : parseInt(pointsUserConf);

      await xpService.awardXp(referrerId, xpAmount, `Referral Completed: ${referredUser?.name || "Friend"}`, referredUserId);
      await xpService.awardAmbassadorScore(referrerId, pointsAmount, `Referral Completed: ${referredUser?.name || "Friend"}`);
      await xpService.awardXp(referredUserId, 100, "Referral Welcome Bonus", referrerId);

      // 2. Check if active campaign offers welcome boost to the referred artist
      const activeCampaign = await db.ReferralCampaign.findOne({ where: { is_active: true } });
      const welcomeBoostDays = activeCampaign ? activeCampaign.welcome_boost_days : 3;

      if (isArtistReferral && welcomeBoostDays > 0) {
        await this.grantProfileBoost(referredUserId, welcomeBoostDays);

        // Notify Referred user
        await db.Notification.create({
          user_id: referredUserId,
          title: "Welcome Boost Activated! 🚀",
          message: `Thanks for using a referral code! A ${welcomeBoostDays}-Day Profile Boost has been activated for your account to help you get more bookings!`,
          type: "SYSTEM"
        });
      } else if (!isArtistReferral) {
         // Customer referred gets priority access perk (optional)
         await db.Notification.create({
          user_id: referredUserId,
          title: "Welcome to MehndiGo! ✨",
          message: `Thanks for using a referral code! Enjoy priority support and exclusive early access to offers.`,
          type: "SYSTEM"
        });
      }

    } catch (e) {
      console.error("[Referral] Milestone rewarding failure:", e.message);
    }
  }
}

module.exports = new ReferralService();
