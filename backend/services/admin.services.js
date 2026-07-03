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

    return {
      totalUsers,
      totalArtists,
      totalBookings,
      pendingArtistsCount: pendingArtists.length,
      totalRevenue,
      pendingAmount,
      remainingAmount
    };
  }

  async approveArtist(id) {
    const artist = await ArtistProfileRepositor.getArtistById(id);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }
    await ArtistProfileRepositor.update(id, {
      verification_status: "APPROVED",
    });
    await NotificationRepositor.createNotification({
      user_id: artist.user_id,
      title: "Profile Approved! 🎉",
      message: "Congratulations! Your artist profile has been approved. You can now list your services.",
      type: "SYSTEM",
      is_read: false,
    });
    // Real-time socket push
    try {
      const io = getIO();
      io.to(artist.user_id.toString()).emit("new_notification", {
        title: "Profile Approved! 🎉",
        message: "Congratulations! Your artist profile has been approved. You can now list your services.",
        type: "SYSTEM"
      });
    } catch (e) {}
    return true;
  }

  async rejectArtist(id, reason) {
    const artist = await ArtistProfileRepositor.getArtistById(id);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }
    await ArtistProfileRepositor.update(id, {
      verification_status: "REJECTED",
      rejection_reason: reason,
    });
    await NotificationRepositor.createNotification({
      user_id: artist.user_id,
      title: "Profile Rejected",
      message: `Your profile could not be approved. Reason: ${reason}. Please re-submit with corrected documents.`,
      type: "SYSTEM",
      is_read: false,
    });
    // Real-time socket push
    try {
      const io = getIO();
      io.to(artist.user_id.toString()).emit("new_notification", {
        title: "Profile Rejected",
        message: `Your profile could not be approved. Reason: ${reason}. Please re-submit with corrected documents.`,
        type: "SYSTEM"
      });
    } catch (e) {}
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

  async getAllWithdrawals() {
    return await db.WithdrawRequest.findAll({
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [{ model: db.User, as: "user", attributes: ["name", "profile_image", "email", "phone"] }]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async approveWithdrawal(requestId) {
    const request = await db.WithdrawRequest.findByPk(requestId);
    if (!request) {
      throw new AppError("Withdraw request not found", 404);
    }
    if (request.status !== "PENDING") {
      throw new AppError("Only PENDING withdraw requests can be approved", 400);
    }

    await request.update({ status: "APPROVED" });

    // Update WalletTransaction status to SUCCESS
    const artist = await db.ArtistProfile.findByPk(request.artist_id);
    if (artist) {
      const wallet = await db.Wallet.findOne({ where: { user_id: artist.user_id } });
      if (wallet) {
        const tx = await db.WalletTransaction.findOne({
          where: {
            wallet_id: wallet.id,
            description: `Withdraw request ID: WR-${requestId}`,
            status: "PENDING"
          }
        });
        if (tx) {
          await tx.update({ status: "SUCCESS" });
        }
      }

      // Notify artist
      try {
        await db.Notification.create({
          user_id: artist.user_id,
          title: "Withdrawal Approved! 💸",
          message: `Your withdrawal of ₹${request.amount} was approved and processed successfully.`,
          type: "SYSTEM"
        });
      } catch (err) {
        console.error("Error creating withdrawal notification:", err.message);
      }
    }

    return request;
  }

  async rejectWithdrawal(requestId, reason) {
    const request = await db.WithdrawRequest.findByPk(requestId);
    if (!request) {
      throw new AppError("Withdraw request not found", 404);
    }
    if (request.status !== "PENDING") {
      throw new AppError("Only PENDING withdraw requests can be rejected", 400);
    }

    await request.update({
      status: "REJECTED",
      rejection_reason: reason || "Rejected by administrator"
    });

    const artist = await db.ArtistProfile.findByPk(request.artist_id);
    if (artist) {
      const wallet = await db.Wallet.findOne({ where: { user_id: artist.user_id } });
      if (wallet) {
        // Refund the amount to the artist's wallet
        const newBalance = wallet.balance + request.amount;
        await wallet.update({ balance: newBalance });

        // Update the original pending transaction to FAILED
        const originalTx = await db.WalletTransaction.findOne({
          where: {
            wallet_id: wallet.id,
            description: `Withdraw request ID: WR-${requestId}`,
            status: "PENDING"
          }
        });
        if (originalTx) {
          await originalTx.update({ status: "FAILED" });
        }

        // Create a new REFUND transaction log to trace the restoration of funds
        await db.WalletTransaction.create({
          wallet_id: wallet.id,
          transaction_type: "RECHARGE",
          amount: request.amount,
          status: "SUCCESS",
          description: `Restored funds for rejected withdrawal request WR-${requestId}`
        });
      }

      // Notify artist
      try {
        await db.Notification.create({
          user_id: artist.user_id,
          title: "Withdrawal Rejected ❌",
          message: `Your withdrawal request of ₹${request.amount} was rejected. Reason: ${reason || "Check details."}. Funds have been restored.`,
          type: "SYSTEM"
        });
      } catch (err) {
        console.error("Error creating rejection notification:", err.message);
      }
    }

    return request;
  }
}

module.exports = new AdminService();
