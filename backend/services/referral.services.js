const crypto = require("crypto");
const db = require("../models");
const { Op } = require("sequelize");

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function generateCode() {
  // Cryptographically random 8-char uppercase alphanumeric — not guessable
  return crypto.randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
}

async function getSetting(key, fallback) {
  try {
    const row = await db.SystemSetting.findOne({ where: { key } });
    return row ? parseInt(row.value, 10) : fallback;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────
// 1. Get or create a user's referral code
// ─────────────────────────────────────────────
async function getOrCreateReferralCode(userId) {
  let record = await db.ReferralCode.findOne({ where: { user_id: userId } });
  if (!record) {
    let code;
    let attempts = 0;
    // Collision-safe generation
    do {
      code = generateCode();
      attempts++;
      const exists = await db.ReferralCode.findOne({ where: { code } });
      if (!exists) break;
    } while (attempts < 10);

    record = await db.ReferralCode.create({ user_id: userId, code });
  }
  return record;
}

// ─────────────────────────────────────────────
// 2. Capture referral on registration
//    Called immediately after new user is created.
// ─────────────────────────────────────────────
async function captureReferral(referralCode, newUserId) {
  if (!referralCode || !newUserId) return null;

  const cleanCode = String(referralCode).trim().toUpperCase();

  // Find the referral code owner
  const codeRecord = await db.ReferralCode.findOne({ where: { code: cleanCode } });
  if (!codeRecord) return null; // Code does not exist — silently ignore

  const referrerId = codeRecord.user_id;

  // Fraud: self referral
  if (referrerId === newUserId) return null;

  // Fraud: referred user already has a referral record
  const already = await db.ReferralHistory.findOne({ where: { referred_id: newUserId } });
  if (already) return null; // idempotent — first referral wins

  // Load both users to determine referral type
  const referrer = await db.User.findByPk(referrerId);
  const referred = await db.User.findByPk(newUserId);
  if (!referrer || !referred) return null;

  const referrerRole = referrer.role; // USER or ARTIST
  const referredRole = referred.role;

  let referral_type;
  if (referrerRole === "USER" && referredRole === "USER") {
    referral_type = "CUSTOMER_TO_CUSTOMER";
  } else if (referrerRole === "USER" && referredRole === "ARTIST") {
    referral_type = "CUSTOMER_TO_ARTIST";
  } else if (referrerRole === "ARTIST" && referredRole === "ARTIST") {
    referral_type = "ARTIST_TO_ARTIST";
  } else {
    // ARTIST referring a USER — not a supported type, ignore
    return null;
  }

  const entry = await db.ReferralHistory.create({
    referrer_id: referrerId,
    referred_id: newUserId,
    referral_type,
    referral_code: cleanCode,
    referral_status: "REGISTERED",
    status: "PENDING", // legacy
    fraud_flag: false
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Referral] Captured: referrer=${referrerId} → referred=${newUserId} type=${referral_type}`);
  }

  return entry;
}

// ─────────────────────────────────────────────
// 3. Qualify a referral (called on artist APPROVED or C2C booking qualified)
//    For artists: called when admin approves them.
//    For C2C: qualification is triggered by booking count reaching threshold.
// ─────────────────────────────────────────────
async function qualifyReferral(referredUserId) {
  const entry = await db.ReferralHistory.findOne({ where: { referred_id: referredUserId } });
  if (!entry || entry.referral_status === "QUALIFIED" || entry.fraud_flag) return;

  await entry.update({
    referral_status: "QUALIFIED",
    qualified_at: new Date(),
    status: "COMPLETED" // legacy
  });

  // After qualifying, re-evaluate the referrer's reward eligibility
  await evaluateAndUnlockRewards(entry.referrer_id);
}

// ─────────────────────────────────────────────
// 4. Evaluate reward unlock for a given user
//    Called after every qualification event.
// ─────────────────────────────────────────────
async function evaluateAndUnlockRewards(userId) {
  const user = await db.User.findByPk(userId);
  if (!user) return;

  const thresholdC2C      = await getSetting("REFERRAL_C2C_COUNT",    50);
  const thresholdBookings = await getSetting("REFERRAL_C2C_BOOKINGS",  3);
  const thresholdC2A      = await getSetting("REFERRAL_C2A_COUNT",    10);
  const thresholdA2A      = await getSetting("REFERRAL_A2A_COUNT",    20);

  // ── CUSTOMER_TO_CUSTOMER reward ─────────────────────────────────
  if (user.role === "USER") {
    const c2cQualified = await db.ReferralHistory.count({
      where: {
        referrer_id: userId,
        referral_type: "CUSTOMER_TO_CUSTOMER",
        referral_status: "QUALIFIED",
        fraud_flag: false
      }
    });

    if (c2cQualified >= thresholdC2C) {
      // Check confirmed bookings from referred customers
      const referredUserIds = await db.ReferralHistory.findAll({
        where: {
          referrer_id: userId,
          referral_type: "CUSTOMER_TO_CUSTOMER",
          referral_status: "QUALIFIED",
          fraud_flag: false
        },
        attributes: ["referred_id"]
      }).then(rows => rows.map(r => r.referred_id));

      const qualifyingBookings = await db.Booking.count({
        where: {
          user_id: { [Op.in]: referredUserIds },
          booking_status: { [Op.in]: ["CONFIRMED", "COMPLETED"] }
        }
      });

      if (qualifyingBookings >= thresholdBookings) {
        await unlockReward(userId, "CUSTOMER_50_PERCENT_OFFER");
      }
    }

    // ── CUSTOMER_TO_ARTIST reward ────────────────────────────────
    const c2aQualified = await db.ReferralHistory.count({
      where: {
        referrer_id: userId,
        referral_type: "CUSTOMER_TO_ARTIST",
        referral_status: "QUALIFIED",
        fraud_flag: false
      }
    });

    if (c2aQualified >= thresholdC2A) {
      await unlockReward(userId, "CUSTOMER_70_PERCENT_OFFER");
    }
  }

  // ── ARTIST_TO_ARTIST reward ──────────────────────────────────────
  if (user.role === "ARTIST") {
    const a2aQualified = await db.ReferralHistory.count({
      where: {
        referrer_id: userId,
        referral_type: "ARTIST_TO_ARTIST",
        referral_status: "QUALIFIED",
        fraud_flag: false
      }
    });

    if (a2aQualified >= thresholdA2A) {
      await unlockReward(userId, "ARTIST_FEATURED_PROFILE");

      // Promote the artist's profile to featured
      const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (artistProfile && !artistProfile.is_featured) {
        await artistProfile.update({ is_featured: true, featured_priority: 1 });
        console.log(`[Referral] Artist ${userId} promoted to featured.`);
      }
    }
  }
}

// Unlock a specific reward (idempotent)
async function unlockReward(userId, rewardType) {
  const [record, created] = await db.ReferralReward.findOrCreate({
    where: { user_id: userId, reward_type: rewardType },
    defaults: { user_id: userId, reward_type: rewardType, status: "LOCKED" }
  });

  if (record.status === "LOCKED") {
    await record.update({ status: "UNLOCKED", unlocked_at: new Date() });
    console.log(`[Referral] Reward UNLOCKED: user=${userId} type=${rewardType}`);
    return true;
  }
  return false; // already unlocked or redeemed
}

// ─────────────────────────────────────────────
// 5. Check booking qualification for C2C referral
//    Called when a booking goes CONFIRMED or COMPLETED.
// ─────────────────────────────────────────────
async function checkBookingQualification(bookingUserId) {
  // Find if this booking user was referred by someone (C2C only)
  const entry = await db.ReferralHistory.findOne({
    where: {
      referred_id: bookingUserId,
      referral_type: "CUSTOMER_TO_CUSTOMER",
      fraud_flag: false
    }
  });
  if (!entry) return; // not a referred user

  // Re-evaluate the referrer's rewards
  await evaluateAndUnlockRewards(entry.referrer_id);
}

// ─────────────────────────────────────────────
// 6. Get dashboard stats for a customer
// ─────────────────────────────────────────────
async function getCustomerDashboard(userId) {
  const codeRecord = await getOrCreateReferralCode(userId);

  const [thresholdC2C, thresholdBookings, thresholdC2A] = await Promise.all([
    getSetting("REFERRAL_C2C_COUNT", 50),
    getSetting("REFERRAL_C2C_BOOKINGS", 3),
    getSetting("REFERRAL_C2A_COUNT", 10)
  ]);

  // C2C stats
  const c2cRefs = await db.ReferralHistory.findAll({
    where: { referrer_id: userId, referral_type: "CUSTOMER_TO_CUSTOMER", fraud_flag: false }
  });
  const c2cTotal = c2cRefs.length;
  const c2cQualified = c2cRefs.filter(r => r.referral_status === "QUALIFIED").length;

  // Count qualifying bookings from referred C2C customers
  const referredC2CIds = c2cRefs
    .filter(r => r.referral_status === "QUALIFIED")
    .map(r => r.referred_id);

  let qualifyingBookings = 0;
  if (referredC2CIds.length > 0) {
    qualifyingBookings = await db.Booking.count({
      where: {
        user_id: { [Op.in]: referredC2CIds },
        booking_status: { [Op.in]: ["CONFIRMED", "COMPLETED"] }
      }
    });
  }

  // C2A stats
  const c2aRefs = await db.ReferralHistory.findAll({
    where: { referrer_id: userId, referral_type: "CUSTOMER_TO_ARTIST", fraud_flag: false }
  });
  const c2aTotal = c2aRefs.length;
  const c2aQualified = c2aRefs.filter(r => r.referral_status === "QUALIFIED").length;

  // Rewards
  const rewards = await db.ReferralReward.findAll({ where: { user_id: userId } });
  const reward50 = rewards.find(r => r.reward_type === "CUSTOMER_50_PERCENT_OFFER");
  const reward70 = rewards.find(r => r.reward_type === "CUSTOMER_70_PERCENT_OFFER");

  const referralLink = `https://api.mehndigo.in/invite?ref=${codeRecord.code}`;

  return {
    referralCode: codeRecord.code,
    referralLink,
    customerReferrals: {
      count: c2cQualified,
      threshold: thresholdC2C,
      pending: c2cTotal - c2cQualified,
      qualifyingBookings: Math.min(qualifyingBookings, thresholdBookings),
      bookingsThreshold: thresholdBookings,
      reward: {
        type: "CUSTOMER_50_PERCENT_OFFER",
        label: "50% Mehndi Offer",
        status: reward50?.status || "LOCKED",
        unlockedAt: reward50?.unlocked_at || null
      }
    },
    artistReferrals: {
      count: c2aQualified,
      threshold: thresholdC2A,
      pending: c2aTotal - c2aQualified,
      reward: {
        type: "CUSTOMER_70_PERCENT_OFFER",
        label: "70% Mehndi Offer",
        status: reward70?.status || "LOCKED",
        unlockedAt: reward70?.unlocked_at || null
      }
    }
  };
}

// ─────────────────────────────────────────────
// 7. Get dashboard stats for an artist
// ─────────────────────────────────────────────
async function getArtistDashboard(userId) {
  const codeRecord = await getOrCreateReferralCode(userId);
  const thresholdA2A = await getSetting("REFERRAL_A2A_COUNT", 20);

  const a2aRefs = await db.ReferralHistory.findAll({
    where: { referrer_id: userId, referral_type: "ARTIST_TO_ARTIST", fraud_flag: false }
  });
  const a2aTotal = a2aRefs.length;
  const a2aQualified = a2aRefs.filter(r => r.referral_status === "QUALIFIED").length;

  const rewardRecord = await db.ReferralReward.findOne({
    where: { user_id: userId, reward_type: "ARTIST_FEATURED_PROFILE" }
  });

  const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: userId } });
  const referralLink = `https://api.mehndigo.in/invite?ref=${codeRecord.code}`;

  return {
    referralCode: codeRecord.code,
    referralLink,
    artistReferrals: {
      count: a2aQualified,
      threshold: thresholdA2A,
      pending: a2aTotal - a2aQualified,
      reward: {
        type: "ARTIST_FEATURED_PROFILE",
        label: "Top Profile / Featured Artist",
        status: rewardRecord?.status || "LOCKED",
        unlockedAt: rewardRecord?.unlocked_at || null
      }
    },
    isFeatured: artistProfile?.is_featured || false
  };
}

// ─────────────────────────────────────────────
// 8. Referral history list for a user
// ─────────────────────────────────────────────
async function getReferralHistory(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const { count, rows } = await db.ReferralHistory.findAndCountAll({
    where: { referrer_id: userId, fraud_flag: false },
    include: [{
      model: db.User,
      as: "referred",
      attributes: ["id", "name", "profile_image", "role", "createdAt"]
    }],
    order: [["createdAt", "DESC"]],
    limit,
    offset
  });

  return {
    total: count,
    page,
    pages: Math.ceil(count / limit),
    items: rows.map(r => ({
      id: r.id,
      referralType: r.referral_type,
      referralStatus: r.referral_status,
      referredName: r.referred?.name || "Unknown",
      referredImage: r.referred?.profile_image,
      referredRole: r.referred?.role,
      joinedAt: r.referred?.createdAt || r.created_at,
      qualifiedAt: r.qualified_at
    }))
  };
}

// ─────────────────────────────────────────────
// 9. Admin stats
// ─────────────────────────────────────────────
async function getAdminStats() {
  const [total, c2c, c2a, a2a, qualified, rewardsUnlocked, featuredArtists] = await Promise.all([
    db.ReferralHistory.count({ where: { fraud_flag: false } }),
    db.ReferralHistory.count({ where: { referral_type: "CUSTOMER_TO_CUSTOMER", fraud_flag: false } }),
    db.ReferralHistory.count({ where: { referral_type: "CUSTOMER_TO_ARTIST", fraud_flag: false } }),
    db.ReferralHistory.count({ where: { referral_type: "ARTIST_TO_ARTIST", fraud_flag: false } }),
    db.ReferralHistory.count({ where: { referral_status: "QUALIFIED", fraud_flag: false } }),
    db.ReferralReward.count({ where: { status: { [Op.in]: ["UNLOCKED", "REDEEMED"] } } }),
    db.ArtistProfile.count({ where: { is_featured: true } })
  ]);

  const rewardBreakdown = await db.ReferralReward.findAll({
    attributes: ["reward_type", "status", [db.sequelize.fn("COUNT", "*"), "count"]],
    group: ["reward_type", "status"],
    raw: true
  });

  return {
    total,
    byType: { c2c, c2a, a2a },
    qualified,
    fraudFlagged: await db.ReferralHistory.count({ where: { fraud_flag: true } }),
    rewardsUnlocked,
    featuredArtists,
    rewardBreakdown
  };
}

module.exports = {
  getOrCreateReferralCode,
  captureReferral,
  qualifyReferral,
  checkBookingQualification,
  evaluateAndUnlockRewards,
  getCustomerDashboard,
  getArtistDashboard,
  getReferralHistory,
  getAdminStats
};
