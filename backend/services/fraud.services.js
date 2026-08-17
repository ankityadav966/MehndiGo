/**
 * MehndiGo Fraud Risk Scoring & Threat Detection Engine
 */
const db = require("../models");
const { Op } = require("sequelize");

class FraudDetectionService {
  /**
   * Calculate Internal Fraud Risk Score (0 - 100)
   */
  async calculateUserRiskScore(userId, reqContext = {}) {
    let riskScore = 0;
    const flags = [];

    if (!userId) return { riskScore: 0, flags: ["ANONYMOUS_USER"], status: "LOW_RISK" };

    try {
      const user = await db.User.findByPk(userId);
      if (!user) return { riskScore: 0, flags: ["USER_NOT_FOUND"], status: "LOW_RISK" };

      // 1. Check for Duplicate IP Accounts
      if (reqContext.ip) {
        const ipAccounts = await db.User.count({ where: { ip_address: reqContext.ip } });
        if (ipAccounts > 3) {
          riskScore += 25;
          flags.push("MULTIPLE_ACCOUNTS_SAME_IP");
        }
      }

      // 2. Check for Rapid Failed Payment Attempts
      const recentFailedBookings = await db.Booking.count({
        where: {
          user_id: userId,
          payment_status: "FAILED",
          updatedAt: { [Op.gt]: new Date(Date.now() - 10 * 60 * 1000) }
        }
      });
      if (recentFailedBookings >= 3) {
        riskScore += 35;
        flags.push("REPEATED_PAYMENT_FAILURES");
      }

      // 3. Check for Suspicious Coupon Brute-Forcing
      if (reqContext.failedCouponAttempts > 3) {
        riskScore += 20;
        flags.push("COUPON_BRUTE_FORCE");
      }

      // Determine risk tier
      let status = "LOW_RISK";
      if (riskScore >= 70) {
        status = "HIGH_RISK_BLOCKED";
      } else if (riskScore >= 30) {
        status = "MEDIUM_RISK_VERIFICATION_REQUIRED";
      }

      return {
        userId,
        riskScore: Math.min(riskScore, 100),
        status,
        flags,
        timestamp: new Date()
      };
    } catch (e) {
      console.log("Error calculating fraud score:", e.message);
      return { riskScore: 0, status: "LOW_RISK", flags: [] };
    }
  }
}

module.exports = new FraudDetectionService();
