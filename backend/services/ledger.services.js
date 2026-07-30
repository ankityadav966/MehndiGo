"use strict";

const db = require("../models");
const AppError = require("../utils/appError");

class LedgerService {
  /**
   * Record a double-entry ledger record alongside wallet balance mutation
   */
  async recordEntry({
    userId,
    walletId,
    bookingId = null,
    entryType,
    amount,
    balanceAfter = 0,
    referenceId = null,
    description = ""
  }, transaction = null) {
    const options = transaction ? { transaction } : {};

    return await db.LedgerEntry.create(
      {
        user_id: userId,
        wallet_id: walletId,
        booking_id: bookingId,
        entry_type: entryType,
        amount: Number(amount),
        balance_after: Number(balanceAfter),
        reference_id: referenceId,
        description: description
      },
      options
    );
  }

  /**
   * Get ledger history for a user
   */
  async getUserLedger(userId, limit = 50, offset = 0) {
    return await db.LedgerEntry.findAndCountAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset: Number(offset)
    });
  }
}

module.exports = new LedgerService();
