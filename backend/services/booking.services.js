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
    const { serviceId, artistId, slotId, address, landmark, notes, couponCode, latitude, longitude, selectedDate, timeLabel } = data;

    const slotIds = Array.isArray(slotId) ? slotId : (slotId ? [slotId] : []);
    const slotCount = slotIds.length > 0 ? slotIds.length : 1;

    // 1. Validate Customer Exists
    const customer = await db.User.findByPk(userId);
    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    // 2. Validate Artist Exists
    const artist = await db.ArtistProfile.findByPk(artistId);
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    // 3. Validate Service Exists
    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      throw new AppError("Service not found", 404);
    }
    if (service.artist_id !== artistId) {
      throw new AppError("Service does not belong to the selected artist", 400);
    }

    // 4. Validate Slots Exist, belong to artist, are not already booked, and check duplicate slots for user
    if (slotIds.length > 0) {
      for (const id of slotIds) {
        const slot = await db.AvailabilitySlot.findByPk(id);
        if (!slot) {
          throw new AppError("Availability slot not found", 404);
        }
        if (slot.artist_id !== artistId) {
          throw new AppError("Availability slot does not belong to this artist", 400);
        }
        if (slot.is_booked) {
          throw new AppError("Selected time slot is already booked", 400);
        }
      }

      const duplicate = await db.Booking.findOne({
        where: {
          user_id: userId,
          slot_id: { [Op.in]: slotIds },
          booking_status: { [Op.ne]: "CANCELLED" }
        }
      });
      if (duplicate) {
        throw new AppError("You already have an active booking for this time slot", 400);
      }
    }

    // 5. Check Restricted Booking Rules
    const isRestricted = typeof this.hasRestrictedBooking === 'function'
      ? await this.hasRestrictedBooking(userId, artistId)
      : await BookingService.prototype.hasRestrictedBooking.call(this, userId, artistId);
    if (isRestricted) {
      throw new AppError("Booking restricted. You have too many active bookings or pending disputes.", 400);
    }

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
        remaining_amount: pricing.finalAmount - Math.round(pricing.finalAmount * 0.10),
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

  async createPaymentSession(bookingId, userId) {
    const paymentService = require("./payment.services");
    return await paymentService.createSession(bookingId, userId);
  }

  async verifyPayment(userId, data) {
    const paymentService = require("./payment.services");
    // Translate booking-side verifyPayment structure to generic verifyPayment structure
    const verifyData = {
      cashfree_order_id: data.cashfree_order_id || data.order_id || data.orderId,
      payment_session_id: data.payment_session_id
    };
    await paymentService.verifyPayment(userId, verifyData);
    return await this.getBookingDetails(data.bookingId || verifyData.cashfree_order_id.split('_')[1], userId, "CUSTOMER");
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
      updates.booking_status = "COMPLETED";
      updates.detailed_status = "COMPLETED";
      updates.payment_status = "PAID";
      updates.artist_completion_status = "COMPLETED";
      updates.artist_completed_at = new Date();
      updates.remaining_paid_at = new Date();

      // Credit remaining 90% directly to Artist Wallet on service completion
      try {
        const remainingPaid = booking.remaining_amount || 0;
        const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
        if (artistProfile) {
          const [artistWallet] = await db.Wallet.findOrCreate({
            where: { user_id: artistProfile.user_id },
            defaults: { balance: 0 }
          });
          await artistWallet.increment("balance", { by: remainingPaid });
          
          const customerUser = await db.User.findByPk(booking.user_id);
          const customerName = customerUser ? customerUser.name : "Client";
          await db.WalletTransaction.create({
            wallet_id: artistWallet.id,
            booking_id: booking.id,
            transaction_type: "PAYMENT",
            amount: remainingPaid,
            status: "SUCCESS",
            description: `Mehndi application service payment from customer ${customerName}`
          });
          console.log(`[completeService] Credited remaining ₹${remainingPaid} to Artist Wallet`);
        }
      } catch (artistErr) {
        console.error("Error crediting Artist Wallet upon completion:", artistErr.message);
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
      await db.Notification.create({
        user_id: userToNotify,
        title: `Booking Update: ${newStatus}`,
        message: `Booking #${booking.booking_code} status has been updated to ${newStatus}`,
        type: "BOOKING",
        data: {
          type: "booking",
          event: "booking_confirmed",
          bookingId: booking.id
        }
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
    if (booking.user_id !== userId) {
      throw new AppError("Unauthorized access to booking", 403);
    }
    await booking.update({ review_skipped: true });
    return booking;
  }

  async hasRestrictedBooking(userId, artistId) {
    // 1. Check if user has 3 or more active bookings (excluding completed, waiting-for-payment, and cancelled bookings)
    const activeBookingsCount = await db.Booking.count({
      where: {
        user_id: userId,
        booking_status: { [Op.ne]: "CANCELLED" },
        detailed_status: { [Op.in]: ["PENDING", "CONFIRMED", "ACCEPTED", "ARTIST_ACCEPTED", "ARTIST_ON_THE_WAY", "ARTIST_ARRIVED", "SERVICE_STARTED", "RESCHEDULED"] }
      }
    });
    if (activeBookingsCount >= 3) {
      return true;
    }

    // 2. Check if user has a booking with a pending cash payment dispute or awaiting cash confirmation
    const disputeCount = await db.Booking.count({
      where: {
        user_id: userId,
        detailed_status: { [Op.in]: ["CASH_DISPUTED", "AWAITING_CASH_CONFIRMATION"] }
      }
    });
    if (disputeCount > 0) {
      return true;
    }

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

    // Credit remaining 90% directly to Artist Wallet on service completion
    try {
      const remainingPaid = booking.remaining_amount || 0;
      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        const [artistWallet] = await db.Wallet.findOrCreate({
          where: { user_id: artistProfile.user_id },
          defaults: { balance: 0 }
        });
        await artistWallet.increment("balance", { by: remainingPaid });
        
        const customerUser = await db.User.findByPk(booking.user_id);
        const customerName = customerUser ? customerUser.name : "Client";
        await db.WalletTransaction.create({
          wallet_id: artistWallet.id,
          booking_id: booking.id,
          transaction_type: "PAYMENT",
          amount: remainingPaid,
          status: "SUCCESS",
          description: `Mehndi application service payment from customer ${customerName}`
        });
        console.log(`[completeService-OTP] Credited remaining ₹${remainingPaid} to Artist Wallet`);
      }
    } catch (artistErr) {
      console.error("Error crediting Artist Wallet upon completion:", artistErr.message);
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
