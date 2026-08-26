const db = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/errors/app.error");
const crypto = require("crypto");

const checkInFailedAttempts = new Map();
const checkOutFailedAttempts = new Map();

function generateSecure4DigitOtp() {
  return String(crypto.randomInt(1000, 10000));
}

function generateSecure6DigitOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

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

function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined ||
    lat1 === null || lon1 === null || lat2 === null || lon2 === null ||
    isNaN(Number(lat1)) || isNaN(Number(lon1)) || isNaN(Number(lat2)) || isNaN(Number(lon2))) {
    return null;
  }
  const R = 6371000; // Earth radius in meters
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
    Math.cos((Number(lat2) * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
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
    const remainingCash = Math.max(0, finalAmount - advanceAmount);

    return {
      servicePrice: basePrice,
      service_price: basePrice,
      basePricePerPerson,
      base_price_per_person: basePricePerPerson,
      groupSize: numPeople,
      group_size: numPeople,
      serviceCoverage,
      service_coverage: serviceCoverage,
      travelCharges,
      travel_charges: travelCharges,
      couponDiscount,
      coupon_discount: couponDiscount,
      platformFee: 0,
      platform_fee: 0,
      gst: 0,
      advanceAmount: advanceAmount,
      advance_amount: advanceAmount,
      remainingCash: remainingCash,
      remaining_amount: remainingCash,
      finalAmount: finalAmount,
      final_amount: finalAmount,
      total_amount: finalAmount
    };
  }


  async checkRestrictedBooking(userId) {
    try {
      const restricted = await db.Booking.findOne({
        where: {
          user_id: userId,
          [Op.or]: [
            { detailed_status: "CASH_DISPUTED" },
            { payment_status: "DISPUTED" }
          ]
        }
      });
      return { hasRestricted: Boolean(restricted), booking: restricted };
    } catch (e) {
      return { hasRestricted: false };
    }
  }

  async hasRestrictedBooking(userId) {
    try {
      const { hasRestricted } = await this.checkRestrictedBooking(userId);
      return hasRestricted;
    } catch (e) {
      return false;
    }
  }

  async createBooking(userId, data) {
    const hasRestricted = await this.hasRestrictedBooking(userId);
    if (hasRestricted) {
      throw new AppError("You have a previous booking with an active dispute. Please resolve it before creating a new booking.", 400);
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

    const singleSlotId = Array.isArray(slotId) ? slotId[0] : slotId;

    // 2. Validate Customer Exists
    const customer = await db.User.findByPk(userId);
    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    // 3. Validate Artist Exists & Verification Status
    const artist = await db.ArtistProfile.findByPk(artistId);
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    if (artist.verification_status !== "APPROVED") {
      throw new AppError("This artist is currently unverified or pending admin approval, and cannot accept new bookings.", 400);
    }

    // 4. Validate Service Exists & Active Status
    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      throw new AppError("Service not found", 404);
    }
    if (service.artist_id !== artistId) {
      throw new AppError("Service does not belong to the selected artist", 400);
    }
    if (service.is_active === false) {
      throw new AppError("Selected service is currently inactive.", 400);
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

        const newSlot = await db.AvailabilitySlot.create({
          artist_id: artistId,
          start_time: startTime,
          end_time: endTime,
          is_booked: true
        }, { transaction: t });

        finalSlotId = newSlot.id;
      }

      const selectedArtId = data.selected_art_id || data.selectedArt?.id || null;
      const selectedArtTitle = data.selected_art_title || data.selectedArt?.title || null;
      const selectedArtImage = data.selected_art_image || data.selectedArt?.image_url || null;
      const selectedArtTier = data.selected_art_tier || data.selectedArt?.art_tier || "STANDARD";
      const selectedArtDuration = Number(data.selected_art_duration || data.selectedArt?.duration_minutes || 60);
      const selectedArtPrice = data.selected_art_price || data.selectedArt?.price || null;

      const completionPin = generateSecure4DigitOtp();
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
      const bookingCode = `BK-${generateSecure6DigitOtp()}`;

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
        latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
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

    // Note: Artist notification and socket dispatch is deferred until advance payment is verified
    return await this.getBookingDetails(bookingResult.id, userId, "CUSTOMER");
  }

  async getBookingDetails(bookingId, userId, role) {
    let where = {};
    if (isNaN(Number(bookingId)) || String(bookingId).toUpperCase().startsWith("BK-")) {
      where.booking_code = bookingId;
    } else {
      where.id = bookingId;
    }

    if (!userId || role === "ADMIN") {
      // Direct lookup without user scope, or Admin access
    } else if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      const artistIds = artist ? [artist.id, Number(userId)] : [Number(userId)];
      where.artist_id = { [Op.in]: artistIds };
    } else if (userId) {
      // CUSTOMER / USER / CLIENT
      where.user_id = userId;
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
        },
        {
          model: db.Review,
          as: "review",
          required: false
        }
      ],
      order: [[{ model: db.BookingStatusHistory, as: "status_history" }, "createdAt", "DESC"]]
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const data = booking.toJSON ? booking.toJSON() : { ...booking };

    const isCheckInVerified =
      Boolean(booking.check_in_otp_verified) ||
      ["CUSTOMER_VERIFIED", "SERVICE_STARTED", "SERVICE_IN_PROGRESS", "IN_PROGRESS", "CHECKOUT", "COMPLETED"].includes(String(booking.detailed_status || booking.booking_status || "").toUpperCase());

    data.checkin_otp = isCheckInVerified ? null : (booking.check_in_otp || booking.checkin_otp);
    data.check_in_otp = data.checkin_otp;
    data.checkin_otp_verified = isCheckInVerified ? 1 : 0;
    data.check_in_otp_verified = isCheckInVerified;

    // If check-in is verified and service is in progress, ensure a valid 4-digit completion PIN is populated
    if (isCheckInVerified && booking.booking_status !== "COMPLETED" && booking.detailed_status !== "COMPLETED" && (!booking.check_out_otp || String(booking.check_out_otp).length !== 4)) {
      const autoOtp = generateSecure4DigitOtp();
      await booking.update({
        check_out_otp: autoOtp,
        check_out_otp_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        check_in_otp: null,
        check_in_otp_expires_at: null
      }).catch(() => {});
      data.check_out_otp = autoOtp;
      data.checkout_otp = autoOtp;
      data.completion_pin = autoOtp;
      data.completionPin = autoOtp;
    } else {
      data.checkout_otp = data.check_out_otp || data.checkout_otp || data.completion_pin;
      data.check_out_otp = data.checkout_otp;
      data.completion_pin = data.checkout_otp;
      data.completionPin = data.checkout_otp;
    }
    data.checkout_otp_verified = data.check_out_otp_verified !== undefined ? data.check_out_otp_verified : data.checkout_otp_verified;
    data.service_started_at = data.service_started_at || data.check_in_time;
    data.service_start_time = data.service_started_at;

    return data;
  }

  async getBookingHistory(userId, role) {
    let where = {};
    if (role === "ADMIN") {
      // Admins see all bookings
    } else if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      const artistIds = artist ? [artist.id, Number(userId)] : [Number(userId)];
      where.artist_id = { [Op.in]: artistIds };
    } else {
      // CUSTOMER / USER / CLIENT
      where.user_id = userId;
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    if (!razorpay_order_id) {
      throw new AppError("Missing required razorpay_order_id for payment verification", 400);
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

    const existingInvoice = await db.Invoice.findOne({ where: { booking_id: tx.booking_id } });
    if (!existingInvoice) {
      const invoiceNum = `INV-${bookingBefore?.booking_code || tx.booking_id}-${Date.now().toString().slice(-6)}`;
      await db.Invoice.create({
        booking_id: tx.booking_id,
        invoice_number: invoiceNum,
        invoice_url: `/payment/receipt/${tx.booking_id}`
      });
    }

    const booking = await db.Booking.findByPk(tx.booking_id);
    if (booking) {
      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        await db.Notification.create({
          user_id: artistProfile.user_id,
          title: "New Booking Request 🌸",
          message: `New advance-paid booking #${booking.booking_code} received! Tap to review and accept.`,
          type: "BOOKING_CREATED",
          data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id, bookingCode: booking.booking_code })
        });

        // Emit real-time booking event to the artist's socket room now that advance is paid
        try {
          const { getIO } = require("../sockets/socket");
          const io = getIO();
          io.to(artistProfile.user_id.toString()).emit("booking_created", {
            bookingId: booking.id,
            bookingCode: booking.booking_code
          });
        } catch (sockErr) {
          console.log("Socket emit soft error:", sockErr.message);
        }
      }

      await db.Notification.create({
        user_id: booking.user_id,
        title: "Advance Payment Verified ✨",
        message: `Your advance payment for Booking #${booking.booking_code} has been verified successfully. Your booking is confirmed!`,
        type: "PAYMENT_SUCCESS",
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

    const prevStatus = booking.detailed_status || booking.booking_status;
    const isCustomerAction = !role || ["CUSTOMER", "USER", "CLIENT"].includes(String(role).toUpperCase());

    if (role === "ADMIN") {
      // Admins are fully authorized
    } else if (isCustomerAction) {
      if (booking.user_id !== userId) {
        throw new AppError("Forbidden: You do not own this booking", 403);
      }
      if (["ARTIST_ACCEPTED", "ACCEPTED", "CONFIRMED", "ARTIST_ON_THE_WAY", "ARTIST_ARRIVED", "SERVICE_STARTED", "COMPLETED"].includes(newStatus)) {
        throw new AppError("Forbidden: Customers cannot trigger artist-specific status updates", 403);
      }
    } else if (role === "ARTIST") {
      const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (!artistProfile) {
        throw new AppError("Forbidden: Artist profile not found", 403);
      }
      if (artistProfile.verification_status !== "APPROVED") {
        throw new AppError("Forbidden: Only approved artists can accept or update bookings", 403);
      }
      if (booking.artist_id !== artistProfile.id && booking.artist_id !== userId) {
        throw new AppError("Forbidden: You are not the assigned artist for this booking", 403);
      }
    } else {
      throw new AppError("Forbidden: Invalid role for status update", 403);
    }

    // Terminal State Guards:
    if (booking.booking_status === "CANCELLED" || booking.detailed_status === "CANCELLED") {
      if (newStatus === "CANCELLED") {
        return await this.getBookingDetails(bookingId, userId, role); // Idempotent cancel
      }
      throw new AppError("Cannot modify a cancelled booking", 400);
    }

    if (booking.booking_status === "COMPLETED" || booking.detailed_status === "COMPLETED") {
      if (newStatus === "COMPLETED") {
        return await this.getBookingDetails(bookingId, userId, role); // Idempotent complete
      }
      throw new AppError("Cannot modify an already completed booking", 400);
    }

    // Idempotent Accept Guard:
    if (newStatus === "ARTIST_ACCEPTED" || newStatus === "ACCEPTED") {
      if (booking.detailed_status === "ARTIST_ACCEPTED") {
        return await this.getBookingDetails(bookingId, userId, role); // Idempotent accept
      }
      if (["ARTIST_ON_THE_WAY", "ARTIST_ARRIVED", "CUSTOMER_VERIFIED", "SERVICE_STARTED", "SERVICE_IN_PROGRESS", "CHECKOUT", "COMPLETED"].includes(booking.detailed_status)) {
        return await this.getBookingDetails(bookingId, userId, role); // Already advanced past acceptance
      }
    }

    // Idempotent On The Way Guard:
    if (newStatus === "ARTIST_ON_THE_WAY" || newStatus === "ON_THE_WAY") {
      if (booking.detailed_status === "ARTIST_ON_THE_WAY") {
        return await this.getBookingDetails(bookingId, userId, role); // Idempotent on the way
      }
      if (["ARTIST_ARRIVED", "CUSTOMER_VERIFIED", "SERVICE_STARTED", "SERVICE_IN_PROGRESS", "CHECKOUT", "COMPLETED"].includes(booking.detailed_status)) {
        return await this.getBookingDetails(bookingId, userId, role); // Already arrived or in progress
      }
      if (booking.detailed_status !== "ARTIST_ACCEPTED" && booking.booking_status !== "CONFIRMED") {
        throw new AppError("Booking must be accepted before starting travel", 400);
      }
    }

    // Completion State Pre-condition Guard:
    if (newStatus === "COMPLETED") {
      const validCompletionStatuses = [
        "CUSTOMER_VERIFIED",
        "SERVICE_STARTED",
        "SERVICE_IN_PROGRESS",
        "IN_PROGRESS",
        "CHECKOUT",
        "AWAITING_CASH_CONFIRMATION"
      ];
      if (!validCompletionStatuses.includes(booking.detailed_status)) {
        throw new AppError("Cannot complete service before it is in progress", 400);
      }
    }

    const updates = {
      detailed_status: newStatus
    };

    // Geofence & Arrival Guard:
    if (newStatus === "ARTIST_ARRIVED" || newStatus === "ARRIVED") {
      if (booking.detailed_status === "ARTIST_ARRIVED") {
        return await this.getBookingDetails(bookingId, userId, role); // Idempotent arrived
      }
      if (["CUSTOMER_VERIFIED", "SERVICE_STARTED", "SERVICE_IN_PROGRESS", "CHECKOUT", "COMPLETED"].includes(booking.detailed_status)) {
        return await this.getBookingDetails(bookingId, userId, role); // Already verified/in progress
      }
      if (booking.detailed_status !== "ARTIST_ON_THE_WAY") {
        throw new AppError("Artist must start travel and be on the way before marking arrival", 400);
      }

      // 1. Customer destination coordinates
      const custLat = booking.latitude;
      const custLng = booking.longitude;
      if (custLat === undefined || custLng === undefined || custLat === null || custLng === null || isNaN(Number(custLat)) || isNaN(Number(custLng))) {
        throw new AppError("Customer booking destination coordinates not found for this booking", 400);
      }

      // 2. Artist device coordinates (from extraData or Redis)
      let artLat = extraData.latitude !== undefined && extraData.latitude !== null ? Number(extraData.latitude) : null;
      let artLng = extraData.longitude !== undefined && extraData.longitude !== null ? Number(extraData.longitude) : null;

      if (artLat === null || artLng === null || isNaN(artLat) || isNaN(artLng)) {
        try {
          const { client: redisClient } = require("../config/redis");
          if (redisClient && (redisClient.isOpen || redisClient.isReady)) {
            const loc = await redisClient.hGetAll(`artist:location:${bookingId}`);
            if (loc && loc.latitude && loc.longitude) {
              if (loc.updatedAt && (Date.now() - new Date(loc.updatedAt).getTime() > 15 * 60 * 1000)) {
                throw new AppError("Artist GPS location is stale. Please submit a live GPS update from your device.", 400);
              }
              artLat = Number(loc.latitude);
              artLng = Number(loc.longitude);
            }
          }
        } catch (rErr) {
          if (rErr instanceof AppError) throw rErr;
          console.warn("Redis check for arrival location failed:", rErr.message);
        }
      }

      if (artLat === null || artLng === null || isNaN(artLat) || isNaN(artLng)) {
        throw new AppError("Artist GPS location is required to verify arrival. Please enable GPS on your device.", 400);
      }

      // 3. Compute Distance & Check Arrival Radius
      const distanceMeters = calculateDistanceInMeters(artLat, artLng, custLat, custLng);
      const ARRIVAL_RADIUS_METERS = Number(process.env.ARRIVAL_RADIUS_METERS) || 1000;

      if (extraData?.force !== true && extraData?.force_arrival !== true && distanceMeters !== null && custLat && custLng && distanceMeters > ARRIVAL_RADIUS_METERS) {
        throw new AppError(`You are still ${Math.round(distanceMeters || 999)} meters away from the customer location. Arrival can only be confirmed within ${ARRIVAL_RADIUS_METERS} meters.`, 400);
      }

      // Arrival Verified!
      updates.detailed_status = "ARTIST_ARRIVED";
      updates.arrival_verified_at = new Date();

      // Auto-generate check-in OTP for customer
      const checkInOtp = booking.check_in_otp || generateSecure4DigitOtp();
      updates.check_in_otp = checkInOtp;
      updates.check_in_otp_expires_at = new Date(Date.now() + 15 * 60 * 1000);
      updates.check_in_otp_verified = false;
    }

    if (newStatus === "CANCELLED" || newStatus === "REJECTED" || newStatus === "ARTIST_REJECTED") {
      updates.booking_status = "CANCELLED";
      updates.detailed_status = (newStatus === "REJECTED" || newStatus === "ARTIST_REJECTED") ? "REJECTED" : "CANCELLED";
      updates.cancel_reason = extraData.cancelReason || extraData.rejectReason || extraData.reason || (newStatus.includes("REJECT") ? "Rejected by artist" : "Cancelled by user");

      // Free slot again
      if (booking.slot_id) {
        await db.AvailabilitySlot.update(
          { is_booked: false },
          { where: { id: booking.slot_id } }
        );
      }

      // If advance was paid, process 100% refund on artist/admin cancellation
      const advancePaid = Number(booking.advance_paid || 0);
      if (advancePaid > 0 || booking.payment_status === "PAID") {
        updates.payment_status = "REFUNDED";
        updates.refund_amount = advancePaid;
        try {
          await db.Refund.create({
            booking_id: booking.id,
            amount: advancePaid,
            status: "PROCESSED",
            reason: `Refund for booking cancelled by ${role || 'system'}: ${extraData.cancelReason || 'Booking rejected by artist'}`
          });
        } catch (refErr) {
          console.error("Error creating Refund on rejection/cancellation:", refErr.message);
        }
      }

      try {
        const escrow = await db.EscrowRecord.findOne({ where: { booking_id: bookingId, status: "HELD" } });
        if (escrow) {
          const artistProfile = await db.ArtistProfile.findByPk(updates.artist_id || booking.artist_id);
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
        const cashTxId = `txn_cash_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await db.Transaction.create({
          user_id: booking.user_id,
          booking_id: booking.id,
          transaction_id: cashTxId,
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
    } else if (newStatus === "ARTIST_ACCEPTED" || newStatus === "ACCEPTED" || newStatus === "CONFIRMED") {
      updates.booking_status = "CONFIRMED";
      updates.detailed_status = "ARTIST_ACCEPTED";
      if (booking.slot_id) {
        await db.AvailabilitySlot.update(
          { is_booked: true },
          { where: { id: booking.slot_id } }
        );
      }
    } else if (newStatus === "ARTIST_ON_THE_WAY" || newStatus === "ON_THE_WAY") {
      updates.booking_status = "CONFIRMED";
      updates.detailed_status = "ARTIST_ON_THE_WAY";
    } else if (newStatus === "ARTIST_ARRIVED" || newStatus === "ARRIVED") {
      updates.booking_status = "CONFIRMED";
      updates.detailed_status = "ARTIST_ARRIVED";
      updates.arrival_verified_at = new Date();
      const checkInOtp = booking.check_in_otp || generateSecure4DigitOtp();
      updates.check_in_otp = checkInOtp;
      updates.check_in_otp_expires_at = new Date(Date.now() + 15 * 60 * 1000);
      updates.check_in_otp_verified = false;
    } else if (newStatus === "SERVICE_STARTED" || newStatus === "SERVICE_IN_PROGRESS" || newStatus === "CUSTOMER_VERIFIED") {
      if (booking.detailed_status === "CUSTOMER_VERIFIED" || booking.detailed_status === "SERVICE_STARTED" || booking.detailed_status === "SERVICE_IN_PROGRESS") {
        return await this.getBookingDetails(bookingId, userId, role); // Idempotent service start
      }
      if (!booking.check_in_otp_verified && booking.detailed_status !== "CUSTOMER_VERIFIED") {
        throw new AppError("Check-In OTP verification is required before starting the service.", 400);
      }
      updates.booking_status = "CONFIRMED";
      updates.detailed_status = "CUSTOMER_VERIFIED";
      const startTimestamp = new Date();
      if (!booking.check_in_time) updates.check_in_time = startTimestamp;
      if (!booking.service_started_at) updates.service_started_at = startTimestamp;
    }

    if (newStatus === "RESCHEDULED") {
      updates.reschedule_date = extraData.date;
      updates.reschedule_time = extraData.time;
    }

    await booking.update(updates);

    await db.BookingStatusHistory.create({
      booking_id: bookingId,
      status: updates.detailed_status || newStatus,
      changed_by: userId,
      notes: extraData.cancelReason || extraData.notes || `Booking status updated from ${prevStatus} to ${newStatus}`
    });

    const userToNotify = isCustomerAction
      ? (await db.ArtistProfile.findByPk(updates.artist_id || booking.artist_id))?.user_id
      : booking.user_id;

    if (userToNotify) {
      let notificationTitle = `Booking Update: ${newStatus}`;
      let notificationMessage = `Booking #${booking.booking_code} status has been updated to ${newStatus}`;
      let notificationType = "SYSTEM";
      let notificationData = { bookingId: booking.id, booking_id: booking.id };

      if (newStatus === "ARTIST_ACCEPTED" || newStatus === "ACCEPTED") {
        const targetArtistId = updates.artist_id || booking.artist_id;
        const artist = targetArtistId ? await db.ArtistProfile.findOne({
          where: { id: targetArtistId },
          include: [{ model: db.User, as: "user", attributes: ["name"] }]
        }) : null;
        const artistName = artist?.user?.name || "The artist";
        notificationTitle = "Booking Accepted 🎉";
        notificationMessage = `${artistName} has accepted your booking #${booking.booking_code}!`;
        notificationType = "BOOKING";
        notificationData = {
          type: "booking",
          event: "booking_accepted",
          bookingId: booking.id,
          booking_id: booking.id
        };
      } else if (newStatus === "ARTIST_ON_THE_WAY" || newStatus === "ON_THE_WAY") {
        notificationTitle = "Artist is On The Way! 🚗";
        notificationMessage = `Your Mehndi artist has started travelling to your location.`;
        notificationType = "BOOKING";
        notificationData = {
          type: "booking",
          event: "artist_on_the_way",
          bookingId: booking.id,
          booking_id: booking.id
        };
      } else if (newStatus === "ARTIST_ARRIVED" || newStatus === "ARRIVED") {
        notificationTitle = "Artist Has Arrived! 📍";
        notificationMessage = `Your Mehndi artist has arrived at your location. Please share your Check-In PIN to begin.`;
        notificationType = "BOOKING";
        notificationData = {
          type: "booking",
          event: "artist_arrived",
          bookingId: booking.id,
          booking_id: booking.id
        };
      } else if ((newStatus === "CANCELLED" || newStatus === "REJECTED" || newStatus === "ARTIST_REJECTED") && !isCustomerAction) {
        const artist = await db.ArtistProfile.findOne({
          where: { id: updates.artist_id || booking.artist_id },
          include: [{ model: db.User, as: "user", attributes: ["name"] }]
        });
        const artistName = artist?.user?.name || "The artist";
        const reasonText = extraData.cancelReason || extraData.rejectReason || extraData.reason || "Declined by artist";

        notificationTitle = "Booking Declined";
        notificationMessage = `Your booking request #${booking.booking_code} was declined by the artist: ${reasonText}. Any advance payment has been refunded.`;
        notificationType = "BOOKING";

        notificationData = {
          bookingId: booking.id,
          booking_id: booking.id,
          artistId: updates.artist_id || booking.artist_id,
          artistName: artistName,
          bookingDate: booking.slot_id ? (await db.AvailabilitySlot.findByPk(booking.slot_id))?.start_time : null,
          paymentStatus: updates.payment_status || booking.payment_status,
          rejectionReason: reasonText
        };
      }

      await db.Notification.create({
        user_id: userToNotify,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        data: JSON.stringify(notificationData)
      });

      // Socket.io real-time update
      try {
        const { getIO } = require("../sockets/socket");
        const io = getIO();
        if (io) {
          io.to(userToNotify.toString()).emit("booking_status_updated", {
            bookingId: booking.id,
            bookingCode: booking.booking_code,
            booking_status: updates.booking_status || booking.booking_status,
            detailed_status: updates.detailed_status || newStatus,
            status: updates.detailed_status || newStatus,
            payment_status: updates.payment_status || booking.payment_status,
            timestamp: new Date()
          });
          io.to(`booking_room_${booking.id}`).emit("booking_status_updated", {
            bookingId: booking.id,
            bookingCode: booking.booking_code,
            booking_status: updates.booking_status || booking.booking_status,
            detailed_status: updates.detailed_status || newStatus,
            status: updates.detailed_status || newStatus,
            payment_status: updates.payment_status || booking.payment_status,
            timestamp: new Date()
          });
        }
      } catch (sockErr) {
        console.log("Socket emit skipped in updateBookingStatus:", sockErr.message);
      }
    }

    return await this.getBookingDetails(bookingId, userId, role);
  }

  async getInvoice(bookingId, userId, role) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (userId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      const isCustomer = Number(booking.user_id) === Number(userId);
      const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      const isArtist = artistProfile && Number(booking.artist_id) === Number(artistProfile.id);
      if (!isCustomer && !isArtist) {
        throw new AppError("Forbidden: Unauthorized access to booking invoice", 403);
      }
    }

    let invoice = await db.Invoice.findOne({
      where: { booking_id: bookingId }
    });
    if (!invoice) {
      if (booking.payment_status === "PAID" || booking.payment_status === "SUCCESS" || booking.payment_status === "PARTIAL" || booking.booking_status === "COMPLETED") {
        const invoiceNum = `INV-${booking.booking_code || booking.id}-${Date.now().toString().slice(-6)}`;
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

    const isCheckoutStage = booking.booking_status === "PENDING" || booking.detailed_status === "PENDING_PAYMENT" || booking.detailed_status === "PENDING";
    const targetBookingStatus = isCheckoutStage ? "PENDING" : "COMPLETED";
    const targetDetailedStatus = isCheckoutStage ? "PENDING_ARTIST_CONFIRMATION" : "AWAITING_CASH_CONFIRMATION";

    await booking.update({
      booking_status: targetBookingStatus,
      detailed_status: targetDetailedStatus,
      payment_mode: "CASH"
    });

    await db.BookingStatusHistory.create({
      booking_id: bookingId,
      status: targetDetailedStatus,
      changed_by: userId,
      notes: isCheckoutStage ? "Customer requested Cash on Arrival booking." : "Customer selected Cash Payment method upon service completion."
    });

    const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
    if (artistProfile) {
      await db.Notification.create({
        user_id: artistProfile.user_id,
        title: isCheckoutStage ? "New Cash Booking Request 💵" : "Cash Payment Approval Required",
        message: isCheckoutStage 
          ? `Customer selected Cash on Arrival for booking #${booking.booking_code || booking.id}. Please confirm request.`
          : "Customer has marked this booking as Cash Payment. Please approve or reject the payment.",
        type: isCheckoutStage ? "NEW_BOOKING_REQUEST" : "PAYMENT",
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

    const totalAmount = Number(booking.final_amount || booking.total_price || 0);
    const advancePaid = Number(booking.advance_paid || 0);
    const commissionSetting = await db.SystemSetting.findOne({ where: { key: "COMMISSION_PERCENTAGE" } });
    const commissionPercentage = commissionSetting ? parseInt(commissionSetting.value) : 10;
    const totalCommissionDue = Math.round(totalAmount * (commissionPercentage / 100));
    const artistAmount = totalAmount - totalCommissionDue;

    // Calculate uncollected commission (since 10% advance was already paid online by customer and credited to platform)
    const uncollectedCommission = Math.max(0, totalCommissionDue - advancePaid);
    const surplusAdvanceToArtist = Math.max(0, advancePaid - totalCommissionDue);

    // 1. Process Admin Wallet Commission only for uncollected portion
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

    if (uncollectedCommission > 0) {
      const [adminWallet] = await db.Wallet.findOrCreate({
        where: { user_id: adminUser.id },
        defaults: { balance: 0, pending_balance: 0, lifetime_earnings: 0, total_commission_earned: 0, total_withdrawals: 0 }
      });
      await adminWallet.increment({
        balance: uncollectedCommission,
        total_commission_earned: uncollectedCommission,
        lifetime_earnings: uncollectedCommission
      });

      await db.WalletTransaction.create({
        wallet_id: adminWallet.id,
        booking_id: booking.id,
        transaction_type: "COMMISSION",
        amount: uncollectedCommission,
        status: "SUCCESS",
        description: `Remaining commission from cash booking #${booking.booking_code}`
      });
    }

    // 2. Process Artist Wallet:
    // Update lifetime earnings by the artist net amount.
    // Only debit if there was uncollected commission; credit surplus advance if advance exceeded commission.
    const [artistWallet] = await db.Wallet.findOrCreate({
      where: { user_id: artistUserId },
      defaults: { balance: 0, available_balance: 0, pending_balance: 0, lifetime_earnings: 0, total_commission_earned: 0, total_withdrawals: 0 }
    });

    if (uncollectedCommission > 0) {
      await artistWallet.decrement("balance", { by: uncollectedCommission });
      if (artistWallet.available_balance !== undefined) {
        await artistWallet.decrement("available_balance", { by: uncollectedCommission });
      }
      await db.WalletTransaction.create({
        wallet_id: artistWallet.id,
        booking_id: booking.id,
        transaction_type: "COMMISSION",
        amount: uncollectedCommission,
        status: "SUCCESS",
        description: `Platform commission balance debited for cash booking #${booking.booking_code}`
      });
    } else if (surplusAdvanceToArtist > 0) {
      await artistWallet.increment("balance", { by: surplusAdvanceToArtist });
      if (artistWallet.available_balance !== undefined) {
        await artistWallet.increment("available_balance", { by: surplusAdvanceToArtist });
      }
      await db.WalletTransaction.create({
        wallet_id: artistWallet.id,
        booking_id: booking.id,
        transaction_type: "SETTLEMENT",
        amount: surplusAdvanceToArtist,
        status: "SUCCESS",
        description: `Advance surplus payout for booking #${booking.booking_code}`
      });
    }

    await artistWallet.increment("lifetime_earnings", { by: artistAmount });

    // 3. Update payment and booking statuses
    const payment = await db.Payment.findOne({ where: { booking_id: bookingId } });
    if (payment) {
      await payment.update({ status: "SUCCESS", paid_at: new Date() });
    }

    await booking.update({
      payment_status: "PAID",
      booking_status: "COMPLETED",
      detailed_status: "COMPLETED",
      remaining_amount: 0,
      remaining_paid_at: new Date()
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
      commission_amount: totalCommissionDue,
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

    if (booking.check_in_otp_verified || ["CUSTOMER_VERIFIED", "SERVICE_STARTED", "SERVICE_IN_PROGRESS", "IN_PROGRESS", "CHECKOUT", "COMPLETED"].includes(booking.detailed_status)) {
      throw new AppError("Check-In has already been verified and locked. Service is in progress.", 400);
    }

    if (booking.detailed_status !== "ARTIST_ARRIVED") {
      throw new AppError("Check-In OTP can only be generated after the artist has arrived at the customer location", 400);
    }

    // 60-second resend cooldown
    if (booking.check_in_otp_expires_at) {
      const expiresAtMs = new Date(booking.check_in_otp_expires_at).getTime();
      const remainingMs = expiresAtMs - Date.now();
      if (remainingMs > 4 * 60 * 1000 && remainingMs <= 5 * 60 * 1000) {
        const secondsRemaining = Math.ceil((remainingMs - 4 * 60 * 1000) / 1000);
        throw new AppError(`Please wait ${secondsRemaining} seconds before requesting a new OTP.`, 429);
      }
    }

    // Reset failed verification attempts
    checkInFailedAttempts.delete(booking.id);

    const otp = generateSecure4DigitOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    const updates = {
      check_in_otp: otp,
      check_in_otp_expires_at: expiresAt,
      check_in_otp_verified: false
    };

    await booking.update(updates);

    console.log(`[CHECK_IN_OTP] OTP Generated successfully. Booking ID: ${booking.id}, Customer Email: ${booking.user?.email || "N/A"}`);

    // Send via Email SMTP to Customer's registered email
    // Send via Email SMTP to Customer's registered email
    let customerUser = booking.user;
    if (!customerUser) {
      customerUser = await db.User.findByPk(booking.customer_id || booking.user_id).catch(() => null);
    }
    const customerEmail = customerUser?.email || booking.customer_email || booking.email;
    const customerName = customerUser?.name || customerUser?.full_name || "Valued Customer";

    let emailResult = null;
    if (customerEmail) {
      console.log(`[CHECK_IN_OTP] Sending Email request to: ${customerEmail} for Booking ID: ${booking.id}`);
      const { sendEmail } = require("../utils/mail.service");
      const bookingTag = booking.booking_code ? `#${booking.booking_code}` : `#${booking.id}`;
      emailResult = await sendEmail(
        customerEmail,
        `Your MehndiGo Check-In PIN - ${bookingTag}`,
        `Hello ${customerName},\n\nYour artist has arrived! Your 4-digit Doorstep Check-In PIN is: ${otp}\n\nPlease share this 4-digit PIN with your Mehndi Specialist upon arrival to verify their identity and start the service.\n\nBooking: ${bookingTag}\nSecurity Notice: Do not share this code online or over phone. Only share in-person when the specialist is at your doorstep.\n\nBest regards,\nMehndiGo Team`
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

    // Artist Authorization Guard
    if (userId) {
      const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      const artistIds = artistProfile ? [artistProfile.id, Number(userId)] : [Number(userId)];
      if (!artistIds.includes(Number(booking.artist_id))) {
        throw new AppError("Forbidden: Only the assigned artist can verify the Check-In OTP", 403);
      }
    }

    if (booking.detailed_status === "CUSTOMER_VERIFIED" || booking.detailed_status === "SERVICE_STARTED" || booking.detailed_status === "SERVICE_IN_PROGRESS" || booking.detailed_status === "COMPLETED") {
      return { success: true, booking }; // Idempotent check-in
    }

    if (booking.detailed_status !== "ARTIST_ARRIVED") {
      throw new AppError("Check-In OTP can only be verified after the artist has arrived at the customer location", 400);
    }

    const attempts = (checkInFailedAttempts.get(booking.id) || 0) + 1;
    checkInFailedAttempts.set(booking.id, attempts);

    const inputOtp = String(otp || "").trim();
    const storedOtp = String(booking.check_in_otp || "").trim();
    const isExpired = booking.check_in_otp_expires_at && new Date() > new Date(booking.check_in_otp_expires_at);

    if (!storedOtp || inputOtp !== storedOtp || isExpired) {
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

    const startTime = new Date();
    let checkOutOtp = booking.check_out_otp;
    if (!checkOutOtp || String(checkOutOtp).length !== 4) {
      checkOutOtp = generateSecure4DigitOtp();
    }
    const checkOutExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await booking.update({
      booking_status: "CONFIRMED",
      detailed_status: "CUSTOMER_VERIFIED",
      check_in_otp_verified: true,
      check_in_time: startTime,
      service_started_at: startTime,
      check_in_otp: null,
      check_in_otp_expires_at: null,
      check_out_otp: checkOutOtp,
      check_out_otp_expires_at: checkOutExpiresAt,
      check_out_otp_verified: false
    });

    await db.BookingStatusHistory.create({
      booking_id: booking.id,
      status: "CUSTOMER_VERIFIED",
      changed_by: userId,
      notes: "Check-In OTP verified successfully. Customer identity confirmed — artist may now begin service."
    });

    // Send Completion PIN directly to customer's email
    if (booking.user && booking.user.email && checkOutOtp) {
      try {
        const { sendEmail } = require("../utils/mail.service");
        const bookingTag = booking.booking_code ? `#${booking.booking_code}` : `#${booking.id}`;
        await sendEmail(
          booking.user.email,
          `Your MehndiGo Service Completion PIN - ${bookingTag}`,
          `Hello ${booking.user.name || "Valued Customer"},\n\nYour Mehndi service has started for booking ${bookingTag}. Your 4-digit Service Completion PIN is: ${checkOutOtp}.\n\nPlease share this 4-digit PIN with your artist ONLY after your mehndi application is completely finished to verify completion.\n\nBest regards,\nMehndiGo Team`
        ).catch((err) => console.log("[Check-out email notice]:", err.message));
      } catch (_) { }
    }

    // Notify customer and artist
    try {
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Service Started! 💅",
        message: `Your Mehndi service has officially started. Your Completion PIN has been sent to your email.`,
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

      // Emit realtime socket event to customer and booking room
      const { getIO } = require("../sockets/socket");
      const io = getIO();
      const eventPayload = {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CONFIRMED",
        detailed_status: "CUSTOMER_VERIFIED",
        status: "CUSTOMER_VERIFIED",
        serviceStartedAt: startTime,
        service_started_at: startTime,
        timestamp: startTime
      };

      io.to(booking.user_id.toString()).emit("booking_status_updated", eventPayload);
      io.to(booking.user_id.toString()).emit("service_started", eventPayload);
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", eventPayload);
      io.to(`booking_room_${booking.id}`).emit("service_started", eventPayload);

      // Also notify the artist
      const artistProfile2 = await db.ArtistProfile.findByPk(booking.artist_id).catch(() => null);
      if (artistProfile2) {
        io.to(artistProfile2.user_id.toString()).emit("booking_status_updated", eventPayload);
        io.to(artistProfile2.user_id.toString()).emit("service_started", eventPayload);
      }
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

    // Authorization Guard: Either Assigned Artist or Booking Customer or Admin
    if (userId) {
      const isCustomer = Number(userId) === Number(booking.user_id) || Number(userId) === Number(booking.customer_id);
      let isArtist = false;
      if (!isCustomer) {
        const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: userId } });
        const artistIds = artistProfile ? [artistProfile.id, Number(userId)] : [Number(userId)];
        isArtist = artistIds.includes(Number(booking.artist_id));
      }
      if (!isCustomer && !isArtist) {
        throw new AppError("Forbidden: Only the assigned artist or customer can initiate Check-Out OTP generation", 403);
      }
    }

    // In-Progress State Pre-condition Guard
    const validCheckoutStatuses = [
      "CUSTOMER_VERIFIED",
      "SERVICE_STARTED",
      "SERVICE_IN_PROGRESS",
      "IN_PROGRESS",
      "CHECKOUT",
      
      "AWAITING_CASH_CONFIRMATION"
    ];
    if (!validCheckoutStatuses.includes(booking.detailed_status)) {
      throw new AppError("Check-Out OTP can only be generated while the service is in progress", 400);
    }

    // 60-second resend cooldown
    if (booking.check_out_otp_expires_at) {
      const expiresAtMs = new Date(booking.check_out_otp_expires_at).getTime();
      const remainingMs = expiresAtMs - Date.now();
      if (remainingMs > 4 * 60 * 1000 && remainingMs <= 5 * 60 * 1000) {
        const secondsRemaining = Math.ceil((remainingMs - 4 * 60 * 1000) / 1000);
        throw new AppError(`Please wait ${secondsRemaining} seconds before requesting a new OTP.`, 429);
      }
    }

    // Reset failed verification attempts
    checkOutFailedAttempts.delete(booking.id);

    // Generate a DISTINCT 4-digit Check-Out OTP
    let otp = generateSecure4DigitOtp();
    if (booking.check_in_otp && otp === String(booking.check_in_otp)) {
      otp = generateSecure4DigitOtp();
    }
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await booking.update({
      check_out_otp: otp,
      check_out_otp_expires_at: expiresAt,
      check_out_otp_verified: false,
      detailed_status: "CHECKOUT"
    });

    console.log(`[CHECK_OUT_OTP] OTP Generated successfully. Booking ID: ${booking.id}, Customer Email: ${booking.user?.email || "N/A"}`);

    // Send via Email SMTP to Customer's registered email
    let customerUser = booking.user;
    if (!customerUser) {
      customerUser = await db.User.findByPk(booking.customer_id || booking.user_id).catch(() => null);
    }
    const customerEmail = customerUser?.email || booking.customer_email || booking.email;
    const customerName = customerUser?.name || customerUser?.full_name || "Valued Customer";

    let emailResult = null;
    if (customerEmail) {
      console.log(`[CHECK_OUT_OTP] Sending Email request to: ${customerEmail} for Booking ID: ${booking.id}`);
      const { sendEmail } = require("../utils/mail.service");
      const bookingTag = booking.booking_code ? `#${booking.booking_code}` : `#${booking.id}`;
      emailResult = await sendEmail(
        customerEmail,
        `Your MehndiGo Service Completion PIN - ${bookingTag}`,
        `Hello ${customerName},\n\nYour Mehndi session for booking ${bookingTag} has finished. Your 4-digit Service Completion PIN is: ${otp}.\n\nPlease share this 4-digit Completion PIN with your Mehndi Specialist only after you are completely satisfied with the finished service to finalize the booking.\n\nBest regards,\nMehndiGo Team`
      );
    }

    // Create system notification for client
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

      // Emit realtime socket event to customer and booking room
      const { getIO } = require("../sockets/socket");
      const io = getIO();
      const statusPayload = {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: booking.booking_status,
        detailed_status: "CHECKOUT",
        status: "CHECKOUT",
        checkout_otp: otp,
        timestamp: new Date()
      };
      io.to(booking.user_id.toString()).emit("checkout_otp_received", {
        bookingId: booking.id,
        checkout_otp: otp,
        message: "Your service has been completed. Please share the OTP sent to your registered mobile number."
      });
      io.to(booking.user_id.toString()).emit("booking_status_updated", statusPayload);
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", statusPayload);
    } catch (err) {
      console.error("Error dispatching Check-Out OTP notifications:", err.message);
    }

    return { success: true, otp };
  }

  async verifyCheckOutOtp(bookingId, otp, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // 1. Assigned Artist Authorization Guard
    if (userId) {
      const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      const artistIds = artistProfile ? [artistProfile.id, Number(userId)] : [Number(userId)];
      if (!artistIds.includes(Number(booking.artist_id))) {
        throw new AppError("Forbidden: Only the assigned artist can verify the Check-Out OTP", 403);
      }
    }

    // 2. Idempotent check
    if (booking.detailed_status === "COMPLETED" || booking.booking_status === "COMPLETED") {
      return { success: true, booking };
    }

    // 3. Pre-condition Guard: Must be in progress
    const validCheckoutStatuses = [
      "CUSTOMER_VERIFIED",
      "SERVICE_STARTED",
      "SERVICE_IN_PROGRESS",
      "IN_PROGRESS",
      "CHECKOUT",
      "AWAITING_CASH_CONFIRMATION"
    ];
    if (!validCheckoutStatuses.includes(booking.detailed_status)) {
      throw new AppError("Cannot complete checkout before service is in progress", 400);
    }

    // 4. Rate Limiting & Attempt Tracker
    const attempts = (checkOutFailedAttempts.get(booking.id) || 0) + 1;
    checkOutFailedAttempts.set(booking.id, attempts);

    const inputOtp = String(otp || "").trim();
    const storedOtp = String(booking.check_out_otp || booking.checkout_otp || "").trim();
    const isExpired = booking.check_out_otp_expires_at && new Date() > new Date(booking.check_out_otp_expires_at);

    // Explicit Rule: Check-In OTP CANNOT be used as Checkout OTP
    if (booking.check_in_otp && inputOtp === String(booking.check_in_otp).trim()) {
      throw new AppError("Invalid OTP: Check-In OTP cannot be used for Check-Out. Please ask the customer for their distinct Check-Out OTP.", 400);
    }

    if (!storedOtp || inputOtp !== storedOtp || isExpired) {
      console.log(`[CHECK_OUT_OTP_VERIFY] Verification Status: FAILED. Booking ID: ${booking.id}, Attempt: ${attempts}/3, Reason: Invalid or expired OTP`);
      if (attempts >= 3) {
        await booking.update({
          check_out_otp: null,
          check_out_otp_expires_at: null
        });
        checkOutFailedAttempts.delete(booking.id);
        throw new AppError("Too many incorrect attempts. Please request a new Check-Out OTP.", 400);
      }
      throw new AppError("Invalid or expired Check-Out OTP", 400);
    }

    console.log(`[CHECK_OUT_OTP_VERIFY] Verification Status: SUCCESS. Booking ID: ${booking.id}`);
    checkOutFailedAttempts.delete(booking.id);

    const completionTime = new Date();
    let serviceDurationMins = 60;
    if (booking.service_started_at || booking.check_in_time) {
      const startMs = new Date(booking.service_started_at || booking.check_in_time).getTime();
      serviceDurationMins = Math.max(1, Math.round((completionTime.getTime() - startMs) / 60000));
    }

    // Atomic completion update
    await booking.update({
      booking_status: "COMPLETED",
      detailed_status: "COMPLETED",
      payment_status: "PAID",
      check_out_otp_verified: true,
      check_out_time: completionTime,
      service_duration: serviceDurationMins,
      check_out_otp: null,
      check_out_otp_expires_at: null,
      remaining_amount: 0,
      remaining_paid_at: completionTime
    });

    await db.BookingStatusHistory.create({
      booking_id: booking.id,
      status: "COMPLETED",
      changed_by: userId,
      notes: "Check-Out OTP verified successfully. Mehndi service completed and settled."
    });

    // Invoke payment settlement
    const PaymentService = require("./payment.services");
    try {
      await PaymentService.completeBookingSettlement(booking.id);
    } catch (settleErr) {
      console.error("Error in completeBookingSettlement:", settleErr.message);
    }

    // Ensure Invoice exists
    try {
      const existingInvoice = await db.Invoice.findOne({ where: { booking_id: booking.id } });
      if (!existingInvoice) {
        const invoiceNum = `INV-${Date.now()}`;
        await db.Invoice.create({
          booking_id: booking.id,
          invoice_number: invoiceNum,
          invoice_url: `/payment/receipt/${booking.id}`
        });
      }
    } catch (invErr) {
      console.error("Error generating invoice on checkout completion:", invErr.message);
    }

    // Award XP and Milestone rewards
    try {
      const xpService = require("./xp.services");
      await xpService.awardXp(booking.user_id, 100, "Booking Service Completed", booking.id);
      if (booking.artist_id) {
        const artist = await db.ArtistProfile.findByPk(booking.artist_id);
        if (artist) {
          await xpService.awardXp(artist.user_id, 100, "Booking Work Completed", booking.id);
          await xpService.evaluateArtistMilestone(artist.user_id);
        }
      }
    } catch (xpErr) {
      console.error("Error awarding XP on completion:", xpErr.message);
    }

    // Real-Time Socket Events & Push Notifications
    try {
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Booking Completed 🎉",
        message: `Your Mehndi service for booking #${booking.booking_code} has been completed. You can now leave a review!`,
        type: "BOOKING",
        data: {
          type: "booking",
          event: "booking_completed",
          bookingId: booking.id
        }
      });

      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        await db.Notification.create({
          user_id: artistProfile.user_id,
          title: "Service Completed! 🎉",
          message: `Booking #${booking.booking_code} has been successfully completed and settled.`,
          type: "BOOKING",
          data: {
            type: "booking",
            event: "booking_completed",
            bookingId: booking.id
          }
        });
      }

      const { getIO } = require("../sockets/socket");
      const io = getIO();
      const eventPayload = {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "COMPLETED",
        detailed_status: "COMPLETED",
        status: "COMPLETED",
        completedAt: completionTime,
        timestamp: completionTime
      };

      io.to(booking.user_id.toString()).emit("booking_status_updated", eventPayload);
      io.to(booking.user_id.toString()).emit("booking_completed", eventPayload);
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", eventPayload);
      io.to(`booking_room_${booking.id}`).emit("booking_completed", eventPayload);

      if (artistProfile) {
        io.to(artistProfile.user_id.toString()).emit("booking_status_updated", eventPayload);
        io.to(artistProfile.user_id.toString()).emit("booking_completed", eventPayload);
      }
    } catch (notifErr) {
      console.error("Error dispatching completion notifications:", notifErr.message);
    }

    return { success: true, booking };
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

    const isCustomerAction = !role || ["CUSTOMER", "USER", "CLIENT"].includes(String(role).toUpperCase());
    if (role === "ADMIN") {
      // Admins authorized
    } else if (isCustomerAction) {
      if (booking.user_id !== userId) {
        throw new AppError("Forbidden: You do not own this booking", 403);
      }
    } else if (role === "ARTIST") {
      const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (!artistProfile || (booking.artist_id !== artistProfile.id && booking.artist_id !== userId)) {
        throw new AppError("Forbidden: You are not the assigned artist for this booking", 403);
      }
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

    if (isCustomerAction) {
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
          defaults: { balance: 0, pending_balance: 0 }
        });
        await userWallet.increment("balance", { by: refundAmount });

        const ledgerService = require("./ledger.services");
        await ledgerService.recordEntry({
          userId: booking.user_id,
          walletId: userWallet.id,
          bookingId: booking.id,
          entryType: "REFUND",
          amount: refundAmount,
          balanceAfter: userWallet.balance,
          referenceId: `REFUND-BOOKING-${booking.id}`,
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
}

module.exports = new BookingService();

