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

  async getWalletSummary(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: wallet.balance || 0,
      pending_balance: wallet.pending_balance || 0,
      lifetime_earnings: wallet.lifetime_earnings || 0,
      total_withdrawals: wallet.total_withdrawals || 0,
      withdrawable_balance: wallet.balance || 0
    };
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
      razorpay_order_id: data.razorpay_order_id || data.order_id || data.orderId,
      razorpay_payment_id: data.razorpay_payment_id || data.payment_id,
      razorpay_signature: data.razorpay_signature || data.signature
    };
    
    console.log("[WALLET_SERVICE] Calling paymentService.verifyPayment with payload:", JSON.stringify(verifyData, null, 2));
    const result = await paymentService.verifyPayment(userId, verifyData);
    console.log("[WALLET_SERVICE] paymentService.verifyPayment succeeded. Returning updated wallet.");
    
    const wallet = await this.getOrCreateWallet(userId);
    const tx = await db.WalletTransaction.findOne({
      where: { wallet_id: wallet.id, transaction_type: "RECHARGE" },
      order: [["createdAt", "DESC"]]
    });
    
    return { wallet, tx, result };
  }

  async initiateWithdrawal(userId, amount) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      throw new AppError("Minimum withdrawal amount is ₹100", 400);
    }

    const bankAccount = await db.BankAccount.findOne({ where: { user_id: userId } });
    if (!bankAccount || (!bankAccount.account_number && !bankAccount.upi_id)) {
      throw new AppError("Please link your bank account or UPI ID before requesting a withdrawal.", 400);
    }

    const t = await db.sequelize.transaction();
    try {
      const artist = await db.ArtistProfile.findOne({ 
        where: { user_id: userId },
        transaction: t
      });
      if (!artist) {
        throw new AppError("Artist profile required for withdrawal requests", 404);
      }
      if (artist.verification_status !== "APPROVED") {
        throw new AppError("Only approved artists with verified KYC can request withdrawals", 403);
      }

      // Check if artist already has an active PENDING withdrawal request
      const existingPending = await db.WithdrawRequest.findOne({
        where: { artist_id: artist.id, status: "PENDING" },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (existingPending) {
        throw new AppError("You already have a pending withdrawal request (WR-" + existingPending.id + ") being processed. Please wait for it to complete.", 400);
      }

      // Get or create wallet row safely with row update lock
      let wallet = await db.Wallet.findOne({ 
        where: { user_id: userId },
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      if (!wallet) {
        wallet = await db.Wallet.create({ user_id: userId, balance: 0, available_balance: 0, pending_balance: 0 }, { transaction: t });
      }

      const availableBalance = Number(wallet.available_balance !== undefined ? wallet.available_balance : wallet.balance);
      if (availableBalance < numAmount) {
        console.error(`[WalletDeductionFailed] Insufficient wallet balance for withdrawal. User: ${userId}, Requested: ${numAmount}, Available: ${availableBalance}`);
        throw new AppError("You don't have enough available balance (₹" + availableBalance + ") to withdraw ₹" + numAmount + ".", 400);
      }

      const request = await db.WithdrawRequest.create({
        artist_id: artist.id,
        amount: numAmount,
        status: "PENDING"
      }, { transaction: t });

      // Hold amount: decrement available balance and track in pending_balance
      const newAvail = availableBalance - numAmount;
      const newPending = Number(wallet.pending_balance || 0) + numAmount;
      await wallet.update({
        balance: newAvail,
        available_balance: newAvail,
        pending_balance: newPending
      }, { transaction: t });

      await db.WalletTransaction.create({
        wallet_id: wallet.id,
        transaction_type: "WITHDRAWAL",
        amount: numAmount,
        status: "PENDING",
        description: `Withdrawal request WR-${request.id} submitted (Held for processing)`
      }, { transaction: t });

      const ledgerService = require("./ledger.services");
      await ledgerService.recordEntry({
        userId,
        walletId: wallet.id,
        entryType: "HOLD",
        amount: numAmount,
        balanceAfter: newAvail,
        referenceId: `WITHDRAW-REQ-${request.id}`,
        description: `Funds reserved for withdrawal request WR-${request.id}`
      }, t);

      await t.commit();

      // Notify admin
      try {
        await db.Notification.create({
          user_id: 1, // Admin index
          title: "New Withdrawal Request 💸",
          message: `Artist ${userId} requested withdrawal of ₹${numAmount}.`,
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
    const t = await db.sequelize.transaction();
    try {
      const request = await db.WithdrawRequest.findByPk(requestId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (!request || request.status !== "PENDING") {
        throw new AppError("Withdraw request not found or not in PENDING state", 400);
      }

      const artist = await db.ArtistProfile.findByPk(request.artist_id, { transaction: t });
      if (!artist || Number(artist.user_id) !== Number(userId)) {
        throw new AppError("Unauthorized action", 403);
      }

      await request.update({ status: "CANCELLED" }, { transaction: t });

      const wallet = await db.Wallet.findOne({
        where: { user_id: userId },
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      if (wallet) {
        const newAvail = Number(wallet.available_balance !== undefined ? wallet.available_balance : wallet.balance) + Number(request.amount);
        const newPending = Math.max(0, Number(wallet.pending_balance || 0) - Number(request.amount));
        await wallet.update({
          balance: newAvail,
          available_balance: newAvail,
          pending_balance: newPending
        }, { transaction: t });

        await db.WalletTransaction.create({
          wallet_id: wallet.id,
          transaction_type: "WITHDRAWAL",
          amount: Number(request.amount),
          status: "CANCELLED",
          description: `Cancelled withdraw request WR-${requestId}. Restored funds.`
        }, { transaction: t });

        const ledgerService = require("./ledger.services");
        await ledgerService.recordEntry({
          userId,
          walletId: wallet.id,
          entryType: "RELEASE",
          amount: Number(request.amount),
          balanceAfter: newAvail,
          referenceId: `WITHDRAW-CANCEL-${requestId}`,
          description: `Held funds released back from cancelled withdrawal WR-${requestId}`
        }, t);
      }

      await t.commit();
      return request;
    } catch (error) {
      await t.rollback();
      throw error;
    }
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
      const updates = {
        account_holder_name: accountHolderName,
        ifsc_code: ifscCode,
        bank_name: bankName,
        upi_id: upiId || null
      };
      if (accountNumber && !accountNumber.includes("*")) {
        updates.account_number = accountNumber;
      }
      await account.update(updates);
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

    try {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (artist) {
        await artist.update({
          bank_account_number: (accountNumber && !accountNumber.includes("*")) ? accountNumber : artist.bank_account_number,
          bank_ifsc: ifscCode || artist.bank_ifsc,
          bank_account_holder: accountHolderName || artist.bank_account_holder
        });
      }
    } catch (_) {}

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
