const db = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/errors/app.error");
const razorpay = require("../utils/razorpay");
const crypto = require("crypto");

class BookingService {
  async calculatePriceDetails(serviceId, couponCode = null, userId = null, slotCount = 1) {
    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      throw new AppError("Service not found", 404);
    }

    const servicePrice = service.minimum_price || 1500;
    const travelCharges = 150 * slotCount; // 150 INR flat per slot trip
    const platformFee = 50; // platform fee per booking transaction

    const basePrice = servicePrice * slotCount;
    let couponDiscount = 0;

    if (couponCode) {
      const couponService = require("./coupon.services");
      try {
        const details = {
          categoryId: service.category_id || null,
          artistId: service.artist_id || null
        };
        const validation = await couponService.validateCoupon(
          couponCode,
          userId || 0,
          basePrice,
          details
        );
        couponDiscount = validation.discount;
      } catch (err) {
        throw err;
      }
    }

    const priceAfterDiscount = basePrice - couponDiscount;
    const taxableAmount = priceAfterDiscount + travelCharges + platformFee;
    const gst = Math.round(taxableAmount * 0.18); // 18% GST
    const finalAmount = taxableAmount + gst;

    return {
      servicePrice: basePrice,
      travelCharges,
      couponDiscount,
      platformFee,
      gst,
      finalAmount
    };
  }

  async createBooking(userId, data) {
    const hasRestricted = await this.hasRestrictedBooking(userId);
    if (hasRestricted) {
      throw new AppError("You have a previous booking with a pending payment or settlement. Please complete your current booking before creating a new booking.", 400);
    }

    const { serviceId, artistId, slotId, address, landmark, notes, couponCode, latitude, longitude, selectedDate, timeLabel } = data;

    const slotIds = Array.isArray(slotId) ? slotId : (slotId ? [slotId] : []);
    const slotCount = slotIds.length > 0 ? slotIds.length : 1;

    const bookingResult = await db.sequelize.transaction(async (t) => {
      let finalSlotId = slotIds[0] || null;

      // Handle placeholder/dummy slot creations
      if (slotIds.length === 0 && selectedDate && timeLabel) {
        const dates = String(selectedDate).split(",");
        const labels = String(timeLabel).split(",");
        
        for (let i = 0; i < dates.length; i++) {
          const d = dates[i].trim();
          const lbl = labels[i] ? labels[i].trim() : timeLabel;
          
          let startTime = new Date(`${d}T10:00:00.000Z`);
          let endTime = new Date(`${d}T13:00:00.000Z`);
          if (lbl.includes("02:00 PM") || lbl.includes("14:00")) {
            startTime = new Date(`${d}T14:00:00.000Z`);
            endTime = new Date(`${d}T17:00:00.000Z`);
          } else if (lbl.includes("06:00 PM") || lbl.includes("18:00")) {
            startTime = new Date(`${d}T18:00:00.000Z`);
            endTime = new Date(`${d}T21:00:00.000Z`);
          }

          const newSlot = await db.AvailabilitySlot.create({
            artist_id: artistId,
            start_time: startTime,
            end_time: endTime,
            is_booked: true
          }, { transaction: t });
          
          if (i === 0) {
            finalSlotId = newSlot.id;
          }
        }
      } else {
        // Mark all real slots as booked
        for (const id of slotIds) {
          const slot = await db.AvailabilitySlot.findByPk(id, {
            transaction: t,
            lock: t.LOCK.UPDATE
          });
          if (slot) {
            if (slot.is_booked) {
              throw new AppError("One or more selected slots are already booked", 400);
            }
            await slot.update({ is_booked: true }, { transaction: t });
          }
        }
      }

      const pricing = await this.calculatePriceDetails(serviceId, couponCode, userId, slotCount);
      const bookingCode = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

      const booking = await db.Booking.create({
        booking_code: bookingCode,
        user_id: userId,
        artist_id: artistId,
        service_id: serviceId,
        slot_id: finalSlotId || null,
        total_price: pricing.servicePrice,
        advance_paid: 0,
        remaining_amount: pricing.finalAmount,
        booking_status: "PENDING",
        payment_status: "PENDING",
        detailed_status: "PENDING",
        travel_charges: pricing.travelCharges,
        offer_price: pricing.servicePrice,
        coupon_discount: pricing.couponDiscount,
        platform_fee: pricing.platformFee,
        gst: pricing.gst,
        final_amount: pricing.finalAmount,
        coupon_code: couponCode || null,
        address,
        landmark: landmark || null,
        notes: notes || `Total Booked Slots: ${slotCount}`,
        latitude: latitude || 26.9124,
        longitude: longitude || 75.7873
      }, { transaction: t });

      // Log initial history
      await db.BookingStatusHistory.create({
        booking_id: booking.id,
        status: "PENDING",
        changed_by: userId,
        notes: `Booking requested by customer for ${slotCount} slots`
      }, { transaction: t });

      return booking;
    });

    // Notify artist and trigger real-time updates
    try {
      const artist = await db.ArtistProfile.findByPk(artistId);
      if (artist) {
        const slot = bookingResult.slot_id ? await db.AvailabilitySlot.findByPk(bookingResult.slot_id) : null;
        const dateStr = slot?.date ? new Date(slot.date).toLocaleDateString() : (bookingResult.reschedule_date || "TBD");
        
        const customer = await db.User.findByPk(userId);
        const customerName = customer?.name || "A customer";

        await db.Notification.create({
          user_id: artist.user_id,
          title: "New Booking Request",
          message: `You have received a new booking request from ${customerName}.`,
          type: "BOOKING",
          data: JSON.stringify({
            bookingId: bookingResult.id,
            booking_id: bookingResult.id,
            customerName: customerName,
            bookingDate: dateStr,
            bookingTime: bookingResult.slot_id ? "Scheduled slot" : (bookingResult.reschedule_time || "TBD")
          })
        });

        // Emit real-time booking event to the artist's socket room
        const { getIO } = require("../sockets/socket");
        const io = getIO();
        io.to(artist.user_id.toString()).emit("booking_created", {
          bookingId: bookingResult.id,
          bookingCode: bookingResult.booking_code
        });
      }
    } catch (err) {
      console.error("Error in createBooking real-time notification dispatch:", err.message);
    }

    return await this.getBookingDetails(bookingResult.id, userId, "CUSTOMER");
  }

  async getBookingDetails(bookingId, userId, role) {
    let where = { id: bookingId };
    if (role === "CUSTOMER") {
      where.user_id = userId;
    } else if (role === "ARTIST") {
      // Find artist profile id for user
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (artist) {
        where.artist_id = artist.id;
      } else {
        throw new AppError("Artist profile not found", 404);
      }
    }

    const booking = await db.Booking.findOne({
      where,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "profile_image"]
        },
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "phone", "profile_image"]
            }
          ]
        },
        {
          model: db.Service,
          as: "service",
          attributes: ["id", "specialization_name", "category", "duration_minutes"]
        },
        {
          model: db.AvailabilitySlot,
          as: "slot"
        },
        {
          model: db.BookingStatusHistory,
          as: "status_history",
          include: [
            {
              model: db.User,
              as: "changedByUser",
              attributes: ["id", "name", "role"]
            }
          ]
        },
        {
          model: db.Invoice,
          as: "invoice"
        }
      ],
      order: [[{ model: db.BookingStatusHistory, as: "status_history" }, "createdAt", "DESC"]]
    });

    return booking;
  }

  async getBookingHistory(userId, role) {
    let where = {};
    if (role === "CUSTOMER") {
      where.user_id = userId;
    } else if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (!artist) return [];
      where.artist_id = artist.id;
    }

    return await db.Booking.findAll({
      where,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "profile_image"]
        },
        {
          model: db.Service,
          as: "service",
          attributes: ["id", "specialization_name", "category"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async applyCoupon(userId, couponCode, serviceId) {
    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      throw new AppError("Service not found", 404);
    }

    const coupon = await db.Coupon.findOne({
      where: {
        code: couponCode,
        is_active: true,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!coupon) {
      throw new AppError("Invalid or expired coupon code", 400);
    }

    const price = service.minimum_price || 1500;
    if (price < coupon.min_booking_value) {
      throw new AppError(`Minimum booking value of ₹${coupon.min_booking_value} required for this coupon`, 400);
    }

    const discount = Math.round((price * coupon.discount_percentage) / 100);
    const finalDiscount = Math.min(discount, coupon.max_discount);

    return {
      couponCode: coupon.code,
      discount: finalDiscount,
      discountPercentage: coupon.discount_percentage
    };
  }

  async createRazorpayOrder(bookingId, userId) {
    const booking = await db.Booking.findOne({
      where: { id: bookingId, user_id: userId }
    });
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const options = {
      amount: booking.final_amount * 100, // amount in paisa
      currency: "INR",
      receipt: `receipt_booking_${booking.id}`
    };

    let order;
    try {
      order = await razorpay.orders.create(options);
    } catch (err) {
      console.log("Razorpay SDK error, creating mock order fallback:", err.message);
      order = {
        id: `order_mock_${Math.floor(100000 + Math.random() * 900000)}`,
        amount: options.amount,
        currency: "INR",
        receipt: options.receipt
      };
    }

    await db.Transaction.create({
      user_id: userId,
      booking_id: bookingId,
      razorpay_order_id: order.id,
      amount: booking.final_amount,
      status: "PENDING"
    });

    return order;
  }

  async verifyPayment(userId, data) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    const tx = await db.Transaction.findOne({
      where: { razorpay_order_id }
    });
    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }

    let isValid = true;
    if (razorpay_signature && !razorpay_order_id.startsWith("order_mock") && process.env.NODE_ENV !== "development") {
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "key_secret")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      isValid = generated_signature === razorpay_signature;
    }

    if (!isValid) {
      await tx.update({ status: "FAILED" });
      await db.Booking.update(
        { payment_status: "FAILED" },
        { where: { id: tx.booking_id } }
      );
      throw new AppError("Payment verification signature failed", 400);
    }

    // Success transaction
    await tx.update({
      razorpay_payment_id,
      razorpay_signature: razorpay_signature || null,
      status: "SUCCESS"
    });

    const bookingBefore = await db.Booking.findByPk(tx.booking_id);
    const isCompletedBooking = bookingBefore && (bookingBefore.booking_status === "COMPLETED" || ["CASH_DISPUTED", "AWAITING_CASH_CONFIRMATION"].includes(bookingBefore.detailed_status));

    await db.Booking.update(
      {
        payment_status: "PAID",
        booking_status: isCompletedBooking ? "COMPLETED" : "CONFIRMED",
        detailed_status: isCompletedBooking ? "COMPLETED" : "CONFIRMED"
      },
      { where: { id: tx.booking_id } }
    );

    await db.BookingStatusHistory.create({
      booking_id: tx.booking_id,
      status: isCompletedBooking ? "COMPLETED" : "CONFIRMED",
      changed_by: userId,
      notes: "Payment verified successfully. Booking updated."
    });

    // Create Invoice record
    const invoiceNum = `INV-${Date.now()}`;
    await db.Invoice.create({
      booking_id: tx.booking_id,
      invoice_number: invoiceNum,
      invoice_url: `/payment/receipt/${tx.booking_id}`
    });

    const booking = await db.Booking.findByPk(tx.booking_id);
    if (booking) {
      // 1. Notify artist
      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        await db.Notification.create({
          user_id: artistProfile.user_id,
          title: "Payment Received Successfully",
          message: `The customer has completed the online payment for Booking #${booking.booking_code}.`,
          type: "PAYMENT",
          data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
        });
      }

      // 2. Notify customer
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Payment Verified",
        message: `Your payment of ₹${booking.final_amount} for Booking #${booking.booking_code} has been verified successfully.`,
        type: "PAYMENT",
        data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
      });

      const PaymentService = require("./payment.services");
      try {
        await PaymentService.processPaymentDistribution(booking);
      } catch (distErr) {
        console.error("Error distributing payments in booking.services.js:", distErr.message);
      }
    }

    return await this.getBookingDetails(tx.booking_id, userId, "CUSTOMER");
  }

  async updateBookingStatus(bookingId, userId, role, newStatus, extraData = {}) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const prevStatus = booking.detailed_status;
    const updates = {
      detailed_status: newStatus
    };

    if (newStatus === "CANCELLED") {
      updates.booking_status = "CANCELLED";
      updates.cancel_reason = extraData.cancelReason || "Cancelled by user";
      
      // Free slot again
      if (booking.slot_id) {
        await db.AvailabilitySlot.update(
          { is_booked: false },
          { where: { id: booking.slot_id } }
        );
      }
    } else if (newStatus === "COMPLETED") {
      const paymentRecord = await db.Payment.findOne({ where: { booking_id: bookingId } });
      const isCashBooking = paymentRecord && paymentRecord.payment_method === "CASH";

      if (isCashBooking) {
        updates.booking_status = "COMPLETED";
        updates.detailed_status = "AWAITING_CASH_CONFIRMATION";

        await db.Notification.create({
          user_id: booking.user_id,
          title: "Service Completed 🌸",
          message: `The service is completed. Please pay the artist ₹${booking.final_amount} in cash.`,
          type: "SYSTEM"
        });

        const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
        if (artistProfile) {
          await db.Notification.create({
            user_id: artistProfile.user_id,
            title: "Cash Payment Pending Confirmation 💵",
            message: `Please confirm if you have received the cash payment of ₹${booking.final_amount} for booking #${booking.booking_code}.`,
            type: "SYSTEM"
          });
        }
      } else {
        updates.booking_status = "COMPLETED";
        updates.detailed_status = "COMPLETED";

        const PaymentService = require("./payment.services");
        await PaymentService.completeBookingSettlement(booking.id);

        const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
        if (artistProfile) {
          try {
            const referralService = require("./referral.services");
            await referralService.verifyAndRewardReferral(booking.user_id, booking.id);
          } catch (refErr) {
            console.error("Error verifying referral on completion:", refErr.message);
          }

          try {
            const xpService = require("./xp.services");
            await xpService.awardXp(booking.user_id, 100, "Booking Service Completed", booking.id);
            await xpService.awardXp(artistProfile.user_id, 100, "Booking Work Completed", booking.id);
            await xpService.evaluateArtistMilestone(artistProfile.user_id);
          } catch (xpErr) {
            console.error("Error awarding XP on completion:", xpErr.message);
          }
        }
      }
    } else if (newStatus === "ARTIST_ACCEPTED" || newStatus === "CONFIRMED") {
      updates.booking_status = "CONFIRMED";
    }

    if (newStatus === "RESCHEDULED") {
      updates.reschedule_date = extraData.date;
      updates.reschedule_time = extraData.time;
    }

    await booking.update(updates);

    await db.BookingStatusHistory.create({
      booking_id: bookingId,
      status: newStatus,
      changed_by: userId,
      notes: extraData.cancelReason || extraData.notes || `Booking status updated from ${prevStatus} to ${newStatus}`
    });

    // Seed test notifications log
    const userToNotify = role === "CUSTOMER" 
      ? (await db.ArtistProfile.findByPk(booking.artist_id))?.user_id 
      : booking.user_id;

    if (userToNotify) {
      let notificationTitle = `Booking Update: ${newStatus}`;
      let notificationMessage = `Booking #${booking.booking_code} status has been updated to ${newStatus}`;
      let notificationType = "SYSTEM";
      let notificationData = { bookingId: booking.id, booking_id: booking.id };

      if (newStatus === "CANCELLED" && role !== "CUSTOMER") {
        const artist = await db.ArtistProfile.findOne({
          where: { id: booking.artist_id },
          include: [{ model: db.User, as: "user", attributes: ["name"] }]
        });
        const artistName = artist?.user?.name || "The artist";
        
        notificationTitle = "Booking Update";
        notificationMessage = "Your booking/payment request has been rejected by the artist. Please review the booking and complete the payment again if required.";
        notificationType = "BOOKING";
        
        notificationData = {
          bookingId: booking.id,
          booking_id: booking.id,
          artistId: booking.artist_id,
          artistName: artistName,
          bookingDate: booking.slot_id ? (await db.AvailabilitySlot.findByPk(booking.slot_id))?.start_time : null,
          paymentStatus: booking.payment_status,
          rejectionReason: extraData.cancelReason || "Rejected by artist"
        };
      }

      await db.Notification.create({
        user_id: userToNotify,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        data: JSON.stringify(notificationData)
      });
    }

    return await this.getBookingDetails(bookingId, userId, role);
  }

  async getInvoice(bookingId) {
    let invoice = await db.Invoice.findOne({
      where: { booking_id: bookingId }
    });
    if (!invoice) {
      const booking = await db.Booking.findByPk(bookingId);
      if (booking && (booking.payment_status === "PAID" || booking.payment_status === "SUCCESS")) {
        const invoiceNum = `INV-${Date.now()}`;
        invoice = await db.Invoice.create({
          booking_id: bookingId,
          invoice_number: invoiceNum,
          invoice_url: `/payment/receipt/${bookingId}`
        });
      }
    }
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }
    return invoice;
  }
  async selectCashPayment(bookingId, userId) {
    const booking = await db.Booking.findOne({ where: { id: bookingId, user_id: userId } });
    if (!booking) throw new AppError("Booking not found", 404);

    const [payment] = await db.Payment.findOrCreate({
      where: { booking_id: bookingId },
      defaults: {
        payment_method: "CASH",
        amount: booking.final_amount,
        status: "PENDING"
      }
    });

    if (payment.payment_method !== "CASH") {
      await payment.update({ payment_method: "CASH" });
    }

    await booking.update({
      booking_status: "COMPLETED",
      detailed_status: "AWAITING_CASH_CONFIRMATION"
    });

    await db.BookingStatusHistory.create({
      booking_id: bookingId,
      status: "AWAITING_CASH_CONFIRMATION",
      changed_by: userId,
      notes: "Customer selected Cash Payment method."
    });

    const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
    if (artistProfile) {
      await db.Notification.create({
        user_id: artistProfile.user_id,
        title: "Cash Payment Approval Required",
        message: "Customer has marked this booking as Cash Payment. Please approve or reject the payment.",
        type: "PAYMENT",
        data: JSON.stringify({ bookingId: bookingId, booking_id: bookingId })
      });
    }

    return booking;
  }

  async confirmCashPayment(bookingId, artistUserId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) throw new AppError("Booking not found", 404);

    const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: artistUserId } });
    if (!artistProfile || booking.artist_id !== artistProfile.id) {
      throw new AppError("Unauthorized access to confirm cash payment", 403);
    }

    const totalAmount = Number(booking.final_amount);
    const commissionSetting = await db.SystemSetting.findOne({ where: { key: "COMMISSION_PERCENTAGE" } });
    const commissionPercentage = commissionSetting ? parseInt(commissionSetting.value) : 10;
    const commissionAmount = Math.round(totalAmount * (commissionPercentage / 100));
    const artistAmount = totalAmount - commissionAmount;

    // 1. Process Admin Wallet Commission
    let adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
    if (!adminUser) {
      adminUser = await db.User.create({
        name: "System Admin",
        phone: "9999900000",
        email: "admin@mehndigo.com",
        role: "ADMIN",
        password: "system_generated_hash"
      });
    }

    const [adminWallet] = await db.Wallet.findOrCreate({
      where: { user_id: adminUser.id },
      defaults: { balance: 0, pending_balance: 0, lifetime_earnings: 0, total_commission_earned: 0, total_withdrawals: 0 }
    });
    await adminWallet.increment({
      balance: commissionAmount,
      total_commission_earned: commissionAmount,
      lifetime_earnings: commissionAmount
    });

    await db.WalletTransaction.create({
      wallet_id: adminWallet.id,
      booking_id: booking.id,
      transaction_type: "COMMISSION",
      amount: commissionAmount,
      status: "SUCCESS",
      description: `Commission from cash booking #${booking.booking_code}`
    });

    // 2. Process Artist Wallet: Debit commission since artist received full cash
    const [artistWallet] = await db.Wallet.findOrCreate({
      where: { user_id: artistUserId },
      defaults: { balance: 0, pending_balance: 0, lifetime_earnings: 0, total_commission_earned: 0, total_withdrawals: 0 }
    });
    await artistWallet.decrement("balance", { by: commissionAmount });
    await artistWallet.increment("lifetime_earnings", { by: artistAmount });

    await db.WalletTransaction.create({
      wallet_id: artistWallet.id,
      booking_id: booking.id,
      transaction_type: "COMMISSION",
      amount: commissionAmount,
      status: "SUCCESS",
      description: `Platform commission debited for cash booking #${booking.booking_code}`
    });

    // 3. Update payment and booking statuses
    const payment = await db.Payment.findOne({ where: { booking_id: bookingId } });
    if (payment) {
      await payment.update({ status: "SUCCESS", paid_at: new Date() });
    }

    await booking.update({
      payment_status: "PAID",
      booking_status: "COMPLETED",
      detailed_status: "COMPLETED"
    });

    await db.BookingStatusHistory.create({
      booking_id: bookingId,
      status: "COMPLETED",
      changed_by: artistUserId,
      notes: "Artist confirmed cash payment received. Booking settled."
    });

    // 4. Create SettlementHistory
    await db.SettlementHistory.create({
      booking_id: booking.id,
      artist_id: booking.artist_id,
      total_amount: totalAmount,
      commission_amount: commissionAmount,
      artist_amount: artistAmount,
      status: "COMPLETED"
    });

    // 5. Award Milestone Rewards & XP
    try {
      const referralService = require("./referral.services");
      await referralService.verifyAndRewardReferral(booking.user_id, booking.id);
    } catch (refErr) {
      console.error("Error verifying referral on cash completion:", refErr.message);
    }

    try {
      const xpService = require("./xp.services");
      await xpService.awardXp(booking.user_id, 100, "Booking Service Completed", booking.id);
      await xpService.awardXp(artistUserId, 100, "Booking Work Completed", booking.id);
      await xpService.evaluateArtistMilestone(artistUserId);
    } catch (xpErr) {
      console.error("Error awarding XP on cash completion:", xpErr.message);
    }

    // 6. Send Notifications
    await db.Notification.create({
      user_id: booking.user_id,
      title: "Cash Payment Confirmed! 💵",
      message: `Your artist has confirmed cash payment of ₹${totalAmount} for booking #${booking.booking_code}.`,
      type: "SYSTEM"
    });

    await db.Notification.create({
      user_id: adminUser.id,
      title: "Cash Settlement Settled",
      message: `Booking #${booking.booking_code} has been settled via cash payment. Commission collected.`,
      type: "SYSTEM"
    });

    return booking;
  }

  async rejectCashPayment(bookingId, artistUserId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) throw new AppError("Booking not found", 404);

    const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: artistUserId } });
    if (!artistProfile || booking.artist_id !== artistProfile.id) {
      throw new AppError("Unauthorized access to reject cash payment", 403);
    }

    await booking.update({
      payment_status: "PENDING",
      detailed_status: "CASH_DISPUTED"
    });

    await db.BookingStatusHistory.create({
      booking_id: bookingId,
      status: "COMPLETED",
      changed_by: artistUserId,
      notes: "Artist flagged cash payment as NOT received. Dispute pending."
    });

    // Notify customer
    await db.Notification.create({
      user_id: booking.user_id,
      title: "Payment Rejected ❌",
      message: "The artist reported that cash payment was not received. Please complete your payment again using Cash or Online payment method.",
      type: "BOOKING",
      data: JSON.stringify({ bookingId: bookingId, booking_id: bookingId })
    });

    // Notify admin
    const adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
    if (adminUser) {
      await db.Notification.create({
        user_id: adminUser.id,
        title: "Cash Payment Dispute",
        message: `Artist reported no payment for booking #${booking.booking_code}. Admin resolution required.`,
        type: "SYSTEM"
      });
    }

    return booking;
  }

  async hasRestrictedBooking(userId) {
    const activeBooking = await db.Booking.findOne({
      where: {
        user_id: userId,
        booking_status: { [db.Sequelize.Op.ne]: "CANCELLED" },
        detailed_status: { [db.Sequelize.Op.notIn]: ["COMPLETED_CLOSED", "CASH_DISPUTED"] },
        [db.Sequelize.Op.or]: [
          {
            booking_status: "COMPLETED",
            payment_status: "PENDING"
          },
          {
            detailed_status: "AWAITING_CASH_CONFIRMATION"
          }
        ]
      }
    });
    return !!activeBooking;
  }
}

module.exports = new BookingService();

