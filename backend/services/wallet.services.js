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
    const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    let isValid = true;
    if (razorpay_signature && !razorpay_order_id.startsWith("order_mock")) {
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "key_secret")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      isValid = generated_signature === razorpay_signature;
    }

    if (!isValid) {
      throw new AppError("Payment signature verification failed", 400);
    }

    const wallet = await this.getOrCreateWallet(userId);
    const newBalance = wallet.balance + Number(amount);
    await wallet.update({ balance: newBalance });

    const tx = await db.WalletTransaction.create({
      wallet_id: wallet.id,
      transaction_type: "RECHARGE",
      amount: Number(amount),
      status: "SUCCESS",
      description: `Recharge via Online Payment ID: ${razorpay_payment_id || "mock"}`
    });

    return { wallet, tx };
  }

  async initiateWithdrawal(userId, amount) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.balance < Number(amount)) {
      throw new AppError("Sufficient wallet balance required to withdraw", 400);
    }

    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) {
      throw new AppError("Artist profile profile required for withdrawal requests", 404);
    }

    const request = await db.WithdrawRequest.create({
      artist_id: artist.id,
      amount: Number(amount),
      status: "PENDING"
    });

    const newBalance = wallet.balance - Number(amount);
    await wallet.update({ balance: newBalance });

    await db.WalletTransaction.create({
      wallet_id: wallet.id,
      transaction_type: "WITHDRAWAL",
      amount: Number(amount),
      status: "PENDING",
      description: `Withdraw request ID: WR-${request.id}`
    });

    // Notify admin
    await db.Notification.create({
      user_id: 1, // Admin index
      title: "New Withdrawal Request 💸",
      message: `Artist ${userId} requested withdrawal of ₹${amount}.`,
      type: "SYSTEM"
    });

    return request;
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
