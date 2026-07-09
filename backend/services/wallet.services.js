const db = require("../models");
const AppError = require("../utils/errors/app.error");
const crypto = require("crypto");

class WalletService {
  async getOrCreateWallet(userId) {
    let wallet = await db.Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await db.Wallet.create({ user_id: userId, balance: 0 });
    }
    return wallet;
  }

  async getTransactions(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    const history = await db.WalletTransaction.findAll({
      where: { wallet_id: wallet.id },
      include: [
        {
          model: db.Booking,
          as: "booking",
          required: false,
          attributes: ["id", "booking_code", "user_id"],
          include: [
            {
              model: db.User,
              as: "user",
              required: false,
              attributes: ["name", "profile_image"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return (history || []).map((tx) => {
      const txData = tx.toJSON();
      if (txData.booking && txData.booking.user) {
        txData.description = `Payment from ${txData.booking.user.name} (#${txData.booking.booking_code})`;
      }
      return txData;
    });
  }

  async addWalletMoney(userId, data) {
    console.log("[WALLET_SERVICE] addWalletMoney request payload:", JSON.stringify(data, null, 2));
    const paymentService = require("./payment.services");
    
    const verifyData = {
      cashfree_order_id: data.cashfree_order_id || data.order_id || data.orderId,
      payment_session_id: data.payment_session_id
    };
    
    console.log("[WALLET_SERVICE] Calling paymentService.verifyPayment with payload:", JSON.stringify(verifyData, null, 2));
    await paymentService.verifyPayment(userId, verifyData);
    console.log("[WALLET_SERVICE] paymentService.verifyPayment succeeded. Proceeding to credit wallet.");
    
    const wallet = await this.getOrCreateWallet(userId);
    const tx = await db.WalletTransaction.findOne({
      where: { wallet_id: wallet.id, transaction_type: "RECHARGE" },
      order: [["createdAt", "DESC"]]
    });
    
    return { wallet, tx };
  }

  async initiateWithdrawal(userId, amount) {
    const t = await db.sequelize.transaction();
    try {
      // Get or create wallet row safely with row update lock
      let wallet = await db.Wallet.findOne({ 
        where: { user_id: userId },
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      if (!wallet) {
        wallet = await db.Wallet.create({ user_id: userId, balance: 0 }, { transaction: t });
      }

      if (wallet.balance < Number(amount)) {
        console.error(`[WalletDeductionFailed] Insufficient wallet balance for withdrawal. User: ${userId}, Requested: ${amount}, Available: ${wallet.balance}`);
        throw new AppError("You don't have enough wallet balance to complete this transaction.", 400);
      }

      const artist = await db.ArtistProfile.findOne({ 
        where: { user_id: userId },
        transaction: t
      });
      if (!artist) {
        throw new AppError("Artist profile profile required for withdrawal requests", 404);
      }

      const request = await db.WithdrawRequest.create({
        artist_id: artist.id,
        amount: Number(amount),
        status: "PENDING"
      }, { transaction: t });

      const newBalance = wallet.balance - Number(amount);
      await wallet.update({ balance: newBalance }, { transaction: t });

      await db.WalletTransaction.create({
        wallet_id: wallet.id,
        transaction_type: "WITHDRAWAL",
        amount: Number(amount),
        status: "PENDING",
        description: `Withdraw request ID: WR-${request.id}`
      }, { transaction: t });

      await t.commit();

      // Notify admin
      try {
        await db.Notification.create({
          user_id: 1, // Admin index
          title: "New Withdrawal Request 💸",
          message: `Artist ${userId} requested withdrawal of ₹${amount}.`,
          type: "SYSTEM"
        });
      } catch (notifErr) {
        console.error("Error creating withdrawal admin notification:", notifErr.message);
      }

      return request;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async cancelWithdrawal(userId, requestId) {
    const request = await db.WithdrawRequest.findByPk(requestId);
    if (!request || request.status !== "PENDING") {
      throw new AppError("Withdraw request not found or not in PENDING state", 400);
    }

    const artist = await db.ArtistProfile.findByPk(request.artist_id);
    if (!artist || artist.user_id !== userId) {
      throw new AppError("Unauthorized action", 403);
    }

    await request.update({ status: "CANCELLED" });

    const wallet = await this.getOrCreateWallet(userId);
    const newBalance = wallet.balance + request.amount;
    await wallet.update({ balance: newBalance });

    await db.WalletTransaction.create({
      wallet_id: wallet.id,
      transaction_type: "WITHDRAWAL",
      amount: request.amount,
      status: "CANCELLED",
      description: `Cancelled withdraw request WR-${requestId}. Restored funds.`
    });

    return request;
  }

  async getWithdrawHistory(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) return [];

    return await db.WithdrawRequest.findAll({
      where: { artist_id: artist.id },
      order: [["createdAt", "DESC"]]
    });
  }

  async getSettlements(userId, role) {
    let where = {};
    if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (!artist) return [];
      where.artist_id = artist.id;
    }

    return await db.Settlement.findAll({
      where,
      include: [
        {
          model: db.Booking,
          as: "booking",
          attributes: ["id", "booking_code"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async upsertBankAccount(userId, data) {
    const { accountHolderName, accountNumber, ifscCode, bankName, upiId } = data;
    
    let account = await db.BankAccount.findOne({ where: { user_id: userId } });
    if (account) {
      await account.update({
        account_holder_name: accountHolderName,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        bank_name: bankName,
        upi_id: upiId || null
      });
    } else {
      account = await db.BankAccount.create({
        user_id: userId,
        account_holder_name: accountHolderName,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        bank_name: bankName,
        upi_id: upiId || null
      });
    }

    return this.maskBankAccount(account);
  }

  async getBankAccount(userId) {
    const account = await db.BankAccount.findOne({ where: { user_id: userId } });
    if (!account) return null;
    return this.maskBankAccount(account);
  }

  maskBankAccount(account) {
    const accObj = account.toJSON();
    const rawNumber = accObj.account_number || "";
    if (rawNumber.length > 4) {
      accObj.account_number = "*".repeat(rawNumber.length - 4) + rawNumber.slice(-4);
    }
    return accObj;
  }

  async getTransactionById(txId) {
    const tx = await db.WalletTransaction.findByPk(txId, {
      include: [{ model: db.Booking, as: "booking" }]
    });
    if (!tx) {
      throw new AppError("Transaction details not found", 404);
    }
    return tx;
  }
}

module.exports = new WalletService();
