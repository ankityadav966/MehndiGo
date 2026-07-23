const db = require("../models");
const { Op } = require("sequelize");

class XpService {
  /**
   * Helper to fetch configurations dynamically from SystemSettings
   */
  async getSetting(key, defaultValue) {
    try {
      const record = await db.SystemSetting.findOne({ where: { key } });
      return record ? record.value : String(defaultValue);
    } catch (err) {
      console.error(`[XP Service] Error fetching setting ${key}:`, err.message);
      return String(defaultValue);
    }
  }

  /**
   * Award Ambassador Points to a user and recalculate tier
   */
  async awardAmbassadorScore(userId, points, reason) {
    if (!points || points <= 0) return null;
    try {
      const user = await db.User.findByPk(userId);
      if (!user) return null;

      const newScore = user.ambassador_score + points;
      
      let nextTier = "BEGINNER";
      if (newScore >= 100) nextTier = "ELITE";
      else if (newScore >= 50) nextTier = "DIAMOND";
      else if (newScore >= 25) nextTier = "PLATINUM";
      else if (newScore >= 10) nextTier = "GOLD";
      else if (newScore >= 3) nextTier = "SILVER";
      else if (newScore >= 1) nextTier = "BRONZE";

      const oldTier = user.ambassador_tier;
      await user.update({
        ambassador_score: newScore,
        ambassador_tier: nextTier
      });

      if (oldTier !== nextTier) {
        await db.Notification.create({
          user_id: userId,
          title: `Promoted to ${nextTier} Tier! 🏆`,
          message: `Awesome! You earned ${points} Ambassador points for "${reason}" and have been promoted to the ${nextTier} Ambassador tier.`,
          type: "SYSTEM"
        });
      } else {
        await db.Notification.create({
          user_id: userId,
          title: `Ambassador Points! 🏆`,
          message: `You earned +${points} Ambassador points for "${reason}". Total points: ${newScore}`,
          type: "SYSTEM"
        });
      }

      return { score: newScore, tier: nextTier };
    } catch (e) {
      console.error("[XP Service] Error awarding Ambassador points:", e.message);
      return null;
    }
  }

  /**
   * Award XP to a user, handles level calculations, tiers, and badges
   */
  async awardXp(userId, amount, reason, referenceId = null) {
    if (!amount || amount <= 0) return null;

    try {
      const user = await db.User.findByPk(userId);
      if (!user) return null;

      // 1. Create XP log
      const log = await db.XpLog.create({
        user_id: userId,
        amount,
        reason,
        reference_id: referenceId ? String(referenceId) : null
      });

      // 2. Add to user balance
      const newXp = user.current_xp + amount;
      const newLifetimeXp = user.lifetime_xp + amount;
      
      let level = user.current_level;
      let xpNeeded = level * 500;
      let currentXpPool = newXp;
      let leveledUp = false;

      // Handle level up scaling loop (e.g. Level 1 -> 500XP, Level 2 -> 1000XP)
      while (currentXpPool >= xpNeeded) {
        currentXpPool -= xpNeeded;
        level++;
        xpNeeded = level * 500;
        leveledUp = true;
      }

      await user.update({
        current_xp: currentXpPool,
        lifetime_xp: newLifetimeXp,
        current_level: level
      });

      // 3. Trigger Level Up Notification & Event
      if (leveledUp) {
        await db.Notification.create({
          user_id: userId,
          title: "Level Up! 🚀",
          message: `Congratulations! You leveled up to Level ${level}! Keep completing services and inviting friends to unlock more rewards.`,
          type: "SYSTEM"
        });
      }

      // 4. Update Ambassador Tier based on ambassador_score
      const currentScore = user.ambassador_score || 0;
      let nextTier = "BEGINNER";
      if (currentScore >= 100) nextTier = "ELITE";
      else if (currentScore >= 50) nextTier = "DIAMOND";
      else if (currentScore >= 25) nextTier = "PLATINUM";
      else if (currentScore >= 10) nextTier = "GOLD";
      else if (currentScore >= 3) nextTier = "SILVER";
      else if (currentScore >= 1) nextTier = "BRONZE";

      if (user.ambassador_tier !== nextTier) {
        await user.update({ ambassador_tier: nextTier });
        await db.Notification.create({
          user_id: userId,
          title: `Promoted to ${nextTier} Tier! 🏆`,
          message: `Awesome! You have been promoted to the ${nextTier} Ambassador tier. Keep referring friends to unlock premium features.`,
          type: "SYSTEM"
        });
      }

      // 5. Evaluate and unlock badges
      await this.evaluateBadges(userId);

      return {
        awarded: amount,
        currentXp: currentXpPool,
        lifetimeXp: newLifetimeXp,
        level,
        tier: nextTier,
        leveledUp
      };
    } catch (e) {
      console.error("[XP Service] Error awarding XP:", e.message);
      return null;
    }
  }

  /**
   * Evaluate user counts for REFERRAL_COUNT, BOOKING_COUNT, REVIEW_COUNT and unlock badges
   */
  async evaluateBadges(userId) {
    try {
      // Get all badges
      const badges = await db.Badge.findAll();
      
      // Get already earned badge IDs
      const earned = await db.UserBadge.findAll({
        where: { user_id: userId }
      });
      const earnedIds = new Set(earned.map(e => e.badge_id));

      // Get user metrics
      const referralCount = await db.ReferralHistory.count({
        where: { referrer_id: userId, status: "COMPLETED" }
      });

      const bookingCount = await db.Booking.count({
        where: { user_id: userId, booking_status: "COMPLETED" }
      });

      const reviewCount = await db.Review.count({
        where: { user_id: userId }
      });

      for (const badge of badges) {
        if (earnedIds.has(badge.id)) continue;

        let eligible = false;
        if (badge.criteria_type === "REFERRAL_COUNT" && referralCount >= badge.criteria_value) {
          eligible = true;
        } else if (badge.criteria_type === "BOOKING_COUNT" && bookingCount >= badge.criteria_value) {
          eligible = true;
        } else if (badge.criteria_type === "REVIEW_COUNT" && reviewCount >= badge.criteria_value) {
          eligible = true;
        }

        if (eligible) {
          await db.UserBadge.create({
            user_id: userId,
            badge_id: badge.id
          });

          // Award bonus XP for earning a badge!
          await this.awardXp(userId, 200, `Unlocked badge: ${badge.name}`, badge.id);

          // Notify user
          await db.Notification.create({
            user_id: userId,
            title: `Badge Unlocked: ${badge.name}! 🏅`,
            message: `You earned the "${badge.name}" achievement badge and +200 bonus XP! Check it out in your profile.`,
            type: "SYSTEM"
          });
        }
      }
    } catch (err) {
      console.error("[XP Service] Error evaluating badges:", err.message);
    }
  }

  async evaluateArtistMilestone(artistUserId) {
    try {
      // 1. Find if this artist has a referrer
      const referral = await db.ReferralHistory.findOne({
        where: { referred_id: artistUserId }
      });
      if (!referral) return;

      const referrerId = referral.referrer_id;
      const artistUser = await db.User.findByPk(artistUserId);
      if (!artistUser || artistUser.role !== "ARTIST") return;

      const artistProfile = await db.ArtistProfile.findOne({
        where: { user_id: artistUserId }
      });
      if (!artistProfile) return;

      // 2. Fetch metrics
      // Profile completion check (bio, portfolio, kyc)
      const isProfileDone = artistProfile.bio && artistProfile.detailed_status === "APPROVED";

      // Completed bookings check
      const completedBookings = await db.Booking.count({
        where: { artist_id: artistProfile.id, booking_status: "COMPLETED" }
      });

      const milestoneEvaluations = [];

      // A. Profile Complete Milestone
      if (isProfileDone) {
        milestoneEvaluations.push({
          key: "PROFILE",
          xpKey: "XP_ARTIST_MILESTONE_PROFILE",
          pointsKey: "POINTS_ARTIST_VERIFIED",
          defaultXp: 100,
          defaultPoints: 3,
          reason: `Artist Profile Verified: ${artistUser.name}`,
          refStr: `Artist Profile Milestone for Artist #${artistUserId}`
        });
      }

      // B. 1 Booking Milestone (Active Artist)
      if (completedBookings >= 1) {
        milestoneEvaluations.push({
          key: "BOOKING_1",
          xpKey: "XP_ARTIST_MILESTONE_BOOKING_1",
          pointsKey: "POINTS_ARTIST_ACTIVE",
          defaultXp: 200,
          defaultPoints: 5,
          reason: `Artist First Booking Completed: ${artistUser.name}`,
          refStr: `Artist Milestone (1 Booking) for Artist #${artistUserId}`
        });
      }

      // C. 10 Bookings Milestone
      if (completedBookings >= 10) {
        milestoneEvaluations.push({
          key: "BOOKING_10",
          xpKey: "XP_ARTIST_MILESTONE_BOOKING_10",
          defaultXp: 300,
          defaultPoints: 0,
          reason: `Artist 10 Bookings Completed: ${artistUser.name}`,
          refStr: `Artist Milestone (10 Bookings) for Artist #${artistUserId}`
        });
      }

      // D. 25 Bookings Milestone (High Performance Artist)
      if (completedBookings >= 25) {
        milestoneEvaluations.push({
          key: m => "BOOKING_25",
          xpKey: "XP_ARTIST_MILESTONE_BOOKING_25",
          pointsKey: "POINTS_ARTIST_HIGH_PERFORMANCE",
          defaultXp: 500,
          defaultPoints: 10,
          reason: `Artist 25 Bookings Completed: ${artistUser.name}`,
          refStr: `Artist Milestone (25 Bookings) for Artist #${artistUserId}`
        });
      }

      // E. 50 Bookings Milestone
      if (completedBookings >= 50) {
        milestoneEvaluations.push({
          key: "BOOKING_50",
          xpKey: "XP_ARTIST_MILESTONE_BOOKING_50",
          defaultXp: 1000,
          defaultPoints: 0,
          reason: `Artist 50 Bookings Completed: ${artistUser.name}`,
          refStr: `Artist Milestone (50 Bookings) for Artist #${artistUserId}`
        });
      }

      // F. 100 Bookings Milestone
      if (completedBookings >= 100) {
        milestoneEvaluations.push({
          key: "BOOKING_100",
          xpKey: "XP_ARTIST_MILESTONE_BOOKING_100",
          defaultXp: 2500,
          defaultPoints: 0,
          reason: `Artist 100 Bookings Completed: ${artistUser.name}`,
          refStr: `Artist Milestone (100 Bookings) for Artist #${artistUserId}`
        });
      }

      // 3. Process milestones
      for (const m of milestoneEvaluations) {
        // Prevent duplicate rewards
        const exists = await db.XpLog.findOne({
          where: { user_id: referrerId, reason: m.refStr }
        });
        if (exists) continue;

        // Fetch milestone values dynamically from SystemSettings
        const xpStr = await this.getSetting(m.xpKey, m.defaultXp);
        const xpAmount = parseInt(xpStr);

        let pointsAmount = 0;
        if (m.pointsKey) {
          const ptStr = await this.getSetting(m.pointsKey, m.defaultPoints);
          pointsAmount = parseInt(ptStr);
        }

        // Award XP and points
        if (xpAmount > 0) {
          await this.awardXp(referrerId, xpAmount, m.refStr, artistUserId);
        }
        if (pointsAmount > 0) {
          await this.awardAmbassadorScore(referrerId, pointsAmount, m.reason);
        }
      }

    } catch (err) {
      console.error("[XP Service] Error evaluating artist milestone:", err.message);
    }
  }
}

module.exports = new XpService();
