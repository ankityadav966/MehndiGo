const db = require("./models");

async function main() {
  try {
    console.log("Synchronizing growth engine, User, and Wallet models...");
    await db.User.sync({ alter: true });
    await db.Wallet.sync({ alter: true });
    await db.WalletTransaction.sync({ alter: true });
    await db.XpLog.sync({ alter: true });
    await db.Badge.sync({ alter: true });
    await db.UserBadge.sync({ alter: true });
    await db.RewardOption.sync({ alter: true });
    await db.RewardClaim.sync({ alter: true });
    console.log("New growth engine models synchronized successfully!");

    // Seed default Badges
    console.log("Seeding default badges...");
    const defaultBadges = [
      {
        name: "First Referral",
        description: "Invited your first friend to try MehndiGo",
        icon_name: "gift-outline",
        criteria_type: "REFERRAL_COUNT",
        criteria_value: 1
      },
      {
        name: "Top Ambassador",
        description: "Successfully invited 10 or more friends",
        icon_name: "ribbon-outline",
        criteria_type: "REFERRAL_COUNT",
        criteria_value: 10
      },
      {
        name: "Super Referrer",
        description: "Successfully invited 50 or more friends",
        icon_name: "trophy-outline",
        criteria_type: "REFERRAL_COUNT",
        criteria_value: 50
      },
      {
        name: "Loyal Customer",
        description: "Completed 5 or more mehndi bookings",
        icon_name: "heart-outline",
        criteria_type: "BOOKING_COUNT",
        criteria_value: 5
      },
      {
        name: "First Review",
        description: "Gave your first rating/review to an artist",
        icon_name: "star-outline",
        criteria_type: "REVIEW_COUNT",
        criteria_value: 1
      }
    ];

    for (const b of defaultBadges) {
      await db.Badge.findOrCreate({
        where: { name: b.name },
        defaults: b
      });
    }
    console.log("Badges seeded!");

    // Seed default Rewards
    console.log("Seeding default reward store options...");
    const defaultRewards = [
      {
        title: "₹50 Discount Coupon",
        description: "Get flat ₹50 off on your next booking",
        xp_cost: 500,
        type: "COUPON",
        value: 50,
        coupon_code: "XP50OFF",
        is_active: true
      },
      {
        title: "₹150 Discount Coupon",
        description: "Get flat ₹150 off on your next booking",
        xp_cost: 1200,
        type: "COUPON",
        value: 150,
        coupon_code: "XP150OFF",
        is_active: true
      },
      {
        title: "Featured Artist Boost",
        description: "Get your artist profile featured on the home screen for 3 days",
        xp_cost: 2000,
        type: "FEATURED_BOOST",
        value: 3,
        coupon_code: "FEATURE3D",
        is_active: true
      },
      {
        title: "₹500 Cash Reward",
        description: "Redeem XP for ₹500 cash credited to your wallet",
        xp_cost: 4000,
        type: "CASH",
        value: 500,
        coupon_code: "CASH500",
        is_active: true
      }
    ];

    for (const r of defaultRewards) {
      await db.RewardOption.findOrCreate({
        where: { title: r.title },
        defaults: r
      });
    }
    console.log("Rewards seeded!");

    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Database sync failed:", error);
    process.exit(1);
  }
}

main();
