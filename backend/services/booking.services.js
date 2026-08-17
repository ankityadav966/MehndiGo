const db = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/errors/app.error");
const crypto = require("crypto");

const checkInFailedAttempts = new Map();
const checkOutFailedAttempts = new Map();

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // default fallback 5km
  const R = 6371; // Earth radius in KM
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function estimateTravelMinutes(distanceKm) {
  if (!distanceKm || distanceKm <= 0.5) return 10;
  // Average city driving speed ~25 km/h + 5 mins initial buffer + 10% traffic factor
  const travelMinutes = Math.ceil((distanceKm / 25) * 60 * 1.1) + 5;
  return Math.max(10, Math.min(180, travelMinutes));
}

class BookingService {
  constructor() {
    this.createBooking = this.createBooking.bind(this);
    this.hasRestrictedBooking = this.hasRestrictedBooking.bind(this);
    this.calculateTravelAndSequence = this.calculateTravelAndSequence.bind(this);
  }

  async calculateTravelAndSequence(artistId, targetDate, targetSlotStartTime, targetLat, targetLng) {
    const artist = await db.ArtistProfile.findByPk(artistId);
    if (!artist) {
      return {
        originType: "HOME_BASE",
        originAddress: "Artist Base Location",
        distanceKm: 5.0,
        durationMins: 20,
        isFeasible: true
      };
    }

    const dStr = typeof targetDate === "string" ? targetDate.substring(0, 10) : new Date(targetDate).toISOString().substring(0, 10);
    const startOfDay = new Date(`${dStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dStr}T23:59:59.999Z`);

    // Fetch confirmed or active bookings for this artist on targetDate
    const existingBookings = await db.Booking.findAll({
      where: {
        artist_id: artistId,
        booking_status: { [Op.ne]: "CANCELLED" },
        createdAt: { [Op.between]: [startOfDay, endOfDay] }
      },
      include: [
        { model: db.AvailabilitySlot, as: "slot", required: false }
      ],
      order: [["createdAt", "ASC"]]
    });

    const targetTime = targetSlotStartTime ? new Date(targetSlotStartTime).getTime() : Date.now();
    let previousBooking = null;

    for (const b of existingBookings) {
      const bStartTime = b.slot?.start_time ? new Date(b.slot.start_time).getTime() : new Date(b.createdAt).getTime();
      if (bStartTime < targetTime) {
        if (!previousBooking || bStartTime > (previousBooking.slot?.start_time ? new Date(previousBooking.slot.start_time).getTime() : 0)) {
          previousBooking = b;
        }
      }
    }

    let originLat = Number(artist.latitude || 26.9124);
    let originLng = Number(artist.longitude || 75.7873);
    let originType = "HOME_BASE";
    let originAddress = artist.location || artist.city || "Artist Studio";

    if (previousBooking && previousBooking.latitude && previousBooking.longitude) {
      originLat = Number(previousBooking.latitude);
      originLng = Number(previousBooking.longitude);
      originType = "PREVIOUS_BOOKING";
      originAddress = previousBooking.address || previousBooking.landmark || `Previous Client #${previousBooking.booking_code}`;
    }

    const custLat = targetLat ? Number(targetLat) : originLat;
    const custLng = targetLng ? Number(targetLng) : originLng;
    const distanceKm = calculateHaversineDistance(originLat, originLng, custLat, custLng);
    const durationMins = estimateTravelMinutes(distanceKm);

    return {
      originType,
      originAddress,
      originLat,
      originLng,
      distanceKm,
      durationMins,
      isFeasible: true
    };
  }

  async calculatePriceDetails(serviceId, couponCode = null, userId = null, slotCount = 1, distanceKm = 0, customArtPrice = null, groupSize = 1, serviceCoverage = "BOTH_HANDS") {
    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      throw new AppError("Service not found", 404);
    }

    const numPeople = Math.max(1, Number(groupSize || 1));
    const servicePrice = customArtPrice ? Number(customArtPrice) : (service.minimum_price || 500);
    
    // Coverage multiplier (e.g. BOTH_HANDS = 1.0, FEET_AND_HANDS = 1.5, BRIDAL_FULL = 2.0)
    let coverageMultiplier = 1.0;
    if (serviceCoverage === "FEET_AND_HANDS" || serviceCoverage === "BRIDAL_FULL") {
      coverageMultiplier = 1.5;
    } else if (serviceCoverage === "ONE_HAND") {
      coverageMultiplier = 0.7;
    }

    const basePricePerPerson = Math.round(servicePrice * coverageMultiplier);
    const basePrice = basePricePerPerson * numPeople * slotCount;

    // Per-KM distance rules: 0-10 KM = FREE, >10 KM = ₹5/KM
    const freeDistance = 10;
    const ratePerKm = 5;
    const chargeableDistance = Math.max(0, Number(distanceKm || 0) - freeDistance);
    const travelCharges = Math.round(chargeableDistance * ratePerKm);

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

    const priceAfterDiscount = Math.max(0, basePrice - couponDiscount);
    const finalAmount = Math.max(0, priceAfterDiscount + travelCharges);
    const advanceAmount = Math.round(finalAmount * 0.10);

    return {
      servicePrice: basePrice,
      basePricePerPerson,
      groupSize: numPeople,
      serviceCoverage,
      travelCharges,
      couponDiscount,
      platformFee: 0,
      gst: 0,
      advanceAmount: advanceAmount,
      remainingCash: Math.max(0, finalAmount - advanceAmount),
      finalAmount
    };
  }

  async createBooking(userId, data) {
    const hasRestricted = await this.hasRestrictedBooking(userId);
    if (hasRestricted) {
      throw new AppError("You have a previous booking with a pending payment or settlement. Please complete your current booking before creating a new booking.", 400);
    }

    const {
      serviceId,
      artistId,
      slotId,
      address,
      landmark,
      notes,
      couponCode,
      latitude,
      longitude,
      selectedDate,
      timeLabel,
      group_size,
      groupSize,
      service_coverage,
      serviceCoverage,
      reference_images,
      referenceImages
    } = data;

    const numPeople = Number(group_size || groupSize || 1);
    const coverage = service_coverage || serviceCoverage || "BOTH_HANDS";
    const refImages = reference_images || referenceImages || [];

    // 1. Strict Validation
    if (Array.isArray(slotId) && slotId.length > 1) {
      throw new AppError("Only 1 Date and 1 Time Slot can be selected per booking. Multi-slot booking is not allowed.", 400);
    }
    if (typeof selectedDate === "string" && selectedDate.includes(",")) {
      throw new AppError("Only 1 Date and 1 Time Slot can be selected per booking. Multi-date booking is not allowed.", 400);
    }
    if (typeof timeLabel === "string" && timeLabel.includes(",")) {
      throw new AppError("Only 1 Date and 1 Time Slot can be selected per booking. Multi-slot booking is not allowed.", 400);
    }

    // 1. Validate Customer Exists
    const customer = await db.User.findByPk(userId);
    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    // 3. Validate Artist Exists & Verification Status
    const artist = await db.ArtistProfile.findByPk(artistId);
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    if (artist.verification_status === "REJECTED") {
      throw new AppError("This artist is currently unavailable for new bookings.", 400);
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
    let isRestricted = false;
    try {
      if (typeof this.hasRestrictedBooking === 'function') {
        isRestricted = await this.hasRestrictedBooking(userId, artistId);
      }
    } catch (err) {
      console.error("Warning: hasRestrictedBooking check failed:", err.message);
    }
    if (isRestricted) {
      throw new AppError("Booking restricted. You have too many active bookings or pending disputes.", 400);
    }

    // 6. Calculate Travel ETA & Origin from previous booking on the same day
    const travelInfo = await this.calculateTravelAndSequence(
      artistId,
      selectedDate || new Date(),
      null,
      latitude,
      longitude
    );

    // 7. Execute Transaction with Atomic Row Lock & Double Booking Collision Check
    const bookingResult = await db.sequelize.transaction(async (t) => {
      let finalSlotId = singleSlotId || null;
      let slotStartTime = null;
      let slotEndTime = null;

      // Purge any expired temporary holds for this artist (>15 mins and PENDING)
      await db.Booking.update(
        { booking_status: "CANCELLED", detailed_status: "CANCELLED", cancel_reason: "Temporary booking hold expired" },
        {
          where: {
            artist_id: artistId,
            booking_status: "PENDING",
            hold_expires_at: { [Op.lt]: new Date() }
          },
          transaction: t
        }
      );

      if (singleSlotId) {
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

        slotStartTime = slot.start_time;
        slotEndTime = slot.end_time;

        // Check if another active booking or unexpired hold exists for this slot
        const existingConfirmedBooking = await db.Booking.findOne({
          where: {
            artist_id: artistId,
            slot_id: singleSlotId,
            user_id: { [Op.ne]: userId },
            [Op.or]: [
              { booking_status: { [Op.in]: ["CONFIRMED", "COMPLETED"] } },
              { detailed_status: { [Op.in]: ["ACCEPTED", "ARTIST_ACCEPTED", "CONFIRMED", "COMPLETED"] } },
              {
                [Op.and]: [
                  { booking_status: "PENDING" },
                  { hold_expires_at: { [Op.gt]: new Date() } }
                ]
              }
            ]
          },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (existingConfirmedBooking) {
          throw new AppError("Sorry, this slot was just booked or placed on hold by another customer. Please select another time.", 409);
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
          await userPendingBooking.update({
            hold_expires_at: new Date(Date.now() + 15 * 60 * 1000)
          }, { transaction: t });
          return userPendingBooking;
        }

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

        slotStartTime = startTime;
        slotEndTime = endTime;

        // Double booking check for custom date & time window
        const existingConfirmedSlot = await db.Booking.findOne({
          where: {
            artist_id: artistId,
            user_id: { [Op.ne]: userId },
            [Op.or]: [
              { booking_status: { [Op.in]: ["CONFIRMED", "COMPLETED"] } },
              { detailed_status: { [Op.in]: ["ACCEPTED", "ARTIST_ACCEPTED", "CONFIRMED", "COMPLETED"] } },
              {
                [Op.and]: [
                  { booking_status: "PENDING" },
                  { hold_expires_at: { [Op.gt]: new Date() } }
                ]
              }
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
          throw new AppError("Sorry, this slot was just booked or placed on hold by another customer. Please select another time.", 409);
        }
      }

      const selectedArtId = data.selected_art_id || data.selectedArt?.id || null;
      const selectedArtTitle = data.selected_art_title || data.selectedArt?.title || null;
      const selectedArtImage = data.selected_art_image || data.selectedArt?.image_url || null;
      const selectedArtTier = data.selected_art_tier || data.selectedArt?.art_tier || "STANDARD";
      const selectedArtDuration = Number(data.selected_art_duration || data.selectedArt?.duration_minutes || 60);
      const selectedArtPrice = data.selected_art_price || data.selectedArt?.price || null;

      const completionPin = Math.floor(1000 + Math.random() * 9000).toString();
      const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute temporary hold

      // Calculate price with group size & coverage
      const pricing = await this.calculatePriceDetails(
        serviceId,
        couponCode,
        userId,
        1,
        travelInfo.distanceKm,
        selectedArtPrice,
        numPeople,
        coverage
      );
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
        hold_expires_at: holdExpiresAt,
        group_size: numPeople,
        service_coverage: coverage,
        reference_images: refImages,
        pin_attempts: 0,
        pin_locked_until: null,
        cancellation_fee: 0,
        refund_amount: 0,
        is_rescheduled: false,
        travel_origin_type: travelInfo.originType,
        travel_origin_address: travelInfo.originAddress,
        travel_distance_km: travelInfo.distanceKm,
        travel_duration_mins: travelInfo.durationMins,

        completion_pin: completionPin,
        selected_art_id: selectedArtId,
        selected_art_title: selectedArtTitle,
        selected_art_image: selectedArtImage,
        selected_art_tier: selectedArtTier,
        selected_art_duration: selectedArtDuration * numPeople,
        selected_art_price: selectedArtPrice,

        address: address || null,
        landmark: landmark || null,
        notes: notes || null,
        coupon_code: couponCode || null,
        latitude: latitude || null,
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
    let where = { id: bookingId };
    if (role === "CUSTOMER") {
      where.user_id = userId;
    } else if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      const artistIds = artist ? [artist.id, Number(userId)] : [Number(userId)];
      where.artist_id = { [Op.in]: artistIds };
    }

    const booking = await db.Booking.findOne({
      where,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "email", "profile_image"]
        },
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
        },
        {
          model: db.Service,
          as: "service",
          attributes: ["id", "specialization_name", "category", "duration_minutes", "minimum_price"]
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
      const artistIds = artist ? [artist.id, Number(userId)] : [Number(userId)];
      where.artist_id = { [Op.in]: artistIds };
    }

    return await db.Booking.findAll({
      where,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "email", "profile_image"]
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
        [Op.or]: [
          { detailed_status: "WAITING_FOR_USER_PAYMENT" },
          { detailed_status: "COMPLETED", payment_status: "PARTIAL" },
          { payment_status: "PARTIAL", booking_status: "COMPLETED" }
        ],
        remaining_amount: { [Op.gt]: 0 }
      },
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          attributes: ["id", "bio", "experience_years", "avg_rating", "total_reviews", "city", "state", "business_name", "locality"],
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "profile_image", "phone"]
            }
          ]
        },
        {
          model: db.Service,
          as: "service",
          attributes: ["id", "specialization_name", "category", "base_price"]
        },
        {
          model: db.AvailabilitySlot,
          as: "slot"
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
      io.to(booking.user_id.toString()).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: booking.booking_status,
        detailed_status: "ARTIST_ARRIVED",
        status: "ARTIST_ARRIVED",
        timestamp: new Date()
      });
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: booking.booking_status,
        detailed_status: "ARTIST_ARRIVED",
        status: "ARTIST_ARRIVED",
        timestamp: new Date()
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
      io.to(booking.user_id.toString()).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CONFIRMED",
        detailed_status: "SERVICE_STARTED",
        status: "SERVICE_STARTED",
        timestamp: new Date()
      });
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CONFIRMED",
        detailed_status: "SERVICE_STARTED",
        status: "SERVICE_STARTED",
        timestamp: new Date()
      });
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

  async cancelBookingWithPolicy(bookingId, userId, role, reason = "Cancelled by user") {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [
        { model: db.AvailabilitySlot, as: "slot", required: false },
        { model: db.ArtistProfile, as: "artist", required: false }
      ]
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (booking.booking_status === "CANCELLED") {
      return booking;
    }

    if (booking.booking_status === "COMPLETED") {
      throw new AppError("Cannot cancel an already completed booking", 400);
    }

    const slotStartTime = booking.slot?.start_time ? new Date(booking.slot.start_time).getTime() : (booking.createdAt ? new Date(booking.createdAt).getTime() + 24 * 60 * 60 * 1000 : Date.now());
    const now = Date.now();
    const hoursRemaining = Math.max(0, (slotStartTime - now) / (1000 * 60 * 60));

    let refundAmount = 0;
    let cancellationFee = 0;
    const advancePaid = Number(booking.advance_paid || 0);

    if (role === "CUSTOMER") {
      if (hoursRemaining > 24) {
        // > 24 hours: Full refund of advance paid
        refundAmount = advancePaid;
        cancellationFee = 0;
      } else if (hoursRemaining >= 12 && hoursRemaining <= 24) {
        // 12 - 24 hours: 50% refund, 50% cancellation fee
        refundAmount = Math.round(advancePaid * 0.50);
        cancellationFee = advancePaid - refundAmount;
      } else {
        // < 12 hours: No refund, 100% cancellation fee
        refundAmount = 0;
        cancellationFee = advancePaid;
      }
    } else {
      // Artist or Admin Cancelled: Customer gets 100% refund
      refundAmount = advancePaid;
      cancellationFee = 0;

      // Penalize Artist ORM / Reliability Score
      if (role === "ARTIST") {
        try {
          const artistProfile = booking.artist || (await db.ArtistProfile.findByPk(booking.artist_id));
          if (artistProfile) {
            await artistProfile.increment("cancellation_count_30d", { by: 1 });
            const [artistScore] = await db.ArtistScore.findOrCreate({
              where: { artist_id: artistProfile.id },
              defaults: { reliability_score: 100.0 }
            });
            const newScore = Math.max(0, (artistScore.reliability_score || 100.0) - 5.0);
            await artistScore.update({ reliability_score: newScore });
            console.log(`[ORM Penalty] Artist #${artistProfile.id} penalized 5 points for cancellation. New score: ${newScore}`);
          }
        } catch (scoreErr) {
          console.error("Error updating artist reliability score on cancellation:", scoreErr.message);
        }
      }
    }

    // Update booking record
    await booking.update({
      booking_status: "CANCELLED",
      detailed_status: "CANCELLED",
      cancel_reason: reason,
      refund_amount: refundAmount,
      cancellation_fee: cancellationFee
    });

    // Free availability slot
    if (booking.slot_id) {
      await db.AvailabilitySlot.update(
        { is_booked: false },
        { where: { id: booking.slot_id } }
      );
    }

    // Process refund entry & ledger if applicable
    if (refundAmount > 0) {
      try {
        await db.Refund.create({
          booking_id: booking.id,
          amount: refundAmount,
          status: "PROCESSED",
          reason: `Cancellation refund (${role === 'CUSTOMER' ? hoursRemaining.toFixed(1) + 'h notice' : 'Cancelled by Artist'})`
        });

        // Credit to customer wallet or ledger
        const [userWallet] = await db.Wallet.findOrCreate({
          where: { user_id: booking.user_id },
          defaults: { balance: 0, available_balance: 0 }
        });
        await userWallet.increment("balance", { by: refundAmount });
        await userWallet.increment("available_balance", { by: refundAmount });

        const ledgerService = require("./ledger.services");
        await ledgerService.recordEntry({
          user_id: booking.user_id,
          wallet_id: userWallet.id,
          booking_id: booking.id,
          entry_type: "REFUND",
          amount: refundAmount,
          description: `Refund for cancelled booking #${booking.booking_code}`
        });
      } catch (refErr) {
        console.error("Error processing refund record on cancellation:", refErr.message);
      }
    }

    // Log status history
    await db.BookingStatusHistory.create({
      booking_id: booking.id,
      status: "CANCELLED",
      changed_by: userId,
      notes: `Booking cancelled by ${role}. Refund: ₹${refundAmount}, Cancellation Fee: ₹${cancellationFee}. Reason: ${reason}`
    });

    // Notify customer and artist
    try {
      const { getIO } = require("../sockets/socket");
      const io = getIO();
      io.to(booking.user_id.toString()).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CANCELLED",
        detailed_status: "CANCELLED",
        status: "CANCELLED",
        refundAmount,
        cancellationFee,
        timestamp: new Date()
      });
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CANCELLED",
        detailed_status: "CANCELLED",
        status: "CANCELLED",
        refundAmount,
        cancellationFee,
        timestamp: new Date()
      });
    } catch (socketErr) {
      console.error("Error emitting cancellation socket event:", socketErr.message);
    }

    return booking;
  }

  async rescheduleBooking(bookingId, userId, newDate, newTimeSlot, newLat = null, newLng = null) {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [{ model: db.AvailabilitySlot, as: "slot", required: false }]
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (booking.booking_status === "CANCELLED" || booking.booking_status === "COMPLETED") {
      throw new AppError(`Cannot reschedule a ${booking.booking_status.toLowerCase()} booking`, 400);
    }

    const dStr = String(newDate).trim();
    const lbl = String(newTimeSlot).trim();

    let startTime = new Date(`${dStr}T10:00:00.000Z`);
    let endTime = new Date(`${dStr}T13:00:00.000Z`);
    if (lbl.includes("02:00 PM") || lbl.includes("14:00")) {
      startTime = new Date(`${dStr}T14:00:00.000Z`);
      endTime = new Date(`${dStr}T17:00:00.000Z`);
    } else if (lbl.includes("06:00 PM") || lbl.includes("18:00")) {
      startTime = new Date(`${dStr}T18:00:00.000Z`);
      endTime = new Date(`${dStr}T21:00:00.000Z`);
    }

    // Atomic transaction to swap slots
    const updatedBooking = await db.sequelize.transaction(async (t) => {
      // Check collision on new time slot
      const existingSlot = await db.Booking.findOne({
        where: {
          artist_id: booking.artist_id,
          id: { [Op.ne]: booking.id },
          booking_status: { [Op.in]: ["CONFIRMED", "PENDING"] }
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

      if (existingSlot) {
        throw new AppError("The selected reschedule slot is already booked. Please choose another time.", 409);
      }

      // Free old slot
      if (booking.slot_id) {
        await db.AvailabilitySlot.update(
          { is_booked: false },
          { where: { id: booking.slot_id }, transaction: t }
        );
      }

      // Create and lock new slot
      const newSlot = await db.AvailabilitySlot.create({
        artist_id: booking.artist_id,
        start_time: startTime,
        end_time: endTime,
        is_booked: true
      }, { transaction: t });

      // Update booking
      await booking.update({
        slot_id: newSlot.id,
        reschedule_date: startTime,
        reschedule_time: lbl,
        is_rescheduled: true,
        detailed_status: "CONFIRMED"
      }, { transaction: t });

      // Record history
      await db.BookingStatusHistory.create({
        booking_id: booking.id,
        status: "RESCHEDULED",
        changed_by: userId,
        notes: `Booking rescheduled to ${dStr} at ${lbl}`
      }, { transaction: t });

      return booking;
    });

    // Notify customer and artist
    try {
      const { getIO } = require("../sockets/socket");
      const io = getIO();
      io.to(booking.user_id.toString()).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CONFIRMED",
        detailed_status: "RESCHEDULED",
        status: "RESCHEDULED",
        newDate: dStr,
        newTimeSlot: lbl,
        timestamp: new Date()
      });
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CONFIRMED",
        detailed_status: "RESCHEDULED",
        status: "RESCHEDULED",
        newDate: dStr,
        newTimeSlot: lbl,
        timestamp: new Date()
      });
    } catch (socketErr) {
      console.error("Error emitting reschedule socket event:", socketErr.message);
    }

    return updatedBooking;
  }

  async verifyCheckOutOtp(bookingId, otp, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // 1. Idempotency Guard: If already completed, return early
    if (booking.booking_status === "COMPLETED" && booking.detailed_status === "COMPLETED") {
      console.log(`[CHECK_OUT_OTP_VERIFY] Booking #${booking.booking_code} already completed. Idempotent return.`);
      return { success: true, booking, already_completed: true };
    }

    // 2. State Guard: Only verify when service is in progress
    if (booking.detailed_status !== "SERVICE_STARTED" && booking.detailed_status !== "ARTIST_ARRIVED") {
      throw new AppError(`Cannot complete booking from status '${booking.detailed_status}'. Service must be started first.`, 400);
    }

    // 3. Security Lock Check (Rate Limiting)
    if (booking.pin_locked_until && new Date() < new Date(booking.pin_locked_until)) {
      const remainingMins = Math.ceil((new Date(booking.pin_locked_until).getTime() - Date.now()) / (1000 * 60));
      throw new AppError(`Completion PIN verification is temporarily locked due to too many failed attempts. Please try again in ${remainingMins} minutes.`, 429);
    }

    const currentAttempts = (booking.pin_attempts || 0) + 1;

    const isPinValid = booking.completion_pin && String(booking.completion_pin).trim() === String(otp).trim();
    const isOtpValid = booking.check_out_otp && booking.check_out_otp === otp && new Date() <= new Date(booking.check_out_otp_expires_at);

    if (!isPinValid && !isOtpValid) {
      console.log(`[CHECK_OUT_OTP_VERIFY] Verification Status: FAILED. Booking ID: ${booking.id}, Attempt: ${currentAttempts}/5, Reason: Invalid OTP/PIN`);
      
      if (currentAttempts >= 5) {
        // Lock PIN for 15 minutes
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await booking.update({
          pin_attempts: currentAttempts,
          pin_locked_until: lockUntil
        });
        throw new AppError("Too many incorrect PIN attempts. Verification is locked for 15 minutes for customer security.", 429);
      } else {
        await booking.update({ pin_attempts: currentAttempts });
        throw new AppError(`Invalid Completion PIN or OTP. ${5 - currentAttempts} attempts remaining. Please check with customer.`, 400);
      }
    }

    console.log(`[CHECK_OUT_OTP_VERIFY] Verification Status: SUCCESS. Booking ID: ${booking.id} (Verified via ${isPinValid ? '4-Digit PIN' : 'OTP'})`);

    const checkInTime = booking.check_in_time || new Date(Date.now() - 30 * 60 * 1000);
    const checkOutTime = new Date();
    const duration = Math.round((checkOutTime - checkInTime) / (60 * 1000)) || 1;

    await booking.update({
      booking_status: "COMPLETED",
      detailed_status: "COMPLETED",
      payment_status: "PAID",
      check_out_otp_verified: true,
      check_out_time: checkOutTime,
      service_duration: duration,
      pin_attempts: 0,
      pin_locked_until: null
    });

    // 4. Idempotent Settlement Release
    try {
      const settlementService = require("./settlement.services");
      await settlementService.processBookingSettlement(booking.id);
      console.log(`[completeService-OTP] Financial settlement & ledger entries verified for booking #${booking.id}`);
    } catch (settleErr) {
      console.error("Error processing financial settlement upon completion:", settleErr.message);
    }

    // 5. Create success transaction record
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
      notes: `Check-Out PIN verified successfully. Service completed. Duration: ${duration} mins.`
    });

    // 6. Notify customer and artist
    try {
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Service Completed successfully! 🎉",
        message: `Your Mehndi service has been completed. Thank you for using MehndiGo!`,
        type: "BOOKING",
        data: { type: "booking", event: "booking_completed", bookingId: booking.id }
      });

      const { getIO } = require("../sockets/socket");
      const io = getIO();
      io.to(booking.user_id.toString()).emit("booking_completed", { bookingId: booking.id });
      io.to(booking.user_id.toString()).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "COMPLETED",
        detailed_status: "COMPLETED",
        status: "COMPLETED",
        timestamp: new Date()
      });
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "COMPLETED",
        detailed_status: "COMPLETED",
        status: "COMPLETED",
        timestamp: new Date()
      });
    } catch (err) {
      console.error("Error dispatching Check-Out confirmations:", err.message);
    }

    return { success: true, booking };
  }
}

module.exports = new BookingService();

