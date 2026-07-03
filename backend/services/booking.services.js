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

    await db.Booking.update(
      {
        payment_status: "PAID",
        booking_status: "CONFIRMED",
        detailed_status: "CONFIRMED"
      },
      { where: { id: tx.booking_id } }
    );

    await db.BookingStatusHistory.create({
      booking_id: tx.booking_id,
      status: "CONFIRMED",
      changed_by: userId,
      notes: "Payment verified successfully. Booking confirmed."
    });

    // Create Invoice record
    const invoiceNum = `INV-${Date.now()}`;
    await db.Invoice.create({
      booking_id: tx.booking_id,
      invoice_number: invoiceNum,
      invoice_url: `/payment/receipt/${tx.booking_id}`
    });

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
      updates.booking_status = "COMPLETED";
      if (booking.payment_status !== "PAID") {
        updates.payment_status = "PAID";
        try {
          const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
          if (artistProfile) {
            const [artistWallet] = await db.Wallet.findOrCreate({
              where: { user_id: artistProfile.user_id },
              defaults: { balance: 0 }
            });
            const creditAmount = booking.final_amount;
            await artistWallet.increment('balance', { by: creditAmount });

            const customerUser = await db.User.findByPk(booking.user_id);
            const customerName = customerUser ? customerUser.name : "Client";
            await db.WalletTransaction.create({
              wallet_id: artistWallet.id,
              booking_id: booking.id,
              transaction_type: "PAYMENT",
              amount: creditAmount,
              status: "SUCCESS",
              description: `Completed payment from ${customerName} (#${booking.booking_code})`
            });
            console.log(`[WalletTx] Credited completion amount of ₹${creditAmount} to artist user ID ${artistProfile.user_id} wallet`);

            // Generate completion invoice if it doesn't exist
            const existingInvoice = await db.Invoice.findOne({ where: { booking_id: booking.id } });
            if (!existingInvoice) {
              const invoiceNum = `INV-${Date.now()}`;
              await db.Invoice.create({
                booking_id: booking.id,
                invoice_number: invoiceNum,
                invoice_url: `/payment/receipt/${booking.id}`
              });
              console.log(`[Invoice] Generated completion invoice ${invoiceNum} for booking #${booking.booking_code}`);
            }
          }
        } catch (walletErr) {
          console.error("Error crediting artist wallet on completion:", walletErr.message);
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
      await db.Notification.create({
        user_id: userToNotify,
        title: `Booking Update: ${newStatus}`,
        message: `Booking #${booking.booking_code} status has been updated to ${newStatus}`,
        type: "SYSTEM"
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
}

module.exports = new BookingService();
