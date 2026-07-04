const db = require("../models");
const AppError = require("../utils/errors/app.error");

class RewardService {
  /**
   * List all active reward options
   */
  async listRewards() {
    return await db.RewardOption.findAll({
      where: { is_active: true },
      order: [["xp_cost", "ASC"]]
    });
  }

  /**
   * Claim/redeem a reward with user XP
   */
  async claimReward(userId, rewardId) {
    const user = await db.User.findByPk(userId);
    if (!user) throw new AppError("User not found", 404);

    const reward = await db.RewardOption.findByPk(rewardId);
    if (!reward || !reward.is_active) {
      throw new AppError("Reward option not found or inactive", 404);
    }

    // Verify user has enough XP
    if (user.current_xp < reward.xp_cost) {
      throw new AppError(`Insufficient XP. You need ${reward.xp_cost} XP but only have ${user.current_xp} XP.`, 400);
    }

    // Deduct XP
    await user.decrement("current_xp", { by: reward.xp_cost });

    // Log XP deduction in XpLog
    await db.XpLog.create({
      user_id: userId,
      amount: -reward.xp_cost,
      reason: `Redeemed: ${reward.title}`
    });

    // Generate unique claim coupon code
    const claimCode = reward.coupon_code || `MGOXP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create Reward Claim entry
    const claim = await db.RewardClaim.create({
      user_id: userId,
      reward_id: rewardId,
      status: "APPROVED",
      claim_code: claimCode
    });

    // Handle special reward types: CASH
    if (reward.type === "CASH") {
      const [wallet] = await db.Wallet.findOrCreate({
        where: { user_id: userId },
        defaults: { user_id: userId, balance: 0 }
      });

      await wallet.increment("balance", { by: reward.value });

      await db.WalletTransaction.create({
        wallet_id: wallet.id,
        transaction_type: "REFERRAL", // We can use REFERRAL or CASHBACK
        amount: reward.value,
        status: "SUCCESS",
        description: `XP Redemption cash bonus for "${reward.title}"`
      });

      await db.Notification.create({
        user_id: userId,
        title: "Cash Redeemed! 💸",
        message: `Awesome! ₹${reward.value} cash has been successfully credited to your wallet from your XP redemption.`,
        type: "SYSTEM"
      });
    } else {
      // General Coupon claim notification
      await db.Notification.create({
        user_id: userId,
        title: "Reward Claimed! 🎁",
        message: `You claimed "${reward.title}"! Use coupon code: ${claimCode} during checkout to redeem your reward.`,
        type: "SYSTEM"
      });
    }

    return {
      claim,
      title: reward.title,
      claimCode,
      xpRemaining: user.current_xp - reward.xp_cost
    };
  }
}

module.exports = new RewardService();
