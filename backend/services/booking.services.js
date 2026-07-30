const db = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/errors/app.error");
const crypto = require("crypto");

const checkInFailedAttempts = new Map();
const checkOutFailedAttempts = new Map();

class BookingService {
  constructor() {
    this.createBooking = this.createBooking.bind(this);
    this.hasRestrictedBooking = this.hasRestrictedBooking.bind(this);
  }

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
    const finalAmount = Math.max(0, priceAfterDiscount + travelCharges);

    return {
      servicePrice: basePrice,
      travelCharges,
      couponDiscount,
      platformFee: 0,
      gst: 0,
      advanceAmount: Math.min(500, finalAmount),
      remainingCash: Math.max(0, finalAmount - Math.min(500, finalAmount)),
      finalAmount
    };
  }


  async createBooking(userId, data) {
    const hasRestricted = await this.hasRestrictedBooking(userId);
    if (hasRestricted) {
      throw new AppError("You have a previous booking with a pending payment or settlement. Please complete your current booking before creating a new booking.", 400);
    }

    const { serviceId, artistId, slotId, address, landmark, notes, couponCode, latitude, longitude, selectedDate, timeLabel } = data;

    // 1. Strict Validation: Reject multi-date or multi-slot arrays (1 Booking = 1 Service + 1 Date + 1 Time Slot)
    if (Array.isArray(slotId) && slotId.length > 1) {
      throw new AppError("Only 1 Date and 1 Time Slot can be selected per booking. Multi-slot booking is not allowed.", 400);
    }
    if (typeof selectedDate === "string" && selectedDate.includes(",")) {
      throw new AppError("Only 1 Date and 1 Time Slot can be selected per booking. Multi-date booking is not allowed.", 400);
    }
    if (typeof timeLabel === "string" && timeLabel.includes(",")) {
      throw new AppError("Only 1 Date and 1 Time Slot can be selected per booking. Multi-slot booking is not allowed.", 400);
    }

    const singleSlotId = Array.isArray(slotId) ? slotId[0] : slotId;

    // 2. Validate Customer Exists
    const customer = await db.User.findByPk(userId);
    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    // 3. Validate Artist Exists
    const artist = await db.ArtistProfile.findByPk(artistId);
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    // 4. Validate Service Exists
    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      throw new AppError("Service not found", 404);
    }
    if (service.artist_id !== artistId) {
      throw new AppError("Service does not belong to the selected artist", 400);
    }

    // 5. Check Restricted Booking Rules
    let isRestricted = false;
    try {
      if (typeof this.hasRestrictedBooking === 'function') {
        isRestricted = await this.hasRestrictedBooking(userId, artistId);
      } else if (typeof BookingService !== 'undefined' && BookingService.prototype && typeof BookingService.prototype.hasRestrictedBooking === 'function') {
        isRestricted = await BookingService.prototype.hasRestrictedBooking.call(this, userId, artistId);
      }
    } catch (err) {
      console.error("Warning: hasRestrictedBooking check failed:", err.message);
    }
    if (isRestricted) {
      throw new AppError("Booking restricted. You have too many active bookings or pending disputes.", 400);
    }

    // 6. Execute Transaction with Double Booking Protection & Row Lock
    const bookingResult = await db.sequelize.transaction(async (t) => {
      let finalSlotId = singleSlotId || null;

      if (singleSlotId) {
        // Lock row to prevent race conditions during simultaneous booking attempts
        const slot = await db.AvailabilitySlot.findByPk(singleSlotId, {
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (!slot) {
          throw new AppError("Selected availability slot not found", 404);
        }
        if (slot.artist_id !== artistId) {
          throw new AppError("Availability slot does not belong to the selected artist", 400);
        }

        // Check if an active confirmed/accepted booking already exists for this slot
        const existingConfirmedBooking = await db.Booking.findOne({
          where: {
            artist_id: artistId,
            slot_id: singleSlotId,
            [Op.or]: [
              { booking_status: { [Op.in]: ["CONFIRMED", "COMPLETED"] } },
              { detailed_status: { [Op.in]: ["ACCEPTED", "ARTIST_ACCEPTED", "CONFIRMED", "COMPLETED"] } }
            ]
          },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (existingConfirmedBooking) {
          throw new AppError("This time slot is no longer available. Please select another time.", 400);
        }

        // If current customer has an existing PENDING booking for this exact slot, reuse it
        const userPendingBooking = await db.Booking.findOne({
          where: {
            user_id: userId,
            artist_id: artistId,
            slot_id: singleSlotId,
            booking_status: "PENDING"
          },
          transaction: t
        });

        if (userPendingBooking) {
          return userPendingBooking;
        }

        // Mark slot as booked atomically
        await slot.update({ is_booked: true }, { transaction: t });
      } else if (selectedDate && timeLabel) {
        const d = String(selectedDate).trim();
        const lbl = String(timeLabel).trim();

        let startTime = new Date(`${d}T10:00:00.000Z`);
        let endTime = new Date(`${d}T13:00:00.000Z`);
        if (lbl.includes("02:00 PM") || lbl.includes("14:00")) {
          startTime = new Date(`${d}T14:00:00.000Z`);
          endTime = new Date(`${d}T17:00:00.000Z`);
        } else if (lbl.includes("06:00 PM") || lbl.includes("18:00")) {
          startTime = new Date(`${d}T18:00:00.000Z`);
          endTime = new Date(`${d}T21:00:00.000Z`);
        }

        // Double booking check for custom date & time window
        const existingConfirmedSlot = await db.Booking.findOne({
          where: {
            artist_id: artistId,
            [Op.or]: [
              { booking_status: { [Op.in]: ["CONFIRMED", "COMPLETED"] } },
              { detailed_status: { [Op.in]: ["ACCEPTED", "ARTIST_ACCEPTED", "CONFIRMED", "COMPLETED"] } }
            ]
          },
          include: [
            {
              model: db.AvailabilitySlot,
              as: "slot",
              where: { start_time: startTime }
            }
          ],
          transaction: t
        });


        if (existingConfirmedSlot) {
          throw new AppError("This time slot is no longer available. Please select another time.", 400);
        }

        const newSlot = await db.AvailabilitySlot.create({
          artist_id: artistId,
          start_time: startTime,
          end_time: endTime,
          is_booked: true
        }, { transaction: t });

        finalSlotId = newSlot.id;
      }


      // Calculate price for 1 slot always
      const pricing = await this.calculatePriceDetails(serviceId, couponCode, userId, 1);
      const bookingCode = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

      const booking = await db.Booking.create({
        booking_code: bookingCode,
        user_id: userId,
        artist_id: artistId,
        service_id: serviceId,
        slot_id: finalSlotId || null,
        total_price: pricing.servicePrice,
        advance_paid: 0,
        remaining_amount: pricing.remainingCash,
        booking_status: "PENDING",
        payment_status: "PENDING",
        detailed_status: "PENDING",
        travel_charges: pricing.travelCharges,
        offer_price: pricing.servicePrice,
        coupon_discount: pricing.couponDiscount,
        platform_fee: 0,
        gst: 0,
        final_amount: pricing.finalAmount,

        coupon_code: couponCode || null,
        address,
        landmark: landmark || null,
        notes: notes || `Single Slot Booking (${selectedDate || ''} ${timeLabel || ''})`.trim(),
        latitude: latitude || 26.9124,
        longitude: longitude || 75.7873
      }, { transaction: t });

      // Log initial history
      await db.BookingStatusHistory.create({
        booking_id: booking.id,
        status: "PENDING",
        changed_by: userId,
        notes: `Single slot booking created for date: ${selectedDate || 'N/A'}`
      }, { transaction: t });

      return booking;
    });

    // Notify artist and trigger real-time updates
    try {
      const artist = await db.ArtistProfile.findByPk(artistId);
      if (artist) {
        const slot = bookingResult.slot_id ? await db.AvailabilitySlot.findByPk(bookingResult.slot_id) : null;
        const dateStr = slot?.start_time ? new Date(slot.start_time).toLocaleDateString() : (bookingResult.reschedule_date || "TBD");
        
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
    let where = {};
    if (isNaN(Number(bookingId)) || String(bookingId).toUpperCase().startsWith("BK-")) {
      where.booking_code = bookingId;
    } else {
      where.id = bookingId;
    }

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
        },
        {
          model: db.Review,
          as: "review",
          required: false
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
          model: db.AvailabilitySlot,
          as: "slot",
          required: false
        },
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "profile_image"]
        },
        {
          model: db.Service,
          as: "service",
          attributes: ["id", "specialization_name", "category"]
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

  async createPaymentSession(bookingId, userId) {
    const paymentService = require("./payment.services");
    return await paymentService.createSession(bookingId, userId);
  }

  async verifyPayment(userId, data) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    if (!razorpay_order_id) {
      const paymentService = require("./payment.services");
      const verifyData = {
        cashfree_order_id: data.cashfree_order_id || data.order_id || data.orderId,
        payment_session_id: data.payment_session_id
      };
      await paymentService.verifyPayment(userId, verifyData);
      return await this.getBookingDetails(data.bookingId || verifyData.cashfree_order_id.split('_')[1], userId, "CUSTOMER");
    }

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

    const invoiceNum = `INV-${Date.now()}`;
    await db.Invoice.create({
      booking_id: tx.booking_id,
      invoice_number: invoiceNum,
      invoice_url: `/payment/receipt/${tx.booking_id}`
    });

    const booking = await db.Booking.findByPk(tx.booking_id);
    if (booking) {
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
      try {
        const escrow = await db.EscrowRecord.findOne({ where: { booking_id: bookingId, status: "HELD" } });
        if (escrow) {
          const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
          if (artistProfile) {
            const [artistWallet] = await db.Wallet.findOrCreate({
              where: { user_id: artistProfile.user_id },
              defaults: { balance: 0, pending_balance: 0, lifetime_earnings: 0, total_commission_earned: 0, total_withdrawals: 0 }
            });
            await artistWallet.decrement("pending_balance", { by: escrow.amount });
            await escrow.update({ status: "CANCELLED", updated_at: new Date() });
            const tx = await db.WalletTransaction.findOne({
              where: { wallet_id: artistWallet.id, booking_id: booking.id, transaction_type: "PAYMENT", status: "PENDING" }
            });
            if (tx) {
              await tx.update({ status: "CANCELLED", description: `Transaction cancelled due to booking cancellation` });
            }
          }
        }
      } catch (escrowErr) {
        console.error("Failed to rollback escrow on booking cancellation:", escrowErr.message);
      }
    } else if (newStatus === "COMPLETED") {
      updates.booking_status = "COMPLETED";
      updates.detailed_status = "COMPLETED";
      updates.payment_status = "PAID";
      updates.artist_completion_status = "COMPLETED";
      updates.artist_completed_at = new Date();
      updates.remaining_paid_at = new Date();

      const PaymentService = require("./payment.services");
      try {
        await PaymentService.completeBookingSettlement(booking.id);
      } catch (settleErr) {
        console.error("Error in completeBookingSettlement:", settleErr.message);
      }

      // Create success transaction record
      try {
        const cfPaymentId = `pay_cash_${Math.random().toString(36).substring(2, 10)}`;
        await db.Transaction.create({
          user_id: booking.user_id,
          booking_id: booking.id,
          cashfree_order_id: `order_${booking.id}_completion`,
          cashfree_payment_id: cfPaymentId,
          amount: booking.remaining_amount || 0,
          status: "SUCCESS",
          gateway: "CASH"
        });
      } catch (txErr) {
        console.error("Error creating Transaction upon completion:", txErr.message);
      }

      try {
        await db.Notification.create({
          user_id: booking.user_id,
          title: "Booking Completed 🎉",
          message: `Your Mehndi service booking #${booking.booking_code} has been completed and fully paid.`,
          type: "BOOKING",
          data: {
            type: "booking",
            event: "booking_completed",
            bookingId: booking.id
          }
        });
      } catch (notifErr) {
        console.error("Error sending booking complete notification:", notifErr.message);
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
      type: "SYSTEM",
      data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
    });

    await db.Notification.create({
      user_id: adminUser.id,
      title: "Cash Settlement Settled",
      message: `Booking #${booking.booking_code} has been settled via cash payment. Commission collected.`,
      type: "SYSTEM",
      data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
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

  async getPendingPayment(userId) {
    const booking = await db.Booking.findOne({
      where: {
        user_id: userId,
        detailed_status: "WAITING_FOR_USER_PAYMENT",
        payment_status: "PARTIAL"
      },
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          attributes: ["id", "bio", "experience_years", "avg_rating", "total_reviews", "city", "state"],
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "profile_image"]
            }
          ]
        },
        {
          model: db.Service,
          as: "service",
          attributes: ["id", "specialization_name", "category"]
        }
      ],
      order: [["updatedAt", "DESC"]]
    });
    return booking;
  }

  async skipReview(bookingId, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }
    if (Number(booking.user_id) !== Number(userId)) {
      throw new AppError("Unauthorized access to booking", 403);
    }
    await booking.update({ review_skipped: true });
    return booking;
  }

  async hasRestrictedBooking(userId, artistId) {
    return false;
  }

  async sendCheckInOtp(bookingId, userId) {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [{ model: db.User, as: "user", attributes: ["id", "phone", "name", "email"] }]
    });
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // 60-second resend cooldown
    if (booking.check_in_otp_expires_at) {
      const sentAt = new Date(new Date(booking.check_in_otp_expires_at).getTime() - 5 * 60 * 1000);
      const secondsElapsed = Math.floor((Date.now() - sentAt.getTime()) / 1000);
      if (secondsElapsed < 60) {
        throw new AppError(`Please wait ${60 - secondsElapsed} seconds before requesting a new OTP.`, 429);
      }
    }

    // Reset failed verification attempts
    checkInFailedAttempts.delete(booking.id);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    const updates = {
      check_in_otp: otp,
      check_in_otp_expires_at: expiresAt,
      check_in_otp_verified: false
    };

    if (booking.detailed_status === "ARTIST_ON_THE_WAY") {
      updates.detailed_status = "ARTIST_ARRIVED";
      try {
        await db.BookingStatusHistory.create({
          booking_id: booking.id,
          status: "ARTIST_ARRIVED",
          changed_by: userId,
          notes: "Arrival confirmed automatically via Check-In OTP request"
        });
      } catch (historyErr) {
        console.error("Error creating status history for automatic arrival:", historyErr.message);
      }
    }

    await booking.update(updates);

    console.log(`[CHECK_IN_OTP] OTP Generated successfully. Booking ID: ${booking.id}, Customer Email: ${booking.user?.email || "N/A"}`);
    console.log(`[TESTING_OTP_LOG] Generated Check-In OTP: ${otp} for Booking ID: ${booking.id} (Email: ${booking.user?.email || "N/A"})`);

    // Send via Email SMTP
    let emailResult = null;
    if (booking.user && booking.user.email) {
      console.log(`[CHECK_IN_OTP] Sending Email request to: ${booking.user.email} for Booking ID: ${booking.id}`);
      const { sendEmail } = require("../utils/mail.service");
      emailResult = await sendEmail(
        booking.user.email,
        "MehandiGo - Check-In Verification Code",
        `Hello ${booking.user.name},\n\nYour check-in OTP for booking #${booking.booking_code} is: ${otp}.\n\nShare this code with your artist to verify their arrival.\n\nBest regards,\nMehandiGo Team`
      );
      console.log(`[CHECK_IN_OTP] Email Provider Response: ${JSON.stringify(emailResult)}`);
    } else {
      console.log(`[CHECK_IN_OTP] Email Request Skipped. No email address found for Booking ID: ${booking.id}`);
    }

    // Create system notification for client (do NOT include raw OTP code in notification message)
    try {
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Artist Has Arrived! 🗓️",
        message: "Artist has arrived. Please share the OTP sent to your registered email address with your Artist to verify Check-In.",
        type: "BOOKING",
        data: {
          type: "booking",
          event: "checkin_otp_received",
          bookingId: booking.id
        }
      });

      // Emit realtime socket event to customer (do NOT include raw OTP code in socket payload)
      const { getIO } = require("../sockets/socket");
      const io = getIO();
      io.to(booking.user_id.toString()).emit("checkin_otp_received", {
        bookingId: booking.id,
        message: "Artist has arrived. A Check-In OTP has been sent to your registered mobile number."
      });
    } catch (err) {
      console.error("Error dispatching Check-In OTP notifications:", err.message);
    }

    return {
      success: true,
      maskedPhone: booking.user?.phone ? booking.user.phone.replace(/.(?=.{4})/g, "*") : "Customer"
    };
  }

  async verifyCheckInOtp(bookingId, otp, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const attempts = (checkInFailedAttempts.get(booking.id) || 0) + 1;
    checkInFailedAttempts.set(booking.id, attempts);

    if (!booking.check_in_otp || booking.check_in_otp !== otp || new Date() > new Date(booking.check_in_otp_expires_at)) {
      console.log(`[CHECK_IN_OTP_VERIFY] Verification Status: FAILED. Booking ID: ${booking.id}, Attempt: ${attempts}/3, Reason: Invalid or expired OTP`);
      if (attempts >= 3) {
        await booking.update({
          check_in_otp: null,
          check_in_otp_expires_at: null
        });
        checkInFailedAttempts.delete(booking.id);
        throw new AppError("Too many incorrect attempts. Please request a new OTP.", 400);
      }
      throw new AppError("Invalid or expired Check-In OTP", 400);
    }

    console.log(`[CHECK_IN_OTP_VERIFY] Verification Status: SUCCESS. Booking ID: ${booking.id}`);
    checkInFailedAttempts.delete(booking.id);

    await booking.update({
      booking_status: "CONFIRMED",
      detailed_status: "SERVICE_STARTED",
      check_in_otp_verified: true,
      check_in_time: new Date()
    });

    await db.BookingStatusHistory.create({
      booking_id: booking.id,
      status: "SERVICE_STARTED",
      changed_by: userId,
      notes: "Check-In OTP verified successfully. Service started."
    });

    // Notify customer and artist
    try {
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Service Started! 💅",
        message: `Your Mehndi service has officially started.`,
        type: "BOOKING",
        data: { type: "booking", event: "service_started", bookingId: booking.id }
      });

      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        await db.Notification.create({
          user_id: artistProfile.user_id,
          title: "Check-In Confirmed! ✅",
          message: `Check-In verified. Service started for Booking #${booking.booking_code}.`,
          type: "BOOKING",
          data: { type: "booking", event: "service_started", bookingId: booking.id }
        });
      }

      // Emit realtime socket event to customer
      const { getIO } = require("../sockets/socket");
      const io = getIO();
      io.to(booking.user_id.toString()).emit("service_started", { bookingId: booking.id });
    } catch (err) {
      console.error("Error dispatching Check-In confirmations:", err.message);
    }

    return { success: true, booking };
  }

  async sendCheckOutOtp(bookingId, userId) {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [{ model: db.User, as: "user", attributes: ["id", "phone", "name", "email"] }]
    });
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // 60-second resend cooldown
    if (booking.check_out_otp_expires_at) {
      const sentAt = new Date(new Date(booking.check_out_otp_expires_at).getTime() - 5 * 60 * 1000);
      const secondsElapsed = Math.floor((Date.now() - sentAt.getTime()) / 1000);
      if (secondsElapsed < 60) {
        throw new AppError(`Please wait ${60 - secondsElapsed} seconds before requesting a new OTP.`, 429);
      }
    }

    // Reset failed verification attempts
    checkOutFailedAttempts.delete(booking.id);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await booking.update({
      check_out_otp: otp,
      check_out_otp_expires_at: expiresAt,
      check_out_otp_verified: false
    });

    console.log(`[CHECK_OUT_OTP] OTP Generated successfully. Booking ID: ${booking.id}, Customer Email: ${booking.user?.email || "N/A"}`);
    console.log(`[TESTING_OTP_LOG] Generated Check-Out OTP: ${otp} for Booking ID: ${booking.id} (Email: ${booking.user?.email || "N/A"})`);

    // Send via Email SMTP
    let emailResult = null;
    if (booking.user && booking.user.email) {
      console.log(`[CHECK_OUT_OTP] Sending Email request to: ${booking.user.email} for Booking ID: ${booking.id}`);
      const { sendEmail } = require("../utils/mail.service");
      emailResult = await sendEmail(
        booking.user.email,
        "MehandiGo - Check-Out Verification Code",
        `Hello ${booking.user.name},\n\nYour check-out OTP for booking #${booking.booking_code} is: ${otp}.\n\nShare this code with your artist to verify service completion.\n\nBest regards,\nMehandiGo Team`
      );
      console.log(`[CHECK_OUT_OTP] Email Provider Response: ${JSON.stringify(emailResult)}`);
    } else {
      console.log(`[CHECK_OUT_OTP] Email Request Skipped. No email address found for Booking ID: ${booking.id}`);
    }

    // Create system notification for client (do NOT include raw OTP code in notification message)
    try {
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Service Completion Request 🌟",
        message: "Your Mehndi service has been completed. Please share the OTP sent to your registered email address with your Artist to verify Check-Out.",
        type: "BOOKING",
        data: {
          type: "booking",
          event: "checkout_otp_received",
          bookingId: booking.id
        }
      });

      // Emit realtime socket event to customer (do NOT include raw OTP code in socket payload)
      const { getIO } = require("../sockets/socket");
      const io = getIO();
      io.to(booking.user_id.toString()).emit("checkout_otp_received", {
        bookingId: booking.id,
        message: "Your service has been completed. Please share the OTP sent to your registered mobile number."
      });
    } catch (err) {
      console.error("Error dispatching Check-Out OTP notifications:", err.message);
    }

    return { success: true };
  }

  async verifyCheckOutOtp(bookingId, otp, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const attempts = (checkOutFailedAttempts.get(booking.id) || 0) + 1;
    checkOutFailedAttempts.set(booking.id, attempts);

    if (!booking.check_out_otp || booking.check_out_otp !== otp || new Date() > new Date(booking.check_out_otp_expires_at)) {
      console.log(`[CHECK_OUT_OTP_VERIFY] Verification Status: FAILED. Booking ID: ${booking.id}, Attempt: ${attempts}/3, Reason: Invalid or expired OTP`);
      if (attempts >= 3) {
        await booking.update({
          check_out_otp: null,
          check_out_otp_expires_at: null
        });
        checkOutFailedAttempts.delete(booking.id);
        throw new AppError("Too many incorrect attempts. Please request a new OTP.", 400);
      }
      throw new AppError("Invalid or expired Check-Out OTP", 400);
    }

    console.log(`[CHECK_OUT_OTP_VERIFY] Verification Status: SUCCESS. Booking ID: ${booking.id}`);
    checkOutFailedAttempts.delete(booking.id);

    const checkInTime = booking.check_in_time || new Date(Date.now() - 30 * 60 * 1000); // fallback 30m duration
    const checkOutTime = new Date();
    const duration = Math.round((checkOutTime - checkInTime) / (60 * 1000)) || 1;

    await booking.update({
      booking_status: "COMPLETED",
      detailed_status: "COMPLETED",
      payment_status: "PAID",
      check_out_otp_verified: true,
      check_out_time: checkOutTime,
      service_duration: duration
    });

    // Process financial escrow release or outstanding commission settlement via SettlementService
    try {
      const settlementService = require("./settlement.services");
      await settlementService.processBookingSettlement(booking.id);
      console.log(`[completeService-OTP] Financial settlement & ledger entries created for booking #${booking.id}`);
    } catch (settleErr) {
      console.error("Error processing financial settlement upon completion:", settleErr.message);
    }


    // Create success transaction record
    try {
      const cfPaymentId = `pay_cash_${Math.random().toString(36).substring(2, 10)}`;
      await db.Transaction.create({
        user_id: booking.user_id,
        booking_id: booking.id,
        cashfree_order_id: `order_${booking.id}_completion`,
        cashfree_payment_id: cfPaymentId,
        amount: booking.remaining_amount || 0,
        status: "SUCCESS",
        gateway: "CASH"
      });
    } catch (txErr) {
      console.error("Error creating Transaction upon completion:", txErr.message);
    }

    await db.BookingStatusHistory.create({
      booking_id: booking.id,
      status: "COMPLETED",
      changed_by: userId,
      notes: `Check-Out OTP verified successfully. Service completed. Duration: ${duration} mins.`
    });

    // Notify customer and artist
    try {
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Service Completed successfully! 🎉",
        message: `Your Mehndi service has been completed. Thank you for using MehndiGo!`,
        type: "BOOKING",
        data: { type: "booking", event: "booking_completed", bookingId: booking.id }
      });

      // Emit realtime socket event to customer
      const { getIO } = require("../sockets/socket");
      const io = getIO();
      io.to(booking.user_id.toString()).emit("booking_completed", { bookingId: booking.id });
    } catch (err) {
      console.error("Error dispatching Check-Out confirmations:", err.message);
    }

    return { success: true, booking };
  }
}

module.exports = new BookingService();

