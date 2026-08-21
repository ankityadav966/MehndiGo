const {
  UserRepository,
  ArtistProfileRepository,
  NotificationRepository,
  BookingRepository,
} = require("../repositories");
const AppError = require("../utils/errors/app.error");
const db = require("../models");
const { getIO } = require("../sockets/socket");

const UserRepositor = new UserRepository();
const BookingRepositor = new BookingRepository();
const ArtistProfileRepositor = new ArtistProfileRepository();
const NotificationRepositor = new NotificationRepository();

class AdminService {
  async getAllUsers() {
    return await UserRepositor.getAll({ role: "USER" });
  }

  async getAllArtists() {
    return await db.ArtistProfile.findAll({
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "email", "profile_image"]
        }
      ],
      order: [["id", "DESC"]]
    });
  }

  async getPendingArtists() {
    return await ArtistProfileRepositor.getPendingArtists();
  }

  async verifyArtist(id, data) {
    const artist = await ArtistProfileRepositor.getById(id);

    if (!artist) {
      throw new AppError("Artist not found", 404);
    }

    await ArtistProfileRepositor.update(id, {
      verification_status: data.verification_status,
      rejection_reason: data.rejection_reason || null,
    });

    return await ArtistProfileRepositor.getById(id);
  }

  async getStats() {
    const totalUsers = await UserRepositor.count({ role: "USER" });
    const totalArtists = await ArtistProfileRepositor.count();
    const totalBookings = await BookingRepositor.count();
    const pendingArtists = await ArtistProfileRepositor.getPendingArtists();

    // Calculate revenue (sum of payments where status is SUCCESS)
    const successfulPayments = await db.Payment.findAll({
      where: { status: "SUCCESS" }
    });
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate pending amount (sum of total_price for bookings with status PENDING)
    const pendingBookings = await db.Booking.findAll({
      where: { booking_status: "PENDING" }
    });
    const pendingAmount = pendingBookings.reduce((sum, b) => sum + b.total_price, 0);

    // Calculate remaining amount (sum of remaining_amount for bookings with status CONFIRMED or COMPLETED)
    const activeBookings = await db.Booking.findAll({
      where: {
        booking_status: ["CONFIRMED", "COMPLETED"]
      }
    });
    const remainingAmount = activeBookings.reduce((sum, b) => sum + b.remaining_amount, 0);

    // Calculate Commission stats
    const adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
    let commissionToday = 0, commissionThisMonth = 0, commissionThisYear = 0, commissionLifetime = 0;
    let latestCommissionTransactions = [];

    if (adminUser) {
      const [adminWallet] = await db.Wallet.findOrCreate({
        where: { user_id: adminUser.id },
        defaults: { balance: 0 }
      });
      
      const txs = await db.WalletTransaction.findAll({
        where: {
          wallet_id: adminWallet.id,
          transaction_type: "COMMISSION",
          status: "SUCCESS"
        },
        include: [
          {
            model: db.Booking,
            as: "booking",
            include: [
              { model: db.User, as: "user", attributes: ["name"] },
              { model: db.ArtistProfile, as: "artist", include: [{ model: db.User, as: "user", attributes: ["name"] }] }
            ]
          }
        ],
        order: [["createdAt", "DESC"]]
      });

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      txs.forEach(tx => {
        const txDate = new Date(tx.createdAt);
        commissionLifetime += tx.amount;
        if (txDate >= startOfDay) commissionToday += tx.amount;
        if (txDate >= startOfMonth) commissionThisMonth += tx.amount;
        if (txDate >= startOfYear) commissionThisYear += tx.amount;
      });

      latestCommissionTransactions = txs.slice(0, 5);
    }

    // Calculate Top Earning Artists
    const artistTransactions = await db.WalletTransaction.findAll({
      where: {
        transaction_type: "SETTLEMENT",
        status: "SUCCESS"
      },
      include: [
        {
          model: db.Wallet,
          as: "wallet",
          include: [{ model: db.User, as: "user", attributes: ["name"] }]
        }
      ]
    });

    const artistEarningsMap = {};
    artistTransactions.forEach(tx => {
      const artistName = tx.wallet?.user?.name || "Unknown Artist";
      if (!artistEarningsMap[artistName]) {
        artistEarningsMap[artistName] = 0;
      }
      artistEarningsMap[artistName] += tx.amount;
    });

    const topEarningArtists = Object.keys(artistEarningsMap)
      .map(name => ({ name, earnings: artistEarningsMap[name] }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    // Recent Bookings
    const recentBookings = await db.Booking.findAll({
      include: [
        { model: db.User, as: "user", attributes: ["name"] },
        { model: db.ArtistProfile, as: "artist", include: [{ model: db.User, as: "user", attributes: ["name"] }] }
      ],
      order: [["createdAt", "DESC"]],
      limit: 5
    });

    return {
      totalUsers,
      totalArtists,
      totalBookings,
      pendingArtistsCount: pendingArtists.length,
      totalRevenue,
      pendingAmount,
      remainingAmount,
      commissionToday,
      commissionThisMonth,
      commissionThisYear,
      commissionLifetime,
      latestCommissionTransactions,
      topEarningArtists,
      recentBookings
    };
  }

  async approveArtist(id, adminId = null) {
    const artist = await ArtistProfileRepositor.getArtistById(id);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }
    const previousStatus = artist.verification_status;
    await ArtistProfileRepositor.update(id, {
      verification_status: "APPROVED",
      is_available: true,
      reviewed_by: adminId || null,
      approved_at: new Date(),
      rejection_reason: null,
    });

    if (artist.user_id) {
      await db.User.update({ is_verified: true }, { where: { id: artist.user_id } });
    }

    if (db.AuditLog && adminId) {
      try {
        await db.AuditLog.create({
          admin_id: adminId,
          action: "KYC_APPROVAL",
          details: JSON.stringify({
            artist_id: id,
            artist_user_id: artist.user_id,
            previous_status: previousStatus,
            new_status: "APPROVED",
            timestamp: new Date()
          })
        });
      } catch (auditErr) {
        console.error("[AuditLog Error] Failed to log KYC approval:", auditErr.message);
      }
    }

    await NotificationRepositor.createNotification({
      user_id: artist.user_id,
      title: "Profile Approved! 🎉",
      message: "Congratulations! Your artist profile has been approved. You can now list your services.",
      type: "PROFILE",
      is_read: false,
    });
    // Real-time socket push
    try {
      const io = getIO();
      io.to(artist.user_id.toString()).emit("new_notification", {
        title: "Profile Approved! 🎉",
        message: "Congratulations! Your artist profile has been approved. You can now list your services.",
        type: "PROFILE"
      });
    } catch (e) {}
    // Trigger referred artist milestones evaluation
    try {
      const xpService = require("./xp.services");
      await xpService.evaluateArtistMilestone(artist.user_id);
    } catch (err) {
      console.error("[Milestones Trigger] Error evaluating milestones on approval:", err.message);
    }

    return true;
  }

  async rejectArtist(id, reason, adminId = null) {
    const artist = await ArtistProfileRepositor.getArtistById(id);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }
    const previousStatus = artist.verification_status;
    await ArtistProfileRepositor.update(id, {
      verification_status: "REJECTED",
      is_available: false,
      reviewed_by: adminId || null,
      rejected_at: new Date(),
      rejection_reason: reason,
    });

    if (db.AuditLog && adminId) {
      try {
        await db.AuditLog.create({
          admin_id: adminId,
          action: "KYC_REJECTION",
          details: JSON.stringify({
            artist_id: id,
            artist_user_id: artist.user_id,
            previous_status: previousStatus,
            new_status: "REJECTED",
            rejection_reason: reason,
            timestamp: new Date()
          })
        });
      } catch (auditErr) {
        console.error("[AuditLog Error] Failed to log KYC rejection:", auditErr.message);
      }
    }

    await NotificationRepositor.createNotification({
      user_id: artist.user_id,
      title: "Profile Rejected",
      message: `Your profile could not be approved. Reason: ${reason}. Please re-submit with corrected documents.`,
      type: "PROFILE",
      is_read: false,
    });
    // Real-time socket push
    try {
      const io = getIO();
      io.to(artist.user_id.toString()).emit("new_notification", {
        title: "Profile Rejected",
        message: `Your profile could not be approved. Reason: ${reason}. Please re-submit with corrected documents.`,
        type: "PROFILE"
      });
    } catch (e) {}
    return true;
  }

  async suspendArtist(id, reason = "Suspended by Administrator", adminId = null) {
    const artist = await ArtistProfileRepositor.getArtistById(id);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }
    const previousStatus = artist.verification_status;
    await ArtistProfileRepositor.update(id, {
      verification_status: "REJECTED",
      is_available: false,
      rejection_reason: reason
    });

    // Deactivate user account if user exists
    if (artist.user_id) {
      await db.User.update({ is_active: false }, { where: { id: artist.user_id } });
    }

    if (db.AuditLog && adminId) {
      try {
        await db.AuditLog.create({
          admin_id: adminId,
          action: "ARTIST_SUSPENSION",
          details: JSON.stringify({
            artist_id: id,
            artist_user_id: artist.user_id,
            previous_status: previousStatus,
            new_status: "SUSPENDED",
            reason,
            timestamp: new Date()
          })
        });
      } catch (auditErr) {
        console.error("[AuditLog Error] Failed to log artist suspension:", auditErr.message);
      }
    }

    await NotificationRepositor.createNotification({
      user_id: artist.user_id,
      title: "Account Suspended ⚠️",
      message: `Your artist account has been suspended. Reason: ${reason}. Please contact support.`,
      type: "PROFILE",
      is_read: false
    });

    return true;
  }

  async reactivateArtist(id, adminId = null) {
    const artist = await ArtistProfileRepositor.getArtistById(id);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }
    const previousStatus = artist.verification_status;
    await ArtistProfileRepositor.update(id, {
      verification_status: "APPROVED",
      is_available: true,
      rejection_reason: null
    });

    // Reactivate user account if user exists
    if (artist.user_id) {
      await db.User.update({ is_active: true }, { where: { id: artist.user_id } });
    }

    if (db.AuditLog && adminId) {
      try {
        await db.AuditLog.create({
          admin_id: adminId,
          action: "ARTIST_REACTIVATION",
          details: JSON.stringify({
            artist_id: id,
            artist_user_id: artist.user_id,
            previous_status: previousStatus,
            new_status: "APPROVED",
            timestamp: new Date()
          })
        });
      } catch (auditErr) {
        console.error("[AuditLog Error] Failed to log artist reactivation:", auditErr.message);
      }
    }

    await NotificationRepositor.createNotification({
      user_id: artist.user_id,
      title: "Account Reactivated 🎉",
      message: "Your artist account has been reactivated! You can now accept customer bookings.",
      type: "PROFILE",
      is_read: false
    });

    return true;
  }

  async getAllBookings() {
    return await db.Booking.findAll({
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "email"]
        },
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name"]
            }
          ]
        },
        {
          model: db.Service,
          as: "service"
        },
        {
          model: db.AvailabilitySlot,
          as: "slot"
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getAllPayments() {
    return await db.Payment.findAll({
      include: [
        {
          model: db.Booking,
          as: "booking",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name"]
            },
            {
              model: db.ArtistProfile,
              as: "artist",
              include: [
                {
                  model: db.User,
                  as: "user",
                  attributes: ["id", "name"]
                }
              ]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getAllNotifications() {
    return await db.Notification.findAll({
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "role"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async sendSystemNotification(data) {
    const { user_id, title, message } = data;
    
    let targetUsers = [];
    if (user_id === "ALL_USERS") {
      targetUsers = await db.User.findAll({ where: { role: "USER" } });
    } else if (user_id === "ALL_ARTISTS") {
      targetUsers = await db.User.findAll({ where: { role: "ARTIST" } });
    } else if (user_id === "ALL") {
      targetUsers = await db.User.findAll();
    } else {
      targetUsers = [{ id: user_id }];
    }

    const notifications = await Promise.all(targetUsers.map(async (u) => {
      const notif = await db.Notification.create({
        user_id: u.id,
        title,
        message,
        type: "SYSTEM",
        is_read: false
      });
      return notif;
    }));

    try {
      const io = getIO();
      targetUsers.forEach((u) => {
        io.to(u.id.toString()).emit("new_notification", {
          title,
          message,
          type: "SYSTEM"
        });
      });
    } catch (e) {}

    return notifications;
  }

  async getAllMessages() {
    return await db.Message.findAll({
      include: [
        {
          model: db.User,
          as: "sender",
          attributes: ["id", "name", "role"]
        },
        {
          model: db.User,
          as: "receiver",
          attributes: ["id", "name", "role"]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit: 100
    });
  }


  async getWalletSummary() {
    const adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
    if (!adminUser) {
      throw new AppError("Admin user not found", 404);
    }
    const [adminWallet] = await db.Wallet.findOrCreate({
      where: { user_id: adminUser.id },
      defaults: { balance: 0 }
    });

    const totalCommissionEarned = await db.WalletTransaction.sum("amount", {
      where: {
        wallet_id: adminWallet.id,
        transaction_type: "COMMISSION",
        status: "SUCCESS"
      }
    }) || 0;

    const totalBookings = await db.WalletTransaction.count({
      where: {
        wallet_id: adminWallet.id,
        transaction_type: "COMMISSION"
      },
      distinct: true,
      col: "booking_id"
    });

    const totalTransactions = await db.WalletTransaction.count({
      where: { wallet_id: adminWallet.id }
    });

    const pendingBookings = await db.Booking.findAll({
      where: {
        detailed_status: "WAITING_FOR_USER_PAYMENT",
        payment_status: "PARTIAL"
      }
    });
    const totalPendingSettlement = pendingBookings.reduce((sum, b) => sum + (b.remaining_amount || 0), 0);

    return {
      balance: adminWallet.balance,
      totalCommissionEarned,
      totalBookings,
      totalTransactions,
      totalPendingSettlement
    };
  }

  async getCommissionHistory(query = {}) {
    const adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
    if (!adminUser) {
      throw new AppError("Admin user not found", 404);
    }
    const [adminWallet] = await db.Wallet.findOrCreate({
      where: { user_id: adminUser.id },
      defaults: { balance: 0 }
    });

    const limit = parseInt(query.limit) || 10;
    const page = parseInt(query.page) || 1;
    const offset = (page - 1) * limit;

    const where = {
      wallet_id: adminWallet.id,
      transaction_type: "COMMISSION"
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = {
        [db.Sequelize.Op.between]: [new Date(query.startDate), new Date(query.endDate)]
      };
    }

    if (query.search) {
      where.description = {
        [db.Sequelize.Op.like]: `%${query.search}%`
      };
    }

    const { count, rows } = await db.WalletTransaction.findAndCountAll({
      where,
      include: [
        {
          model: db.Booking,
          as: "booking",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "email", "phone"]
            },
            {
              model: db.ArtistProfile,
              as: "artist",
              include: [
                {
                  model: db.User,
                  as: "user",
                  attributes: ["id", "name"]
                }
              ]
            },
            {
              model: db.Service,
              as: "service",
              attributes: ["id", "specialization_name", "category"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      transactions: rows
    };
  }

  async getDashboardSummary() {
    const adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
    if (!adminUser) {
      throw new AppError("Admin user not found", 404);
    }
    const [adminWallet] = await db.Wallet.findOrCreate({
      where: { user_id: adminUser.id },
      defaults: { balance: 0 }
    });

    const txs = await db.WalletTransaction.findAll({
      where: {
        wallet_id: adminWallet.id,
        transaction_type: "COMMISSION",
        status: "SUCCESS"
      }
    });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    const startOfWeek = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate());
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let today = 0, weekly = 0, monthly = 0, yearly = 0, lifetime = 0;
    txs.forEach(tx => {
      const txDate = new Date(tx.createdAt);
      lifetime += tx.amount;
      if (txDate >= startOfDay) today += tx.amount;
      if (txDate >= startOfWeek) weekly += tx.amount;
      if (txDate >= startOfMonth) monthly += tx.amount;
      if (txDate >= startOfYear) yearly += tx.amount;
    });

    return {
      today,
      weekly,
      monthly,
      yearly,
      lifetime
    };
  }

  async getWalletTransactionDetails(txId) {
    const adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
    if (!adminUser) {
      throw new AppError("Admin user not found", 404);
    }
    const [adminWallet] = await db.Wallet.findOrCreate({
      where: { user_id: adminUser.id },
      defaults: { balance: 0 }
    });

    const tx = await db.WalletTransaction.findOne({
      where: {
        id: txId,
        wallet_id: adminWallet.id
      },
      include: [
        {
          model: db.Booking,
          as: "booking",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "email", "phone"]
            },
            {
              model: db.ArtistProfile,
              as: "artist",
              include: [
                {
                  model: db.User,
                  as: "user",
                  attributes: ["id", "name", "email", "phone", "profile_image"]
                }
              ]
            },
            {
              model: db.Service,
              as: "service"
            }
          ]
        }
      ]
    });

    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }

    return tx;
  }

  async getAllWithdrawals() {
    const requests = await db.WithdrawRequest.findAll({
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "phone", "email", "profile_image"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const enriched = await Promise.all(
      requests.map(async (req) => {
        const item = req.toJSON();
        if (item.artist && item.artist.user_id) {
          const bank = await db.BankAccount.findOne({ where: { user_id: item.artist.user_id } });
          if (bank) {
            item.bank_account = {
              account_holder_name: bank.account_holder_name,
              bank_name: bank.bank_name,
              ifsc_code: bank.ifsc_code,
              account_number: bank.account_number,
              upi_id: bank.upi_id
            };
          }
        }
        return item;
      })
    );

    return enriched;
  }

  async approveWithdrawal(requestId) {
    const t = await db.sequelize.transaction();
    try {
      const request = await db.WithdrawRequest.findByPk(requestId, {
        include: [{ model: db.ArtistProfile, as: "artist" }],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!request) {
        throw new AppError("Withdrawal request not found", 404);
      }

      if (request.status !== "PENDING") {
        throw new AppError(`Cannot approve request. It is already in '${request.status}' status.`, 400);
      }

      const artist = request.artist;
      if (!artist) {
        throw new AppError("Associated artist profile not found", 404);
      }

      const wallet = await db.Wallet.findOne({
        where: { user_id: artist.user_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!wallet) {
        throw new AppError("Artist wallet not found", 404);
      }

      // Finalize withdrawal: clear held pending balance and increment total_withdrawals
      const newPending = Math.max(0, Number(wallet.pending_balance || 0) - Number(request.amount));
      const newTotalWithdrawals = Number(wallet.total_withdrawals || 0) + Number(request.amount);

      await wallet.update({
        pending_balance: newPending,
        total_withdrawals: newTotalWithdrawals
      }, { transaction: t });

      await request.update({
        status: "COMPLETED",
        rejection_reason: null
      }, { transaction: t });

      // Update existing pending transaction or create a completed transaction
      const existingTx = await db.WalletTransaction.findOne({
        where: {
          wallet_id: wallet.id,
          transaction_type: "WITHDRAWAL",
          status: "PENDING"
        },
        transaction: t
      });

      if (existingTx) {
        await existingTx.update({
          status: "SUCCESS",
          description: `Withdrawal of ₹${request.amount} approved and settled to bank account`
        }, { transaction: t });
      } else {
        await db.WalletTransaction.create({
          wallet_id: wallet.id,
          transaction_type: "WITHDRAWAL",
          amount: request.amount,
          status: "SUCCESS",
          description: `Withdrawal of ₹${request.amount} approved and settled to bank account`
        }, { transaction: t });
      }

      const ledgerService = require("./ledger.services");
      await ledgerService.recordEntry({
        userId: artist.user_id,
        walletId: wallet.id,
        entryType: "DEBIT",
        amount: Number(request.amount),
        balanceAfter: Number(wallet.available_balance !== undefined ? wallet.available_balance : wallet.balance),
        referenceId: `WITHDRAW-APPROVE-${request.id}`,
        description: `Withdrawal request WR-${request.id} approved & funds settled`
      }, t);

      await t.commit();

      // Notify Artist
      try {
        await db.Notification.create({
          user_id: artist.user_id,
          title: "Withdrawal Approved! 💸",
          message: `Your withdrawal request of ₹${request.amount} has been approved and processed to your bank account.`,
          type: "SYSTEM"
        });
      } catch (notifErr) {
        console.error("Error creating withdrawal approval notification:", notifErr.message);
      }

      return request;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async rejectWithdrawal(requestId, reason = "Rejected by Admin") {
    const t = await db.sequelize.transaction();
    try {
      const request = await db.WithdrawRequest.findByPk(requestId, {
        include: [{ model: db.ArtistProfile, as: "artist" }],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!request) {
        throw new AppError("Withdrawal request not found", 404);
      }

      if (request.status !== "PENDING") {
        throw new AppError(`Cannot reject request. It is already in '${request.status}' status.`, 400);
      }

      const artist = request.artist;
      if (!artist) {
        throw new AppError("Associated artist profile not found", 404);
      }

      const wallet = await db.Wallet.findOne({
        where: { user_id: artist.user_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!wallet) {
        throw new AppError("Artist wallet not found", 404);
      }

      // Release held funds back to available balance
      const newAvail = Number(wallet.available_balance !== undefined ? wallet.available_balance : wallet.balance) + Number(request.amount);
      const newPending = Math.max(0, Number(wallet.pending_balance || 0) - Number(request.amount));

      await wallet.update({
        balance: newAvail,
        available_balance: newAvail,
        pending_balance: newPending
      }, { transaction: t });

      await request.update({
        status: "REJECTED",
        rejection_reason: reason || "Rejected by Administrator"
      }, { transaction: t });

      const existingTx = await db.WalletTransaction.findOne({
        where: {
          wallet_id: wallet.id,
          transaction_type: "WITHDRAWAL",
          status: "PENDING"
        },
        transaction: t
      });

      if (existingTx) {
        await existingTx.update({
          status: "FAILED",
          description: `Withdrawal WR-${request.id} rejected: ${reason || 'Admin rejection'}. Funds restored.`
        }, { transaction: t });
      }

      const ledgerService = require("./ledger.services");
      await ledgerService.recordEntry({
        userId: artist.user_id,
        walletId: wallet.id,
        entryType: "RELEASE",
        amount: Number(request.amount),
        balanceAfter: newAvail,
        referenceId: `WITHDRAW-REJECT-${request.id}`,
        description: `Held funds released back due to rejection of withdrawal WR-${request.id}: ${reason || 'Admin rejection'}`
      }, t);

      await t.commit();

      // Notify Artist
      try {
        await db.Notification.create({
          user_id: artist.user_id,
          title: "Withdrawal Request Rejected ❌",
          message: `Your withdrawal request of ₹${request.amount} was rejected. Reason: ${reason || "Verification error"}. Held funds have been returned to your wallet.`,
          type: "SYSTEM"
        });
      } catch (notifErr) {
        console.error("Error creating withdrawal rejection notification:", notifErr.message);
      }

      return request;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // --- REVIEW MODERATION ---
  async getReviews(status = "ALL") {
    const where = {};
    if (status === "APPROVED" || status === "VERIFIED") {
      where.is_verified = true;
    } else if (status === "REJECTED" || status === "UNVERIFIED") {
      where.is_verified = false;
    }

    return await db.Review.findAll({
      where,
      include: [
        { model: db.User, as: "user", attributes: ["id", "name", "email", "phone", "profile_image"] },
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [{ model: db.User, as: "user", attributes: ["id", "name", "email", "phone"] }]
        },
        { model: db.Booking, as: "booking", attributes: ["id", "booking_code", "total_price", "booking_status"] },
        { model: db.ReviewReply, as: "replies" }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async approveReview(reviewId) {
    const review = await db.Review.findByPk(reviewId);
    if (!review) throw new AppError("Review not found", 404);

    await review.update({ is_verified: true });

    const reviewService = require("./review.services");
    await reviewService.recalculateArtistRating(review.artist_id);

    return review;
  }

  async rejectReview(reviewId, reason = "Rejected by Moderator") {
    const review = await db.Review.findByPk(reviewId);
    if (!review) throw new AppError("Review not found", 404);

    await review.update({ is_verified: false });

    const reviewService = require("./review.services");
    await reviewService.recalculateArtistRating(review.artist_id);

    return review;
  }

  // --- SUPPORT TICKETS ---
  async getSupportTickets(params = {}) {
    const where = {};
    if (params.status && params.status !== "ALL") {
      where.status = params.status;
    }
    if (params.category) {
      where.category = params.category;
    }

    return await db.SupportTicket.findAll({
      where,
      include: [
        { model: db.User, as: "user", attributes: ["id", "name", "email", "phone", "profile_image", "role"] }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getSupportTicketDetails(id) {
    const ticket = await db.SupportTicket.findByPk(id, {
      include: [
        { model: db.User, as: "user", attributes: ["id", "name", "email", "phone", "profile_image", "role"] }
      ]
    });
    if (!ticket) throw new AppError("Support ticket not found", 404);
    return ticket;
  }

  async updateTicketStatus(id, status) {
    const ticket = await db.SupportTicket.findByPk(id);
    if (!ticket) throw new AppError("Support ticket not found", 404);

    await ticket.update({ status });
    return ticket;
  }

  async replySupportTicket(id, message, status, adminUserId) {
    const ticket = await db.SupportTicket.findByPk(id);
    if (!ticket) throw new AppError("Support ticket not found", 404);

    const admin = await db.User.findByPk(adminUserId);
    let repliesList = [];
    try {
      repliesList = ticket.replies ? (typeof ticket.replies === "string" ? JSON.parse(ticket.replies) : ticket.replies) : [];
    } catch (_) {
      repliesList = [];
    }

    repliesList.push({
      sender_id: adminUserId,
      sender_name: admin ? admin.name : "Admin Support",
      sender_role: "ADMIN",
      message,
      created_at: new Date().toISOString()
    });

    const newStatus = status || ticket.status || "OPEN";
    await ticket.update({
      replies: JSON.stringify(repliesList),
      status: newStatus
    });

    // Notify ticket owner
    try {
      await db.Notification.create({
        user_id: ticket.user_id,
        title: `Support Ticket #${ticket.id} Updated 💬`,
        message: `Admin replied: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
        type: "SYSTEM",
        data: {
          type: "support",
          event: "ticket_reply",
          ticketId: ticket.id
        }
      });
    } catch (notifErr) {
      console.error("Error creating ticket reply notification:", notifErr.message);
    }

    return ticket;
  }
}

module.exports = new AdminService();
