const {
  ArtistProfileRepository,
  UserRepository,
  ServiceRepository,
  AvailabilitySlotRepository,
  PortfolioRepository,
  BookingRepository,
  PaymentRepository,
  ReviewRepository,
  NotificationRepository,
  MessageRepository,
} = require("../repositories");

const AppError = require("../utils/errors/app.error");
const razorpayUtil = require("../utils/razorpay");
const { getIO } = require("../sockets/socket");
const db = require("../models");
const { Op } = require("sequelize");

const ArtistProfileRepositor = new ArtistProfileRepository();
const UserRepositor = new UserRepository();
const ServiceRepositor = new ServiceRepository();
const SlotRepositor = new AvailabilitySlotRepository();
const PortfolioRepositor = new PortfolioRepository();
const BookingRepositor = new BookingRepository();
const PaymentRepositor = new PaymentRepository();
const ReviewRepositor = new ReviewRepository();
const NotificationRepositor = new NotificationRepository();

const crypto = require("crypto");

class ArtistService {
  async createArtistProfile(data) {
    const { user_id } = data;

    // check user
    const user = await UserRepositor.getById(user_id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // role check
    if (user.role !== "ARTIST") {
      throw new AppError("Only artist can create profile", 403);
    }

    // Aadhaar number validation and collision check if provided
    if (data.aadhaar_number) {
      const { validateAadhaarNumber } = require("../utils/aadhaar.validator");
      const aadhaarValidation = validateAadhaarNumber(data.aadhaar_number);
      if (!aadhaarValidation.valid) {
        throw new AppError(aadhaarValidation.message, 400);
      }
      const cleanAadhaar = aadhaarValidation.cleanNumber;
      const existingAadhaar = await db.ArtistProfile.findOne({
        where: {
          aadhaar_number: cleanAadhaar,
          user_id: { [db.Sequelize.Op.ne]: user_id }
        }
      });
      if (existingAadhaar) {
        throw new AppError("This Aadhaar number is already registered with another artist account.", 400);
      }
      data.aadhaar_number = cleanAadhaar;
    }

    // Aadhaar front & back distinct photos validation
    if (data.aadhaar_front || data.aadhaar_back) {
      const { validateAadhaarPhotos } = require("../utils/aadhaar.validator");
      if (data.aadhaar_front && data.aadhaar_back) {
        const photoValidation = validateAadhaarPhotos(data.aadhaar_front, data.aadhaar_back);
        if (!photoValidation.valid) {
          throw new AppError(photoValidation.message, 400);
        }
      }
    }

    // PAN number validation and collision check if provided
    if (data.pan_number) {
      const cleanPan = String(data.pan_number).trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        throw new AppError("Invalid PAN card format (e.g. ABCDE1234F)", 400);
      }
      const existingPan = await db.ArtistProfile.findOne({
        where: {
          pan_number: cleanPan,
          user_id: { [db.Sequelize.Op.ne]: user_id }
        }
      });
      if (existingPan) {
        throw new AppError("This PAN number is already registered with another artist account.", 400);
      }
      data.pan_number = cleanPan;
    }

    // Bank IFSC validation if provided
    if (data.bank_ifsc) {
      const cleanIfsc = String(data.bank_ifsc).trim().toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        throw new AppError("Invalid bank IFSC code format (e.g. HDFC0001234)", 400);
      }
      data.bank_ifsc = cleanIfsc;
    }

    if (data.phone) {
      const cleanPhone = String(data.phone).trim().replace(/[^0-9]/g, "");
      if (cleanPhone.length === 10) {
        await UserRepositor.update(user_id, { phone: cleanPhone });
      }
    }

    if (data.selfie_image || data.profile_image || data.avatar) {
      const profileImg = data.selfie_image || data.profile_image || data.avatar;
      await UserRepositor.update(user_id, { profile_image: profileImg, avatar: profileImg });
    }

    // Check if artist profile already exists (e.g. created during OTP registration)
    const existingProfile = await ArtistProfileRepositor.getOne({ user_id });
    if (existingProfile) {
      const updatePayload = {
        bio: data.bio !== undefined ? data.bio : existingProfile.bio,
        experience_years: data.experience_years !== undefined ? Number(data.experience_years) : existingProfile.experience_years,
        starting_price: data.starting_price !== undefined ? Number(data.starting_price) : (existingProfile.starting_price || 0),
        home_service: data.home_service !== undefined ? Boolean(data.home_service) : existingProfile.home_service,
        salon_service: data.salon_service !== undefined ? Boolean(data.salon_service) : existingProfile.salon_service,
        location: data.location !== undefined ? data.location : existingProfile.location,
        city: data.city !== undefined ? data.city : existingProfile.city,
        state: data.state !== undefined ? data.state : existingProfile.state,
        pincode: data.pincode !== undefined ? data.pincode : existingProfile.pincode,
        latitude: data.latitude || existingProfile.latitude || 26.9124,
        longitude: data.longitude || existingProfile.longitude || 75.7873,
        aadhaar_front: data.aadhaar_front !== undefined ? data.aadhaar_front : existingProfile.aadhaar_front,
        aadhaar_back: data.aadhaar_back !== undefined ? data.aadhaar_back : existingProfile.aadhaar_back,
        aadhaar_number: data.aadhaar_number !== undefined ? data.aadhaar_number : existingProfile.aadhaar_number,
        pan_number: data.pan_number !== undefined ? data.pan_number : existingProfile.pan_number,
        selfie_image: data.selfie_image !== undefined ? data.selfie_image : existingProfile.selfie_image,
        verification_status: "PENDING",
        is_available: false,
        rejection_reason: null,
      };

      await ArtistProfileRepositor.update(existingProfile.id, updatePayload);

      // Auto-create initial base service if artist has no services yet
      try {
        const existingServices = await ServiceRepositor.getAll({ artist_id: user_id });
        if (!existingServices || existingServices.length === 0) {
          await ServiceRepositor.create({
            artist_id: user_id,
            specialization_name: "Bridal & Party Mehndi",
            category: "Bridal Mehndi",
            description: data.bio || "Custom handcrafted mehndi design service",
            minimum_price: Number(data.starting_price) || 0,
            maximum_price: (Number(data.starting_price) || 0) * 3,
            duration_minutes: 120,
            is_home_service: Boolean(data.home_service !== false),
            is_salon_service: Boolean(data.salon_service),
            is_active: true,
          });
        }
      } catch (svcErr) {
        console.warn("[createArtistProfile] Initial service auto-creation notice:", svcErr.message);
      }

      return await this.getArtistDetails(user_id);
    }

    const profile = await ArtistProfileRepositor.createProfile({
      ...data,
      starting_price: Number(data.starting_price) || 0,
      verification_status: "PENDING",
      is_available: false,
      rejection_reason: null,
      latitude: data.latitude || 26.9124,
      longitude: data.longitude || 75.7873,
    });

    try {
      await ServiceRepositor.create({
        artist_id: user_id,
        specialization_name: "Bridal & Party Mehndi",
        category: "Bridal Mehndi",
        description: data.bio || "Custom handcrafted mehndi design service",
        minimum_price: Number(data.starting_price) || 0,
        maximum_price: (Number(data.starting_price) || 0) * 3,
        duration_minutes: 120,
        is_home_service: Boolean(data.home_service !== false),
        is_salon_service: Boolean(data.salon_service),
        is_active: true,
      });
    } catch (svcErr) {
      console.warn("[createArtistProfile] Initial service creation notice:", svcErr.message);
    }

    return profile;
  }

  async getArtists(userId) {
    return await ArtistProfileRepositor.getArtistByUserId(userId);
  }

  async updateArtistProfile(userId, data) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: userId });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    
    // Update User table if name, email, phone, or avatar is passed
    const userUpdates = {};
    if (data.name !== undefined) userUpdates.name = data.name;
    if (data.fullName !== undefined) userUpdates.name = data.fullName;
    if (data.full_name !== undefined) userUpdates.name = data.full_name;
    if (data.email !== undefined) userUpdates.email = data.email;
    if (data.phone !== undefined) userUpdates.phone = data.phone;
    if (data.profileImage !== undefined) {
      userUpdates.profile_image = data.profileImage;
      userUpdates.avatar = data.profileImage;
    }
    if (data.profile_image !== undefined) {
      userUpdates.profile_image = data.profile_image;
      userUpdates.avatar = data.profile_image;
    }
    if (data.selfie_image !== undefined) {
      userUpdates.profile_image = data.selfie_image;
      userUpdates.avatar = data.selfie_image;
    }
    if (data.avatar !== undefined) {
      userUpdates.profile_image = data.avatar;
      userUpdates.avatar = data.avatar;
    }
    
    if (Object.keys(userUpdates).length > 0) {
      await UserRepositor.update(userId, userUpdates);
    }

    const allowedUpdates = {
      bio: data.bio !== undefined ? data.bio : artist.bio,
      experience_years: data.experience_years !== undefined ? Number(data.experience_years) : (data.experience !== undefined ? Number(data.experience) : artist.experience_years),
      starting_price: data.starting_price !== undefined ? Number(data.starting_price) : (data.startingPrice !== undefined ? Number(data.startingPrice) : artist.starting_price),
      home_service: data.home_service !== undefined ? Boolean(data.home_service) : (data.homeService !== undefined ? Boolean(data.homeService) : artist.home_service),
      salon_service: data.salon_service !== undefined ? Boolean(data.salon_service) : (data.salonService !== undefined ? Boolean(data.salonService) : artist.salon_service),
      is_available: data.is_available !== undefined ? Boolean(data.is_available) : (data.isAvailable !== undefined ? Boolean(data.isAvailable) : artist.is_available),
      service_radius: data.service_radius !== undefined ? (data.service_radius === null ? null : Number(data.service_radius)) : (data.serviceRadius !== undefined ? (data.serviceRadius === null ? null : Number(data.serviceRadius)) : artist.service_radius),
      selfie_image: data.selfie_image !== undefined ? data.selfie_image : (data.profile_image !== undefined ? data.profile_image : (data.profileImage !== undefined ? data.profileImage : artist.selfie_image)),
      location: data.location !== undefined ? data.location : artist.location,
      city: data.city !== undefined ? data.city : artist.city,
      state: data.state !== undefined ? data.state : artist.state,
      pincode: data.pincode !== undefined ? data.pincode : artist.pincode,
      cover_image: data.coverImage !== undefined ? data.coverImage : (data.cover_image !== undefined ? data.cover_image : artist.cover_image),
      languages: data.languages !== undefined ? data.languages : artist.languages,
      intro_video: data.intro_video !== undefined ? data.intro_video : artist.intro_video,
      portfolio_video: data.portfolio_video !== undefined ? data.portfolio_video : artist.portfolio_video,
      intro_video_thumbnail: data.intro_video_thumbnail !== undefined ? data.intro_video_thumbnail : artist.intro_video_thumbnail,
      portfolio_video_thumbnail: data.portfolio_video_thumbnail !== undefined ? data.portfolio_video_thumbnail : artist.portfolio_video_thumbnail,
    };

    // If starting price is updated, also update or create base service
    if (data.starting_price || data.startingPrice) {
      try {
        const newPrice = Number(data.starting_price || data.startingPrice);
        const services = await ServiceRepositor.getAll({ artist_id: userId });
        if (services && services.length > 0) {
          await ServiceRepositor.update(services[0].id, { minimum_price: newPrice });
        }
      } catch (svcUpdateErr) {
        console.warn("[updateArtistProfile] Base service price sync notice:", svcUpdateErr.message);
      }
    }

    // If KYC identity fields are being re-uploaded, transition back to PENDING
    if (data.aadhaar_front || data.aadhaar_back || data.aadhaar_number || data.pan_number) {
      if (data.aadhaar_front) allowedUpdates.aadhaar_front = data.aadhaar_front;
      if (data.aadhaar_back) allowedUpdates.aadhaar_back = data.aadhaar_back;
      
      const frontToCheck = data.aadhaar_front || artist.aadhaar_front;
      const backToCheck = data.aadhaar_back || artist.aadhaar_back;
      if (frontToCheck && backToCheck) {
        const { validateAadhaarPhotos } = require("../utils/aadhaar.validator");
        const photoValidation = validateAadhaarPhotos(frontToCheck, backToCheck);
        if (!photoValidation.valid) {
          throw new AppError(photoValidation.message, 400);
        }
      }

      if (data.aadhaar_number) {
        const { validateAadhaarNumber } = require("../utils/aadhaar.validator");
        const aadhaarValidation = validateAadhaarNumber(data.aadhaar_number);
        if (!aadhaarValidation.valid) {
          throw new AppError(aadhaarValidation.message, 400);
        }
        const cleanAadhaar = aadhaarValidation.cleanNumber;
        const existingAadhaar = await db.ArtistProfile.findOne({
          where: {
            aadhaar_number: cleanAadhaar,
            user_id: { [db.Sequelize.Op.ne]: userId }
          }
        });
        if (existingAadhaar) {
          throw new AppError("This Aadhaar number is already registered with another artist account.", 400);
        }
        allowedUpdates.aadhaar_number = cleanAadhaar;
      }
      if (data.pan_number) {
        const cleanPan = String(data.pan_number).trim().toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
          throw new AppError("Invalid PAN card format (e.g. ABCDE1234F)", 400);
        }
        const existingPan = await db.ArtistProfile.findOne({
          where: {
            pan_number: cleanPan,
            user_id: { [db.Sequelize.Op.ne]: userId }
          }
        });
        if (existingPan) {
          throw new AppError("This PAN number is already registered with another artist account.", 400);
        }
        allowedUpdates.pan_number = cleanPan;
      }
      allowedUpdates.verification_status = "PENDING";
      allowedUpdates.rejection_reason = null;
    }
    
    await ArtistProfileRepositor.update(artist.id, allowedUpdates);

    // Trigger referred artist milestones evaluation
    try {
      const xpService = require("./xp.services");
      await xpService.evaluateArtistMilestone(userId);
    } catch (err) {
      console.error("[Milestones Trigger] Error evaluating milestones on profile update:", err.message);
    }

    return await this.getArtistDetails(userId);
  }

  async getProfile(userId) {
    return await this.getArtistDetails(userId);
  }

  async updateProfileDetails(userId, data) {
    return await this.updateArtistProfile(userId, data);
  }

  async getProfileDetails(userId) {
    return await this.getArtistDetails(userId);
  }

  async getArtistDetails(id) {
    const artist = await ArtistProfileRepositor.getArtistDetails(id);

    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    const reviews = artist.reviews || [];
    const average_rating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce(
                (sum, item) => sum + item.rating,
                0
              ) / reviews.length
            ).toFixed(1)
          )
        : 0;

    const artistData = artist.toJSON();

    delete artistData.avg_rating;
    delete artistData.total_reviews;

    // Mask sensitive fields for artist own view
    if (artistData.aadhaar_number) {
      const clean = String(artistData.aadhaar_number).replace(/\s/g, "");
      artistData.aadhaar_number = clean.length >= 4 ? "•••• •••• " + clean.slice(-4) : "••••";
    }
    if (artistData.bank_account_number && artistData.bank_account_number.length > 4) {
      artistData.bank_account_number = "••••••" + String(artistData.bank_account_number).slice(-4);
    }

    const isProfileComplete = Boolean(
      artistData.bio &&
      artistData.bio.trim() !== "" &&
      artistData.experience_years !== null &&
      artistData.city &&
      artistData.pincode &&
      artistData.aadhaar_front &&
      artistData.aadhaar_back
    );

    return {
      ...artistData,
      average_rating,
      review_count: reviews.length,
      isProfileComplete,
    };
  }

  async getArtistDetailsById(id) {
    const artist = await UserRepositor.getArtistDetails(id);

    if (!artist || artist.verification_status !== "APPROVED") {
      throw new AppError("Artist profile is not available or pending verification", 404);
    }

    const reviews = artist.reviews || [];
    const average_rating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
            ).toFixed(1)
          )
        : 0;

    const artistData = artist.toJSON();

    delete artistData.avg_rating;
    delete artistData.total_reviews;

    // NEVER expose sensitive KYC & financial details on public/customer endpoints
    delete artistData.aadhaar_front;
    delete artistData.aadhaar_back;
    delete artistData.aadhaar_number;
    delete artistData.pan_number;
    delete artistData.bank_account_number;
    delete artistData.bank_ifsc;
    delete artistData.bank_account_holder;
    delete artistData.selfie_image;

    return {
      ...artistData,
      average_rating,
      review_count: reviews.length,
    };
  }

  async createService(data) {
    const userId = data.artist_id;
    return await this.createNewService(userId, data);
  }

  async getMyServices(artist_id) {
    return await this.getServicesList(artist_id);
  }

  async updateService(id, data, artist_id) {
    return await this.updateServiceDetails(id, artist_id, data);
  }

  async deleteService(id, artist_id) {
    return await this.deleteServiceItem(id, artist_id);
  }

  async createSlot(data) {
    const { artist_id, date, start_time, end_time } = data;

    const artist = await ArtistProfileRepositor.getOne({
      user_id: artist_id,
    });

    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    if (artist.verification_status !== "APPROVED") {
      throw new AppError("Only approved artists can create availability slots", 403);
    }

    if (!artist.is_available) {
      throw new AppError("Artist is currently unavailable", 400);
    }

    if (!date) {
      throw new AppError("Date is required", 400);
    }

    if (!start_time) {
      throw new AppError("Start time required", 400);
    }

    if (!end_time) {
      throw new AppError("End time required", 400);
    }

    const startDateTime = new Date(`${date}T${start_time}`);

    const endDateTime = new Date(`${date}T${end_time}`);

    if (isNaN(startDateTime.getTime())) {
      throw new AppError("Invalid start time", 400);
    }

    if (isNaN(endDateTime.getTime())) {
      throw new AppError("Invalid end time", 400);
    }

    if (endDateTime <= startDateTime) {
      throw new AppError("End time must be greater than start time", 400);
    }

    const overlap = await SlotRepositor.checkOverlap(
      artist.id,
      startDateTime,
      endDateTime,
    );

    if (overlap) {
      throw new AppError("Slot already overlaps", 400);
    }

    const slot = await SlotRepositor.createSlot({
      artist_id: artist.id,
      start_time: startDateTime,
      end_time: endDateTime,
      is_booked: false,
    });

    return slot;
  }

  async getMySlots(artist_id) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: artist_id });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    return await SlotRepositor.findArtistSlots(artist.id);
  }
  async updateSlot(id, data, artist_id) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: artist_id });
    const slot = await SlotRepositor.getById(id);
    if (!slot) {
      throw new AppError("Slot not found", 404);
    }
    if (slot.artist_id !== artist.id) {
      throw new AppError("Unauthorized", 403);
    }
    await SlotRepositor.update(id, data);
    return await SlotRepositor.getById(id);
  }
  async deleteSlot(id, artist_id) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: artist_id });
    const slot = await SlotRepositor.getById(id);
    if (!slot) {
      throw new AppError("Slot not found", 404);
    }
    if (slot.artist_id !== artist.id) {
      throw new AppError("Unauthorized", 403);
    }
    await SlotRepositor.delete(id);
    return true;
  }



  // Booking management

  async createBooking(data) {

  const {
    user_id,
    artist_id,
    service_id,
    slot_id,
    address,
    notes,
  } = data;

  const user =
    await UserRepositor.getById(user_id);

  if (!user) {
    throw new AppError(
      "User not found",
      404
    );
  }

  if (user.role !== "USER") {
    throw new AppError(
      "Only users can create bookings",
      403
    );
  }

  const artist =
    await ArtistProfileRepositor.getById(
      artist_id
    );

  if (!artist) {
    throw new AppError(
      "Artist not found",
      404
    );
  }

  const service =
    await ServiceRepositor.getById(
      service_id
    );

  if (!service) {
    throw new AppError(
      "Service not found",
      404
    );
  }

  if (
    service.artist_id !== artist.id
  ) {
    throw new AppError(
      "Invalid service",
      400
    );
  }

  const slot =
    await SlotRepositor.getById(
      slot_id
    );

  if (!slot) {
    throw new AppError(
      "Slot not found",
      404
    );
  }

  if (
    slot.artist_id !== artist.id
  ) {
    throw new AppError(
      "Invalid slot",
      400
    );
  }

  if (slot.is_booked) {
    throw new AppError(
      "Slot already booked",
      400
    );
  }

  const booking_code =
    `BOOK-${Date.now()}`;

  const total_price =
    service.minimum_price;

  const advance_paid = 0;

  const remaining_amount =
    total_price -
    advance_paid;

  const booking =
    await BookingRepositor.createBooking({

      booking_code,

      user_id,

      artist_id,

      service_id,

      slot_id,

      total_price,

      advance_paid,

      remaining_amount,

      booking_status:
        "PENDING",

      payment_status:
        "PENDING",

      address,

      notes,
    });

  // Notification
  await NotificationRepositor.createNotification({
    user_id: artist.user_id,
    title: "New Booking",
    message: `New booking received from ${user.name}`,
    type: "BOOKING",
  });

  // Real-time Socket.IO alert
  try {
    const io = getIO();
    io.to(artist.user_id.toString()).emit("new_notification", {
      title: "New Booking",
      message: `New booking received from ${user.name}`,
      type: "BOOKING",
    });
  } catch (e) { /* socket not initialized */ }

  await SlotRepositor.update(slot_id, { is_booked: true });

  return booking;
}

async getMyBookings(user_id) {

  const user =
    await UserRepositor.getById(
      user_id
    );

  if (!user) {
    throw new AppError(
      "User not found",
      404
    );
  }

  // USER LOGIN
  if (user.role === "USER") {

    return await BookingRepositor
      .getUserBookings(
        user_id
      );
  }

  // ARTIST LOGIN
  if (user.role === "ARTIST") {

    const artist =
      await ArtistProfileRepositor.getOne({
        user_id,
      });

    if (!artist) {
      throw new AppError(
        "Artist profile not found",
        404
      );
    }

    return await BookingRepositor
      .getArtistBookings(
        artist.id
      );
  }

  throw new AppError(
    "Invalid role",
    400
  );
}
async getArtistBookings(user_id) {

  const user =
    await UserRepositor.getById(
      user_id
    );

  if (!user) {
    throw new AppError(
      "User not found",
      404
    );
  }

  if (
    user.role !== "ARTIST"
  ) {
    throw new AppError(
      "Only artist can access bookings",
      403
    );
  }

  const artist =
    await ArtistProfileRepositor.getOne({
      user_id,
    });

  if (!artist) {
    throw new AppError(
      "Artist profile not found",
      404
    );
  }

  return await BookingRepositor
    .getArtistBookings(
      [artist.id, user_id]
    );
}
async updateBookingStatus(
  booking_id,
  user_id,
  data
) {

  const {
    booking_status,
    cancel_reason,
  } = data;

  const booking =
    await BookingRepositor.getById(
      booking_id
    );

  if (!booking) {
    throw new AppError(
      "Booking not found",
      404
    );
  }

  const user =
    await UserRepositor.getById(
      user_id
    );

  if (!user) {
    throw new AppError(
      "User not found",
      404
    );
  }

  // Artist Validation

  const artist =
    await ArtistProfileRepositor.getOne({
      user_id,
    });

  if (
    !artist ||
    artist.id !== booking.artist_id
  ) {
    throw new AppError(
      "Only booking artist can update status",
      403
    );
  }

  const allowedStatus = [
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
  ];

  if (
    !allowedStatus.includes(
      booking_status
    )
  ) {
    throw new AppError(
      "Invalid booking status",
      400
    );
  }

  const updateData = {
    booking_status,
  };

  if (
    booking_status ===
    "CANCELLED"
  ) {

    if (!cancel_reason) {

      throw new AppError(
        "Cancel reason required",
        400
      );
    }

    updateData.cancel_reason =
      cancel_reason;

    if (booking.slot_id) {

      await SlotRepositor.update(
        booking.slot_id,
        {
          is_booked: false,
        }
      );
    }
  }

  await BookingRepositor.update(booking_id, updateData);

  // Notify user about booking status change
  try {
    const NotificationService = require("./notification.services");
    await NotificationService.sendToUser(
      booking.user_id,
      `Booking ${booking_status}`,
      `Your booking has been ${booking_status.toLowerCase()}`,
      { type: "BOOKING", bookingId: booking.id }
    );
  } catch (err) {
    console.log("Failed to send push notification on booking update:", err.message);
    await NotificationRepositor.createNotification({
      user_id: booking.user_id,
      title: `Booking ${booking_status}`,
      message: `Your booking has been ${booking_status.toLowerCase()}`,
      type: "BOOKING",
    });
  }

  // Real-time Socket.IO alert
  try {
    const io = getIO();
    io.to(booking.user_id.toString()).emit("new_notification", {
      title: `Booking ${booking_status}`,
      message: `Your booking has been ${booking_status.toLowerCase()}`,
      type: "BOOKING",
    });
  } catch (e) { /* socket not initialized */ }

  return await BookingRepositor.getById(booking_id);
}


  async createOrder(booking_id, customAmountPaise = null) {
    let amountPaise;
    let receipt = `rcpt_${Date.now()}`;

    if (booking_id) {
      const booking = await BookingRepositor.getById(booking_id);
      if (!booking) {
        throw new AppError("Booking not found", 404);
      }
      if (booking.payment_status === "PAID") {
        throw new AppError("Booking already paid", 400);
      }
      amountPaise = customAmountPaise || Math.round(Number(booking.total_price) * 100);
      receipt = `booking_${booking_id}_${Date.now()}`;
    } else if (customAmountPaise) {
      amountPaise = Number(customAmountPaise);
    } else {
      throw new AppError("Booking ID or amount is required", 400);
    }

    if (isNaN(amountPaise) || amountPaise < 100) {
      throw new AppError("Minimum order amount must be at least 100 paise", 400);
    }

    const order = await razorpayUtil.createRazorpayOrder({
      amount: amountPaise,
      currency: "INR",
      receipt
    });

    if (booking_id) {
      await PaymentRepositor.create({
        booking_id,
        razorpay_order_id: order.order_id,
        transaction_id: order.order_id,
        amount: Math.round(amountPaise / 100),
        payment_method: "ONLINE",
        status: "PENDING",
        gateway: "RAZORPAY",
        currency: "INR"
      });
    }

    return {
      order_id: order.order_id,
      id: order.order_id,
      amount: order.amount,
      currency: order.currency
    };
  }

  async verifyPayment(data) {
    const {
      booking_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = data;

    const orderId = razorpay_order_id || data.order_id;
    const paymentId = razorpay_payment_id || data.payment_id;
    const signature = razorpay_signature || data.signature;

    if (!orderId || !paymentId || !signature) {
      throw new AppError("Missing payment verification parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature)", 400);
    }

    const isValid = razorpayUtil.verifyRazorpaySignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    });

    if (!isValid) {
      throw new AppError("Invalid payment signature. Payment verification failed.", 400);
    }

    if (booking_id) {
      const booking = await BookingRepositor.getById(booking_id);
      if (!booking) {
        throw new AppError("Booking not found", 404);
      }
      await BookingRepositor.update(booking_id, {
        payment_status: "PAID",
        booking_status: "CONFIRMED",
        advance_paid: booking.total_price,
        remaining_amount: 0
      });

      const payments = await PaymentRepositor.getAll({ booking_id });
      const payment = payments[0];
      if (payment) {
        await PaymentRepositor.update(payment.id, {
          razorpay_payment_id: paymentId,
          transaction_id: paymentId,
          status: "SUCCESS",
          paid_at: new Date()
        });
      }

      const artist = await ArtistProfileRepositor.getById(booking.artist_id);
      const artistUserId = artist ? artist.user_id : booking.artist_id;

      await NotificationRepositor.createNotification({
        user_id: artistUserId,
        title: "Payment Success",
        message: "Booking payment completed via Razorpay",
        type: "PAYMENT",
      });
      // Real-time Socket.IO alert to artist
      try {
        const io = getIO();
        io.to(artistUserId.toString()).emit("new_notification", {
          title: "Payment Success",
          message: "Booking payment completed",
          type: "PAYMENT",
        });
        // Also notify the user
        io.to(booking.user_id.toString()).emit("new_notification", {
          title: "Payment Confirmed",
          message: "Your payment has been confirmed successfully",
          type: "PAYMENT",
        });
      } catch (e) { /* socket not initialized */ }

      return {
        success: true,
        message: "Payment verified successfully",
        order_id: orderId,
        payment_id: paymentId
      };
    }

    // Real-time Socket.IO alert to artist
    try {
      const io = getIO();
      io.to(artistUserId.toString()).emit("new_notification", {
        title: "Payment Success",
        message: "Booking payment completed",
        type: "PAYMENT",
      });
      // Also notify the user
      io.to(booking.user_id.toString()).emit("new_notification", {
        title: "Payment Confirmed",
        message: "Your payment has been confirmed successfully",
        type: "PAYMENT",
      });
    } catch (e) { /* socket not initialized */ }

    return {
      success: true,
      message: "Payment verified successfully",
      order_id: orderId,
      payment_id: paymentId
    };
  }

async createReview(data) {

  const {
    booking_id,
    user_id,
    rating,
    review,
  } = data;

  const booking =
    await BookingRepositor.getById(
      booking_id
    );

  if (!booking) {
    throw new AppError(
      "Booking not found",
      404
    );
  }

  if (
    booking.user_id !== user_id
  ) {
    throw new AppError(
      "Unauthorized",
      403
    );
  }

  if (
    booking.booking_status !==
    "COMPLETED"
  ) {
    throw new AppError(
      "Review allowed only after completed booking",
      400
    );
  }

  const existingReview =
    await ReviewRepositor.findBookingReview(
      booking_id
    );

  if (existingReview) {
    throw new AppError(
      "Review already submitted",
      400
    );
  }

  if (!rating) {
    throw new AppError(
      "Rating required",
      400
    );
  }

  if (
    rating < 1 ||
    rating > 5
  ) {
    throw new AppError(
      "Rating must be between 1 and 5",
      400
    );
  }

  const artist_id =
    booking.artist_id;

  const artist =
    await ArtistProfileRepositor.getById(
      artist_id
    );

  const newReview =
    await ReviewRepositor.createReview({

      booking_id,

      artist_id,

      user_id,

      rating,

      comment: review,
    });

  await NotificationRepositor.createNotification({

    user_id:
      artist.user_id,

    title:
      "New Review",

    message:
      `You received a ${rating} star review`,

    type:
      "SYSTEM",
  });

  const allReviews =
    await ReviewRepositor.getArtistReviews(
      artist_id
    );

  const totalReviews =
    allReviews.length;

  const totalRating =
    allReviews.reduce(
      (sum, item) =>
        sum + item.rating,
      0
    );

  const avgRating =
    totalRating /
    totalReviews;

  await ArtistProfileRepositor.update(
    artist_id,
    {
      avg_rating:
        Number(
          avgRating.toFixed(1)
        ),

      total_reviews:
        totalReviews,
    }
  );

  return newReview;
}

  async getArtistReviews(artist_id) {

  const artist =
    await ArtistProfileRepositor.getById(
      artist_id
    );

  if (!artist) {
    throw new AppError(
      "Artist not found",
      404
    );
  }

  const reviews =
    await ReviewRepositor.getArtistReviews(
      artist_id
    );

  const totalReviews =
    reviews.length;

  const totalRating =
    reviews.reduce(
      (sum, item) =>
        sum + item.rating,
      0
    );

  const avgRating =
    totalReviews > 0
      ? Number(
          (
            totalRating /
            totalReviews
          ).toFixed(1)
        )
      : 0;

  return {
    artist_id,
    avg_rating: avgRating,
    total_reviews: totalReviews,
    reviews,
  };
}

  // notification management
  async createNotification(data) {
    return await NotificationRepositor.createNotification(data);
  }
  async getMyNotifications(user_id) {
    return await NotificationRepositor.getUserNotifications(user_id);
  }
  async markAsRead(id, user_id) {
    const notification = await NotificationRepositor.getById(id);
    if (!notification) {
      throw new AppError("Notification not found", 404);
    }
    if (notification.user_id !== user_id) {
      throw new AppError("Unauthorized", 403);
    }
    await NotificationRepositor.markAsRead(id);
    return true;
  }

  // Portfolio Management
  async createPortfolio(userIdOrData, maybeData) {
    let userId;
    let data;
    if (typeof userIdOrData === "object") {
      data = userIdOrData;
      userId = data.artist_id || data.user_id;
    } else {
      userId = userIdOrData;
      data = maybeData || {};
    }

    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });

    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    const imageUrl = data.image_url || null;
    const videoUrl = data.video_url || null;

    if (!imageUrl && !videoUrl) {
      throw new AppError("Portfolio media file is required (image_url or video_url)", 400);
    }

    // Validate Price if provided
    if (data.price !== undefined && data.price !== null && data.price !== "") {
      const p = Number(data.price);
      if (!Number.isFinite(p) || p < 0) {
        throw new AppError("Portfolio price must be a non-negative number", 400);
      }
    }

    // Validate Duration if provided
    if (data.duration_minutes !== undefined && data.duration_minutes !== null && data.duration_minutes !== "") {
      const d = Number(data.duration_minutes);
      if (!Number.isFinite(d) || d < 15 || d > 720) {
        throw new AppError("Portfolio duration must be between 15 and 720 minutes", 400);
      }
    }

    // Validate Art Tier if provided
    if (data.art_tier && !["STANDARD", "PREMIUM", "BRIDAL_EXCLUSIVE"].includes(data.art_tier)) {
      throw new AppError("Invalid art tier. Allowed: STANDARD, PREMIUM, BRIDAL_EXCLUSIVE", 400);
    }

    // Validate Complexity Level if provided
    if (data.complexity_level && !["SIMPLE", "MEDIUM", "INTRICATE", "MASTERPIECE"].includes(data.complexity_level)) {
      throw new AppError("Invalid complexity level. Allowed: SIMPLE, MEDIUM, INTRICATE, MASTERPIECE", 400);
    }

    // Idempotent duplicate check (prevent accidental duplicate records from retried uploads)
    const existing = await db.Portfolio.findOne({
      where: {
        artist_id: { [db.Sequelize.Op.in]: [artist.id, artist.user_id] },
        image_url: imageUrl || videoUrl
      }
    });
    if (existing) {
      return existing;
    }

    const portfolioData = {
      artist_id: artist.id,
      image_url: imageUrl || videoUrl,
      video_url: videoUrl,
      title: data.title ? String(data.title).trim() : null,
      caption: data.caption ? String(data.caption).trim() : null,
      description: data.description ? String(data.description).trim() : null,
      category: data.category ? String(data.category).trim() : null,
      occasion: data.occasion ? String(data.occasion).trim() : null,
      tags: data.tags ? String(data.tags).trim() : null,
      location: data.location ? String(data.location).trim() : null,
      visibility: data.visibility !== undefined ? (data.visibility === true || data.visibility === "true") : true,
      display_order: data.display_order !== undefined ? Number(data.display_order) : 0,
      art_tier: data.art_tier || "STANDARD",
      price: data.price ? Number(data.price) : null,
      duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : 60,
      complexity_level: data.complexity_level || "MEDIUM"
    };

    const created = await PortfolioRepositor.createPortfolio(portfolioData);

    // If set as cover or featured image, update artist profile cover_image
    if (data.is_cover === true || data.is_featured === true) {
      await artist.update({ cover_image: imageUrl || videoUrl });
    }

    return created;
  }

  async getMyPortfolio(userId) {
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    return await PortfolioRepositor.getArtistPortfolio([artist.id, artist.user_id]);
  }

  async getPortfolioById(id) {
    const item = await db.Portfolio.findByPk(id, {
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "profile_image"]
            }
          ]
        }
      ]
    });
    if (!item) {
      throw new AppError("Portfolio item not found", 404);
    }
    return item;
  }

  async updatePortfolio(id, userId, data) {
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    const item = await db.Portfolio.findByPk(id);
    if (!item) {
      throw new AppError("Portfolio item not found", 404);
    }
    if (item.artist_id !== artist.id && item.artist_id !== artist.user_id && item.artist_id !== Number(userId)) {
      throw new AppError("Unauthorized access to portfolio", 403);
    }

    const updates = {};
    if (data.title !== undefined) updates.title = data.title ? String(data.title).trim() : null;
    if (data.caption !== undefined) updates.caption = data.caption ? String(data.caption).trim() : null;
    if (data.description !== undefined) updates.description = data.description ? String(data.description).trim() : null;
    if (data.category !== undefined) updates.category = data.category ? String(data.category).trim() : null;
    if (data.occasion !== undefined) updates.occasion = data.occasion ? String(data.occasion).trim() : null;
    if (data.tags !== undefined) updates.tags = data.tags ? String(data.tags).trim() : null;
    if (data.location !== undefined) updates.location = data.location ? String(data.location).trim() : null;
    if (data.visibility !== undefined) updates.visibility = (data.visibility === true || data.visibility === "true");
    if (data.display_order !== undefined) updates.display_order = Number(data.display_order);
    if (data.image_url !== undefined) updates.image_url = data.image_url;
    if (data.video_url !== undefined) updates.video_url = data.video_url;

    if (data.price !== undefined) {
      const p = data.price ? Number(data.price) : null;
      if (p !== null && (!Number.isFinite(p) || p < 0)) {
        throw new AppError("Portfolio price must be a non-negative number", 400);
      }
      updates.price = p;
    }

    if (data.duration_minutes !== undefined) {
      const d = Number(data.duration_minutes);
      if (!Number.isFinite(d) || d < 15 || d > 720) {
        throw new AppError("Portfolio duration must be between 15 and 720 minutes", 400);
      }
      updates.duration_minutes = d;
    }

    if (data.art_tier !== undefined) {
      if (!["STANDARD", "PREMIUM", "BRIDAL_EXCLUSIVE"].includes(data.art_tier)) {
        throw new AppError("Invalid art tier. Allowed: STANDARD, PREMIUM, BRIDAL_EXCLUSIVE", 400);
      }
      updates.art_tier = data.art_tier;
    }

    if (data.complexity_level !== undefined) {
      if (!["SIMPLE", "MEDIUM", "INTRICATE", "MASTERPIECE"].includes(data.complexity_level)) {
        throw new AppError("Invalid complexity level. Allowed: SIMPLE, MEDIUM, INTRICATE, MASTERPIECE", 400);
      }
      updates.complexity_level = data.complexity_level;
    }

    await item.update(updates);

    if (data.is_cover === true) {
      await artist.update({ cover_image: item.image_url || data.image_url });
    }

    return await db.Portfolio.findByPk(id, {
      include: [
        {
          model: db.ArtistProfile,
          as: "artist"
        }
      ]
    });
  }

  async deletePortfolio(id, userId) {
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    const item = await db.Portfolio.findByPk(id);
    if (!item) {
      throw new AppError("Portfolio item not found", 404);
    }
    if (item.artist_id !== artist.id && item.artist_id !== artist.user_id && item.artist_id !== Number(userId)) {
      throw new AppError("Unauthorized access to portfolio", 403);
    }

    // If deleted item was the active cover image, promote next available item or clear
    if (artist.cover_image && (artist.cover_image === item.image_url || artist.cover_image.includes(item.image_url))) {
      const nextItem = await db.Portfolio.findOne({
        where: {
          artist_id: { [db.Sequelize.Op.in]: [artist.id, artist.user_id] },
          id: { [db.Sequelize.Op.ne]: id },
          visibility: true
        },
        order: [
          ["display_order", "ASC"],
          ["createdAt", "DESC"]
        ]
      });
      await artist.update({ cover_image: nextItem ? nextItem.image_url : null });
    }

    // Clean up dependent reactions
    await db.PortfolioLike.destroy({ where: { portfolio_id: id } }).catch(() => {});
    await db.PortfolioSave.destroy({ where: { portfolio_id: id } }).catch(() => {});
    await db.PortfolioComment.destroy({ where: { portfolio_id: id } }).catch(() => {});

    await item.destroy();
    return true;
  }

  async reorderPortfolio(userId, items) {
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    if (!Array.isArray(items)) {
      throw new AppError("Items array required for reordering", 400);
    }

    const artistIds = [artist.id, artist.user_id, Number(userId)];

    for (let i = 0; i < items.length; i++) {
      const entry = items[i];
      const itemId = typeof entry === "object" ? entry.id : entry;
      const order = typeof entry === "object" && entry.display_order !== undefined ? Number(entry.display_order) : i;

      const item = await db.Portfolio.findByPk(itemId);
      if (!item) {
        throw new AppError(`Portfolio item #${itemId} not found`, 404);
      }
      if (!artistIds.includes(item.artist_id)) {
        throw new AppError("Unauthorized: cannot reorder another artist's portfolio items", 403);
      }
      await item.update({ display_order: order });
    }

    return await PortfolioRepositor.getArtistPortfolio([artist.id, artist.user_id]);
  }

  async setCoverImage(userId, data) {
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    let targetUrl = data?.image_url;
    if (data?.portfolio_id) {
      const item = await db.Portfolio.findByPk(data.portfolio_id);
      if (!item) {
        throw new AppError("Portfolio item not found", 404);
      }
      const artistIds = [artist.id, artist.user_id, Number(userId)];
      if (!artistIds.includes(item.artist_id)) {
        throw new AppError("Unauthorized: cannot select another artist's portfolio item as cover", 403);
      }
      targetUrl = item.image_url;
    }

    if (!targetUrl) {
      throw new AppError("Valid cover image URL or portfolio_id required", 400);
    }

    await artist.update({ cover_image: targetUrl });
    return artist;
  }

  async getDashboard(userId) {
    const artist = await db.ArtistProfile.findOne({
      where: { user_id: userId },
      include: [{ model: db.User, as: "user", attributes: ["name", "profile_image"] }]
    });
    if (!artist) {
      throw new AppError("Artist profile not found. Please complete your onboarding first.", 404);
    }

    if (artist.verification_status !== "APPROVED") {
      const errorMsg = artist.verification_status === "REJECTED"
        ? (artist.rejection_reason ? `Your artist application has been rejected by the admin. Reason: ${artist.rejection_reason}` : "Your artist application has been rejected by the admin.")
        : "Your artist account is pending admin approval. You will be able to access your dashboard after approval.";
      throw new AppError(errorMsg, 403);
    }

    const artistIds = [artist.id, Number(userId)];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBookings = await db.Booking.count({
      where: { artist_id: { [db.Sequelize.Op.in]: artistIds }, createdAt: { [db.Sequelize.Op.gte]: today } }
    });

    const WalletService = require("./wallet.services");
    const walletSummary = await WalletService.getWalletSummary(userId);

    let todayEarnings = 0;
    if (walletSummary) {
      const wallet = await db.Wallet.findOne({ where: { user_id: userId } });
      if (wallet) {
        todayEarnings = await db.WalletTransaction.sum("amount", {
          where: {
            wallet_id: wallet.id,
            status: "SUCCESS",
            transaction_type: { [db.Sequelize.Op.in]: ["SETTLEMENT", "RECHARGE", "REFUND", "MANUAL_CREDIT"] },
            createdAt: { [db.Sequelize.Op.gte]: today }
          }
        }) || 0;
      }
    }

    const [
      pendingRequests,
      upcomingBookingsCount,
      acceptedBookingsCount,
      ongoingBookingsCount,
      completedBookingsCount,
      awaitingSettlementCount,
      pendingCashApprovalCount,
      cancelledBookingsCount
    ] = await Promise.all([
      db.Booking.count({
        where: {
          artist_id: { [db.Sequelize.Op.in]: artistIds },
          [db.Sequelize.Op.or]: [
            { booking_status: "PENDING" },
            { booking_status: "CONFIRMED", detailed_status: "CONFIRMED" }
          ]
        }
      }),
      db.Booking.count({
        where: {
          artist_id: { [db.Sequelize.Op.in]: artistIds },
          booking_status: "CONFIRMED",
          detailed_status: { [db.Sequelize.Op.ne]: "CONFIRMED" }
        }
      }),
      db.Booking.count({ where: { artist_id: { [db.Sequelize.Op.in]: artistIds }, detailed_status: "ARTIST_ACCEPTED" } }),
      db.Booking.count({ where: { artist_id: { [db.Sequelize.Op.in]: artistIds }, detailed_status: "SERVICE_STARTED" } }),
      db.Booking.count({ where: { artist_id: { [db.Sequelize.Op.in]: artistIds }, booking_status: "COMPLETED" } }),
      db.Booking.count({
        where: {
          artist_id: { [db.Sequelize.Op.in]: artistIds },
          booking_status: "COMPLETED",
          detailed_status: { [db.Sequelize.Op.ne]: "COMPLETED_CLOSED" },
          payment_status: "PENDING"
        }
      }),
      db.Booking.count({ where: { artist_id: { [db.Sequelize.Op.in]: artistIds }, detailed_status: "AWAITING_CASH_CONFIRMATION" } }),
      db.Booking.count({ where: { artist_id: { [db.Sequelize.Op.in]: artistIds }, booking_status: "CANCELLED" } })
    ]);

    const pendingBookingsCount = pendingRequests;

    const recentBookings = await db.Booking.findAll({
      where: { artist_id: { [db.Sequelize.Op.in]: artistIds } },
      limit: 20,
      order: [["createdAt", "DESC"]],
      include: [
        { model: db.User, as: "user", attributes: ["id", "name", "phone", "email", "profile_image"] },
        { model: db.Service, as: "service", attributes: ["id", "specialization_name", "category"] },
        { model: db.AvailabilitySlot, as: "slot", attributes: ["id", "start_time", "end_time"] },
        { model: db.Payment, as: "payments", attributes: ["payment_method", "status"] }
      ]
    });

    return {
      artist: {
        id: artist.id,
        name: artist.user.name,
        profile_image: artist.user.profile_image,
        verification_status: artist.verification_status,
        experience_years: artist.experience_years,
        avg_rating: artist.avg_rating,
        total_reviews: artist.total_reviews
      },
      todayBookings,
      todayEarnings: todayEarnings || 0,
      pendingRequests,
      walletBalance: walletSummary.balance,
      pendingEarnings: walletSummary.pending_balance,
      lifetimeEarnings: walletSummary.lifetime_earnings,
      recentBookings,
      bookingCounts: {
        PENDING: pendingBookingsCount,
        UPCOMING: upcomingBookingsCount,
        ACCEPTED: acceptedBookingsCount,
        ONGOING: ongoingBookingsCount,
        COMPLETED: completedBookingsCount,
        AWAITING_SETTLEMENT: awaitingSettlementCount,
        PENDING_CASH_APPROVAL: pendingCashApprovalCount,
        CANCELLED: cancelledBookingsCount
      }
    };
  }

  async getBookings(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    const artistIds = artist ? [artist.id, Number(userId)] : [Number(userId)];

    return await db.Booking.findAll({
      where: { artist_id: { [db.Sequelize.Op.in]: artistIds } },
      include: [
        { model: db.User, as: "user", attributes: ["id", "name", "phone", "email", "profile_image"] },
        { model: db.Service, as: "service", attributes: ["id", "specialization_name", "category", "minimum_price"] },
        { model: db.AvailabilitySlot, as: "slot" }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getEarnings(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayVal = await db.Booking.sum("total_price", {
      where: { artist_id: artist.id, booking_status: "COMPLETED", createdAt: { [db.Sequelize.Op.gte]: today } }
    });
    const weeklyVal = await db.Booking.sum("total_price", {
      where: { artist_id: artist.id, booking_status: "COMPLETED", createdAt: { [db.Sequelize.Op.gte]: sevenDaysAgo } }
    });
    const monthlyVal = await db.Booking.sum("total_price", {
      where: { artist_id: artist.id, booking_status: "COMPLETED", createdAt: { [db.Sequelize.Op.gte]: thirtyDaysAgo } }
    });
    const lifetimeVal = await db.Booking.sum("total_price", {
      where: { artist_id: artist.id, booking_status: "COMPLETED" }
    });

    let commissionDeducted = 0;
    if (db.OutstandingCommission) {
      commissionDeducted = (await db.OutstandingCommission.sum("commission_amount", {
        where: { artist_id: artist.id, status: "PAID" }
      })) || 0;
    }

    return {
      today: todayVal || 0,
      weekly: weeklyVal || 0,
      monthly: monthlyVal || 0,
      lifetime: lifetimeVal || 0,
      commissionDeducted: commissionDeducted || 0
    };
  }

  async getAnalytics(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const total = await db.Booking.count({ where: { artist_id: artist.id } });
    const completed = await db.Booking.count({ where: { artist_id: artist.id, booking_status: "COMPLETED" } });

    const uniqueCustomers = await db.Booking.count({
      where: { artist_id: artist.id },
      distinct: true,
      col: "user_id"
    });
    const repeatBookings = Math.max(0, total - uniqueCustomers);
    const customerRetention = total > 1 && uniqueCustomers > 0 ? Math.min(100, Math.round((repeatBookings / total) * 100)) : 0;

    return {
      totalBookings: total,
      completedBookings: completed,
      conversionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      profileViews: artist.total_bookings || 0,
      customerRetention
    };
  }

  async getWalletDetails(userId) {
    let wallet = await db.Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await db.Wallet.create({ user_id: userId, balance: 0, pending_balance: 0, lifetime_earnings: 0 });
    }
    const history = await db.WalletTransaction.findAll({
      where: { wallet_id: wallet.id },
      include: [
        {
          model: db.Booking,
          as: "booking",
          required: false,
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

    const transactions = (history || []).map((tx) => {
      const txData = tx.toJSON();
      if (txData.booking && txData.booking.user) {
        txData.description = `Payment from ${txData.booking.user.name} (#${txData.booking.booking_code})`;
      }
      return txData;
    });

    return {
      balance: wallet.balance || 0,
      pendingBalance: wallet.pending_balance || 0,
      lifetimeEarnings: wallet.lifetime_earnings || 0,
      transactions
    };
  }

  async getReviews(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    return await db.Review.findAll({
      where: { artist_id: artist.id },
      include: [{ model: db.User, as: "user", attributes: ["name"] }],
      order: [["createdAt", "DESC"]]
    });
  }

  async getProfile(userId) {
    const artist = await db.ArtistProfile.findOne({
      where: { user_id: userId },
      include: [{ model: db.User, as: "user", attributes: ["name", "phone", "email", "profile_image"] }]
    });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const [totalBookings, completedBookings, pendingBookings, cancelledBookings, rejectedBookings] = await Promise.all([
      db.Booking.count({ where: { artist_id: artist.id } }),
      db.Booking.count({ where: { artist_id: artist.id, booking_status: "COMPLETED" } }),
      db.Booking.count({ where: { artist_id: artist.id, booking_status: "PENDING" } }),
      db.Booking.count({ where: { artist_id: artist.id, booking_status: "CANCELLED", detailed_status: { [db.Sequelize.Op.ne]: "REJECTED" } } }),
      db.Booking.count({ where: { artist_id: artist.id, detailed_status: "REJECTED" } })
    ]);

    const artistJSON = artist.toJSON();
    artistJSON.bookingStats = {
      total: totalBookings,
      completed: completedBookings,
      pending: pendingBookings,
      cancelled: cancelledBookings,
      rejected: rejectedBookings
    };

    return artistJSON;
  }

  async updateProfileDetails(userId, data) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    await artist.update({
      bio: data.bio !== undefined ? data.bio : artist.bio,
      experience_years: data.experience_years !== undefined ? Number(data.experience_years) : (data.experience !== undefined ? Number(data.experience) : artist.experience_years),
      service_radius: data.service_radius !== undefined ? (data.service_radius === null ? null : Number(data.service_radius)) : (data.serviceRadius !== undefined ? (data.serviceRadius === null ? null : Number(data.serviceRadius)) : artist.service_radius),
      location: data.location !== undefined ? data.location : artist.location,
      city: data.city !== undefined ? data.city : artist.city,
      state: data.state !== undefined ? data.state : artist.state,
      pincode: data.pincode !== undefined ? data.pincode : artist.pincode,
      cover_image: data.coverImage !== undefined ? data.coverImage : (data.cover_image !== undefined ? data.cover_image : artist.cover_image),
      languages: data.languages !== undefined ? data.languages : artist.languages,
      intro_video: data.intro_video !== undefined ? data.intro_video : artist.intro_video,
      portfolio_video: data.portfolio_video !== undefined ? data.portfolio_video : artist.portfolio_video,
      intro_video_thumbnail: data.intro_video_thumbnail !== undefined ? data.intro_video_thumbnail : artist.intro_video_thumbnail,
      portfolio_video_thumbnail: data.portfolio_video_thumbnail !== undefined ? data.portfolio_video_thumbnail : artist.portfolio_video_thumbnail,
    });

    const user = await db.User.findByPk(userId);
    if (user) {
      const userUpdates = {};
      if (data.name && data.name.trim()) userUpdates.name = data.name.trim();

      const newAvatar = data.profileImage || data.profile_image;
      if (newAvatar) userUpdates.profile_image = newAvatar;

      if (data.phone) {
        const cleanPhone = String(data.phone).trim().replace(/[^0-9]/g, "");
        if (cleanPhone && cleanPhone !== user.phone) {
          const existingPhone = await db.User.findOne({ where: { phone: cleanPhone } });
          if (existingPhone && Number(existingPhone.id) !== Number(userId)) {
            throw new AppError("This phone number is already registered with another account.", 400);
          }
          userUpdates.phone = cleanPhone;
        }
      }

      if (Object.keys(userUpdates).length > 0) {
        await user.update(userUpdates);
      }
    }

    return await this.getProfile(userId);
  }

  async getNotifications(userId) {
    return await db.Notification.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]]
    });
  }

  async getServicesList(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    return await db.Service.findAll({
      where: { artist_id: artist.id },
      include: [
        { model: db.ServicePackage, as: "packages" },
        { model: db.ServiceAddon, as: "addons" }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getServiceDetails(id) {
    const service = await db.Service.findByPk(id, {
      include: [
        { model: db.ServicePackage, as: "packages" },
        { model: db.ServiceAddon, as: "addons" },
        { model: db.ArtistProfile, as: "artist", include: [{ model: db.User, as: "user", attributes: ["name"] }] }
      ]
    });
    if (!service) throw new AppError("Service not found", 404);
    return service;
  }

  async validateCategory(categoryInput) {
    if (!categoryInput) {
      throw new AppError("Category is required", 400);
    }
    
    const categories = Array.isArray(categoryInput) ? categoryInput : [categoryInput];
    
    if (categories.length === 0) {
      throw new AppError("At least one category is required", 400);
    }

    const isPostgres = db.sequelize.getDialect() === "postgres";
    const likeOp = isPostgres ? Op.iLike : Op.like;

    const validCategories = [];

    for (const catName of categories) {
      if (typeof catName !== "string") continue;
      const trimmed = catName.trim();
      if (!trimmed) continue;

      const cat = await db.Category.findOne({
        where: {
          [Op.or]: [
            { name: { [likeOp]: trimmed } },
            { slug: { [likeOp]: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-") } }
          ]
        }
      });
  
      if (cat) {
        if (cat.status === "INACTIVE") {
          throw new AppError(`Selected category '${cat.name}' is currently inactive`, 400);
        }
        validCategories.push(cat.name);
      } else {
        validCategories.push(trimmed);
      }
    }

    if (validCategories.length === 0) {
      throw new AppError("Valid category name is required", 400);
    }

    return validCategories;
  }

  /**
   * Checks whether the Services.category column has been migrated to JSONB.
   * If the column is still VARCHAR, storing an array will cause a Postgres
   * type error (500). Throws a clear AppError so the cause is obvious in logs.
   * Run migration: npx sequelize-cli db:migrate
   */
  async _assertCategoryColumnIsJson() {
    try {
      const [rows] = await db.sequelize.query(
        `SELECT data_type, udt_name FROM information_schema.columns
         WHERE table_name = 'Services' AND column_name = 'category' LIMIT 1`
      );
      if (rows && rows.length > 0) {
        const { data_type, udt_name } = rows[0];
        // Acceptable types: jsonb, json, text (SQLite stores as text)
        const isJson = ["jsonb", "json", "text"].includes((data_type || "").toLowerCase())
          || ["jsonb", "json"].includes((udt_name || "").toLowerCase());
        if (!isJson) {
          throw new AppError(
            "Database migration required: Services.category column must be JSONB. Run: npx sequelize-cli db:migrate",
            500
          );
        }
      }
    } catch (err) {
      // Re-throw our own AppErrors; swallow introspection failures on non-postgres dialects
      if (err instanceof AppError) throw err;
    }
  }

  validatePricingAndDuration(data) {
    const minPrice = Number(data.minimum_price);
    if (!Number.isFinite(minPrice) || minPrice <= 0) {
      throw new AppError("Minimum price must be a valid positive amount", 400);
    }

    if (data.maximum_price !== undefined && data.maximum_price !== null) {
      const maxPrice = Number(data.maximum_price);
      if (!Number.isFinite(maxPrice) || maxPrice < minPrice) {
        throw new AppError("Maximum price must be greater than or equal to minimum price", 400);
      }
    }

    if (data.offer_price !== undefined && data.offer_price !== null) {
      const offerPrice = Number(data.offer_price);
      if (!Number.isFinite(offerPrice) || offerPrice <= 0 || offerPrice > minPrice) {
        throw new AppError("Offer price must be greater than 0 and less than or equal to minimum price", 400);
      }
    }

    const duration = Number(data.duration_minutes || 60);
    if (!Number.isInteger(duration) || duration < 15 || duration > 720) {
      throw new AppError("Service duration must be between 15 and 720 minutes", 400);
    }

    if (data.travel_charges !== undefined && data.travel_charges !== null) {
      const travel = Number(data.travel_charges);
      if (!Number.isFinite(travel) || travel < 0) {
        throw new AppError("Travel charges must be a non-negative amount", 400);
      }
    }

    if (data.advance_payment_percentage !== undefined && data.advance_payment_percentage !== null) {
      const advance = Number(data.advance_payment_percentage);
      if (!Number.isFinite(advance) || advance < 0 || advance > 100) {
        throw new AppError("Advance payment percentage must be between 0 and 100", 400);
      }
    }
  }

  async createNewService(userId, data) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);
    if (artist.verification_status !== "APPROVED") {
      throw new AppError("Only approved artists can create services", 403);
    }

    if (!data.specialization_name || !data.specialization_name.trim()) {
      throw new AppError("Specialization name is required", 400);
    }

    // Guard: ensures the DB column is JSONB before attempting to store an array.
    // If still VARCHAR, this throws a clear 500 with migration instructions.
    await this._assertCategoryColumnIsJson();

    const canonicalCategory = await this.validateCategory(data.category);
    this.validatePricingAndDuration(data);

    // Duplicate service protection
    const existingService = await db.Service.findOne({
      where: {
        artist_id: artist.id,
        specialization_name: data.specialization_name.trim(),
        is_active: true
      }
    });
    if (existingService) {
      throw new AppError("A service with this specialization name already exists in your profile", 400);
    }

    const t = await db.sequelize.transaction();
    try {
      const service = await db.Service.create({
        artist_id: artist.id,
        specialization_name: data.specialization_name.trim(),
        category: canonicalCategory,
        description: data.description ? String(data.description).trim() : "",
        minimum_price: Number(data.minimum_price),
        maximum_price: data.maximum_price ? Number(data.maximum_price) : null,
        duration_minutes: Number(data.duration_minutes || 60),
        service_image: data.service_image || null,
        is_home_service: data.is_home_service !== undefined ? Boolean(data.is_home_service) : true,
        is_salon_service: data.is_salon_service !== undefined ? Boolean(data.is_salon_service) : false,
        service_tier: data.service_tier || 'STANDARD',
        is_active: true,
        offer_price: data.offer_price ? Number(data.offer_price) : null,
        travel_charges: data.travel_charges ? Number(data.travel_charges) : 0,
        minimum_booking_amount: data.minimum_booking_amount ? Number(data.minimum_booking_amount) : 0,
        advance_payment_percentage: data.advance_payment_percentage ? Number(data.advance_payment_percentage) : 0,
        tags: data.tags || ""
      }, { transaction: t });

      if (data.packages && Array.isArray(data.packages)) {
        const seenPackages = new Set();
        for (const p of data.packages) {
          const pkgName = String(p.package_name || "").trim();
          if (!pkgName) throw new AppError("Package name cannot be empty", 400);
          if (seenPackages.has(pkgName.toLowerCase())) {
            throw new AppError(`Duplicate package name '${pkgName}' in service creation`, 400);
          }
          seenPackages.add(pkgName.toLowerCase());

          const pkgPrice = Number(p.package_price);
          if (!Number.isFinite(pkgPrice) || pkgPrice <= 0) {
            throw new AppError(`Package '${pkgName}' price must be a valid positive number`, 400);
          }

          await db.ServicePackage.create({
            service_id: service.id,
            package_name: pkgName,
            package_price: pkgPrice,
            included_designs: p.included_designs || "",
            duration: Number(p.duration || 60),
            number_of_hands: Number(p.number_of_hands || 0),
            number_of_feet: Number(p.number_of_feet || 0),
            home_visit: p.home_visit !== undefined ? p.home_visit : true,
            touch_up_included: p.touch_up_included !== undefined ? p.touch_up_included : false,
            aftercare_included: p.aftercare_included !== undefined ? p.aftercare_included : false
          }, { transaction: t });
        }
      }

      if (data.addons && Array.isArray(data.addons)) {
        for (const a of data.addons) {
          const addonName = String(a.addon_name || "").trim();
          if (!addonName) continue;
          const addonPrice = Number(a.addon_price);
          if (!Number.isFinite(addonPrice) || addonPrice <= 0) {
            throw new AppError(`Addon '${addonName}' price must be a valid positive number`, 400);
          }

          await db.ServiceAddon.create({
            service_id: service.id,
            addon_name: addonName,
            addon_price: addonPrice,
            description: a.description || ""
          }, { transaction: t });
        }
      }

      await t.commit();
      return await this.getServiceDetails(service.id);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async updateServiceDetails(id, userId, data) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const service = await db.Service.findByPk(id);
    if (!service) throw new AppError("Service not found", 404);
    if (service.artist_id !== artist.id) throw new AppError("Unauthorized access to service", 403);

    let canonicalCategory = service.category;
    if (data.category) {
      canonicalCategory = await this.validateCategory(data.category);
    }

    if (data.minimum_price !== undefined || data.duration_minutes !== undefined || data.maximum_price !== undefined) {
      this.validatePricingAndDuration({
        minimum_price: data.minimum_price !== undefined ? data.minimum_price : service.minimum_price,
        maximum_price: data.maximum_price !== undefined ? data.maximum_price : service.maximum_price,
        offer_price: data.offer_price !== undefined ? data.offer_price : service.offer_price,
        duration_minutes: data.duration_minutes !== undefined ? data.duration_minutes : service.duration_minutes,
        travel_charges: data.travel_charges !== undefined ? data.travel_charges : service.travel_charges,
        advance_payment_percentage: data.advance_payment_percentage !== undefined ? data.advance_payment_percentage : service.advance_payment_percentage
      });
    }

    const t = await db.sequelize.transaction();
    try {
      await service.update({
        specialization_name: data.specialization_name ? String(data.specialization_name).trim() : service.specialization_name,
        category: canonicalCategory,
        description: data.description !== undefined ? data.description : service.description,
        minimum_price: data.minimum_price !== undefined ? Number(data.minimum_price) : service.minimum_price,
        maximum_price: data.maximum_price !== undefined ? Number(data.maximum_price) : service.maximum_price,
        duration_minutes: data.duration_minutes !== undefined ? Number(data.duration_minutes) : service.duration_minutes,
        service_image: data.service_image !== undefined ? data.service_image : service.service_image,
        is_home_service: data.is_home_service !== undefined ? Boolean(data.is_home_service) : service.is_home_service,
        is_salon_service: data.is_salon_service !== undefined ? Boolean(data.is_salon_service) : service.is_salon_service,
        offer_price: data.offer_price !== undefined ? Number(data.offer_price) : service.offer_price,
        travel_charges: data.travel_charges !== undefined ? Number(data.travel_charges) : service.travel_charges,
        minimum_booking_amount: data.minimum_booking_amount !== undefined ? Number(data.minimum_booking_amount) : service.minimum_booking_amount,
        advance_payment_percentage: data.advance_payment_percentage !== undefined ? Number(data.advance_payment_percentage) : service.advance_payment_percentage,
        tags: data.tags !== undefined ? data.tags : service.tags
      }, { transaction: t });

      // Recreate packages
      if (data.packages && Array.isArray(data.packages)) {
        await db.ServicePackage.destroy({ where: { service_id: service.id }, transaction: t });
        const seenPackages = new Set();
        for (const p of data.packages) {
          const pkgName = String(p.package_name || "").trim();
          if (!pkgName) continue;
          if (seenPackages.has(pkgName.toLowerCase())) {
            throw new AppError(`Duplicate package name '${pkgName}'`, 400);
          }
          seenPackages.add(pkgName.toLowerCase());

          const pkgPrice = Number(p.package_price);
          if (!Number.isFinite(pkgPrice) || pkgPrice <= 0) {
            throw new AppError(`Package '${pkgName}' price must be a valid positive number`, 400);
          }

          await db.ServicePackage.create({
            service_id: service.id,
            package_name: pkgName,
            package_price: pkgPrice,
            included_designs: p.included_designs || "",
            duration: Number(p.duration || 60),
            number_of_hands: Number(p.number_of_hands || 0),
            number_of_feet: Number(p.number_of_feet || 0),
            home_visit: p.home_visit !== undefined ? p.home_visit : true,
            touch_up_included: p.touch_up_included !== undefined ? p.touch_up_included : false,
            aftercare_included: p.aftercare_included !== undefined ? p.aftercare_included : false
          }, { transaction: t });
        }
      }

      // Recreate addons
      if (data.addons && Array.isArray(data.addons)) {
        await db.ServiceAddon.destroy({ where: { service_id: service.id }, transaction: t });
        for (const a of data.addons) {
          const addonName = String(a.addon_name || "").trim();
          if (!addonName) continue;
          const addonPrice = Number(a.addon_price);
          if (!Number.isFinite(addonPrice) || addonPrice <= 0) {
            throw new AppError(`Addon '${addonName}' price must be a valid positive number`, 400);
          }

          await db.ServiceAddon.create({
            service_id: service.id,
            addon_name: addonName,
            addon_price: addonPrice,
            description: a.description || ""
          }, { transaction: t });
        }
      }

      await t.commit();
      return await this.getServiceDetails(service.id);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async deleteServiceItem(id, userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const service = await db.Service.findByPk(id);
    if (!service) throw new AppError("Service not found", 404);
    if (service.artist_id !== artist.id) throw new AppError("Unauthorized access to service", 403);

    // Check if linked to active upcoming bookings
    const activeBooking = await db.Booking.findOne({
      where: {
        service_id: service.id,
        booking_status: { [Op.in]: ["CONFIRMED", "PENDING", "ACCEPTED", "IN_PROGRESS", "ARTIST_ACCEPTED"] }
      }
    });

    if (activeBooking) {
      // Soft deactivate to protect historical/active bookings
      await service.update({ is_active: false });
      return { deactivated: true, message: "Service has active bookings, marked as inactive" };
    }

    await service.destroy();
    return { deleted: true };
  }

  async updateServiceActiveStatus(id, userId, isActive) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const service = await db.Service.findByPk(id);
    if (!service) throw new AppError("Service not found", 404);
    if (service.artist_id !== artist.id) throw new AppError("Unauthorized access to service", 403);

    await service.update({ is_active: Boolean(isActive) });
    return service;
  }

  async uploadServiceMedia(id, userId, imageUrl) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const service = await db.Service.findByPk(id);
    if (!service) throw new AppError("Service not found", 404);
    if (service.artist_id !== artist.id) throw new AppError("Unauthorized access to service", 403);

    await service.update({ service_image: imageUrl });
    return service;
  }

  // Standalone Package Management
  async createServicePackage(serviceId, userId, packageData) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const service = await db.Service.findByPk(serviceId);
    if (!service) throw new AppError("Service not found", 404);
    if (service.artist_id !== artist.id) throw new AppError("Unauthorized access to service", 403);

    const pkgName = String(packageData.package_name || "").trim();
    if (!pkgName) throw new AppError("Package name is required", 400);

    const pkgPrice = Number(packageData.package_price);
    if (!Number.isFinite(pkgPrice) || pkgPrice <= 0) {
      throw new AppError("Package price must be a valid positive number", 400);
    }

    const existing = await db.ServicePackage.findOne({
      where: { service_id: service.id, package_name: pkgName }
    });
    if (existing) {
      throw new AppError(`A package with name '${pkgName}' already exists under this service`, 400);
    }

    return await db.ServicePackage.create({
      service_id: service.id,
      package_name: pkgName,
      package_price: pkgPrice,
      included_designs: packageData.included_designs || "",
      duration: Number(packageData.duration || 60),
      number_of_hands: Number(packageData.number_of_hands || 0),
      number_of_feet: Number(packageData.number_of_feet || 0),
      home_visit: packageData.home_visit !== undefined ? packageData.home_visit : true,
      touch_up_included: packageData.touch_up_included !== undefined ? packageData.touch_up_included : false,
      aftercare_included: packageData.aftercare_included !== undefined ? packageData.aftercare_included : false
    });
  }

  async updateServicePackage(packageId, userId, packageData) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const pkg = await db.ServicePackage.findByPk(packageId, {
      include: [{ model: db.Service, as: "service" }]
    });
    if (!pkg) throw new AppError("Package not found", 404);
    if (!pkg.service || pkg.service.artist_id !== artist.id) {
      throw new AppError("Unauthorized access to package", 403);
    }

    const updates = {};
    if (packageData.package_name) updates.package_name = String(packageData.package_name).trim();
    if (packageData.package_price !== undefined) {
      const price = Number(packageData.package_price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new AppError("Package price must be a valid positive number", 400);
      }
      updates.package_price = price;
    }
    if (packageData.duration !== undefined) updates.duration = Number(packageData.duration);
    if (packageData.included_designs !== undefined) updates.included_designs = packageData.included_designs;
    if (packageData.home_visit !== undefined) updates.home_visit = Boolean(packageData.home_visit);
    if (packageData.touch_up_included !== undefined) updates.touch_up_included = Boolean(packageData.touch_up_included);
    if (packageData.aftercare_included !== undefined) updates.aftercare_included = Boolean(packageData.aftercare_included);

    await pkg.update(updates);
    return pkg;
  }

  async deleteServicePackage(packageId, userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const pkg = await db.ServicePackage.findByPk(packageId, {
      include: [{ model: db.Service, as: "service" }]
    });
    if (!pkg) throw new AppError("Package not found", 404);
    if (!pkg.service || pkg.service.artist_id !== artist.id) {
      throw new AppError("Unauthorized access to package", 403);
    }

    await pkg.destroy();
    return true;
  }

  // Availability, Working Schedule & Leave Management
  async getAvailabilitySchedule(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    return {
      artist_id: artist.id,
      is_available: artist.is_available,
      working_days: artist.working_days || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      working_start_time: artist.working_start_time || "09:00",
      working_end_time: artist.working_end_time || "20:00",
      break_start_time: artist.break_start_time || "14:00",
      break_end_time: artist.break_end_time || "15:00",
      leave_dates: artist.leave_dates || [],
      min_advance_hours: artist.min_advance_hours || 2,
      max_advance_days: artist.max_advance_days || 60,
      max_bookings_per_day: artist.max_bookings_per_day || 4
    };
  }

  async updateAvailabilitySchedule(userId, data) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const updates = {};
    const validDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

    if (data.working_days !== undefined) {
      if (!Array.isArray(data.working_days)) {
        throw new AppError("working_days must be an array of weekdays", 400);
      }
      const cleanDays = data.working_days.map(d => String(d).toUpperCase().trim());
      for (const d of cleanDays) {
        if (!validDays.includes(d)) {
          throw new AppError(`Invalid weekday '${d}' in working_days`, 400);
        }
      }
      updates.working_days = cleanDays;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const startTime = data.working_start_time || artist.working_start_time || "09:00";
    const endTime = data.working_end_time || artist.working_end_time || "20:00";

    if (data.working_start_time !== undefined) {
      if (!timeRegex.test(data.working_start_time)) {
        throw new AppError("working_start_time must be in HH:mm format (e.g. 09:00)", 400);
      }
      updates.working_start_time = data.working_start_time;
    }

    if (data.working_end_time !== undefined) {
      if (!timeRegex.test(data.working_end_time)) {
        throw new AppError("working_end_time must be in HH:mm format (e.g. 20:00)", 400);
      }
      updates.working_end_time = data.working_end_time;
    }

    if (startTime >= endTime) {
      throw new AppError("working_start_time must be earlier than working_end_time", 400);
    }

    if (data.break_start_time || data.break_end_time) {
      const bStart = data.break_start_time || artist.break_start_time;
      const bEnd = data.break_end_time || artist.break_end_time;

      if (bStart && !timeRegex.test(bStart)) {
        throw new AppError("break_start_time must be in HH:mm format", 400);
      }
      if (bEnd && !timeRegex.test(bEnd)) {
        throw new AppError("break_end_time must be in HH:mm format", 400);
      }

      if (bStart && bEnd) {
        if (bStart >= bEnd) {
          throw new AppError("break_start_time must be earlier than break_end_time", 400);
        }
        if (bStart < startTime || bEnd > endTime) {
          throw new AppError("Break period must fall entirely within working hours", 400);
        }
      }
      if (data.break_start_time !== undefined) updates.break_start_time = data.break_start_time;
      if (data.break_end_time !== undefined) updates.break_end_time = data.break_end_time;
    }

    if (data.is_available !== undefined) {
      updates.is_available = Boolean(data.is_available);
    }
    if (data.min_advance_hours !== undefined) {
      updates.min_advance_hours = Math.max(0, Number(data.min_advance_hours));
    }
    if (data.max_advance_days !== undefined) {
      updates.max_advance_days = Math.max(1, Number(data.max_advance_days));
    }
    if (data.max_bookings_per_day !== undefined) {
      updates.max_bookings_per_day = Math.max(1, Number(data.max_bookings_per_day));
    }

    await artist.update(updates);
    return await this.getAvailabilitySchedule(userId);
  }

  async addBlockedDate(userId, dateStr) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new AppError("Date must be in YYYY-MM-DD format", 400);
    }

    // Check if artist has existing active bookings on this date
    const activeBooking = await db.Booking.findOne({
      where: {
        artist_id: artist.id,
        booking_status: { [Op.in]: ["CONFIRMED", "ACCEPTED", "IN_PROGRESS", "ARTIST_ACCEPTED"] },
        [Op.or]: [
          db.sequelize.literal(`EXISTS (
            SELECT 1 FROM ${db.sequelize.getDialect() === 'postgres' ? '"AvailabilitySlots"' : 'AvailabilitySlots'} AS slot 
            WHERE slot.id = "Booking".slot_id 
            AND substr(slot.start_time, 1, 10) = '${dateStr}'
          )`),
          { notes: { [Op.like]: `%${dateStr}%` } }
        ]
      }
    });

    if (activeBooking) {
      throw new AppError(`Cannot block date ${dateStr}. You have active confirmed bookings on this day.`, 400);
    }

    const currentLeaves = Array.isArray(artist.leave_dates) ? [...artist.leave_dates] : [];
    if (!currentLeaves.includes(dateStr)) {
      currentLeaves.push(dateStr);
      await artist.update({ leave_dates: currentLeaves });
    }

    return { leave_dates: currentLeaves };
  }

  async removeBlockedDate(userId, dateStr) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const currentLeaves = Array.isArray(artist.leave_dates) ? [...artist.leave_dates] : [];
    const updatedLeaves = currentLeaves.filter(d => d !== dateStr);
    await artist.update({ leave_dates: updatedLeaves });

    return { leave_dates: updatedLeaves };
  }

  async getCustomerServicesList() {
    return await db.Service.findAll({
      where: { is_active: true },
      include: [
        { model: db.ServicePackage, as: "packages" },
        { model: db.ServiceAddon, as: "addons" },
        { model: db.ArtistProfile, as: "artist", include: [{ model: db.User, as: "user", attributes: ["name"] }] }
      ]
    });
  }

  async getLeads(userId, query = {}) {
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });

    const artistId = artist ? artist.id : userId;
    const { status, dateRange, city, category, minPrice, maxPrice, search, sort, page = 1, limit = 50 } = query;
    const offset = (page - 1) * limit;

    const where = {
      [db.Sequelize.Op.or]: [
        { artist_id: artistId },
        { artist_id: userId },
        { artist_id: null },
        { artist_id: 0 }
      ]
    };

    // 1. Search filter
    if (search) {
      const searchPattern = `%${search}%`;
      where[db.Sequelize.Op.or] = [
        { booking_code: { [db.Sequelize.Op.iLike]: searchPattern } },
        { address: { [db.Sequelize.Op.iLike]: searchPattern } }
      ];
    }

    // 2. Budget price filter
    if (minPrice || maxPrice) {
      where.total_price = {};
      if (minPrice) where.total_price[db.Sequelize.Op.gte] = Number(minPrice);
      if (maxPrice) where.total_price[db.Sequelize.Op.lte] = Number(maxPrice);
    }

    // 3. Status filter
    if (status) {
      if (status === "Completed") {
        where.detailed_status = { [db.Sequelize.Op.in]: ["WAITING_FOR_USER_PAYMENT", "COMPLETED", "COMPLETED_CLOSED"] };
      } else if (status === "Accepted") {
        where.booking_status = "CONFIRMED";
        where.detailed_status = { [db.Sequelize.Op.in]: ["CONFIRMED", "ACCEPTED", "ARTIST_ACCEPTED", "ARTIST_ON_THE_WAY", "ARTIST_ARRIVED", "SERVICE_STARTED", "RESCHEDULED"] };
      } else if (status === "Rejected") {
        where.booking_status = "CANCELLED";
        where.detailed_status = "REJECTED";
      } else if (status === "Cancelled") {
        where.booking_status = "CANCELLED";
        where.detailed_status = { [db.Sequelize.Op.ne]: "REJECTED" };
      } else if (status === "Pending" || status === "New Lead") {
        where.booking_status = "PENDING";
        where.detailed_status = { [db.Sequelize.Op.ne]: "VIEWED" };
      } else if (status === "Viewed") {
        where.booking_status = "PENDING";
        where.detailed_status = "VIEWED";
      }
    }

    // 4. Date range filter
    if (dateRange) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      if (dateRange === "Today") {
        where.createdAt = {
          [db.Sequelize.Op.between]: [startOfToday, endOfToday]
        };
      } else if (dateRange === "Tomorrow") {
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        const endOfTomorrow = new Date(endOfToday);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
        where.createdAt = {
          [db.Sequelize.Op.between]: [startOfTomorrow, endOfTomorrow]
        };
      } else if (dateRange === "This Week") {
        const endOfWeek = new Date(startOfToday);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        where.createdAt = {
          [db.Sequelize.Op.between]: [startOfToday, endOfWeek]
        };
      }
    }

    // Include relations
    const include = [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "name", "phone", "email", "profile_image"]
      },
      {
        model: db.Service,
        as: "service",
        attributes: ["id", "specialization_name", "category", "minimum_price"]
      },
      {
        model: db.AvailabilitySlot,
        as: "slot",
        required: false
      }
    ];

    // User search filters
    if (search) {
      const searchPattern = `%${search}%`;
      include[0].where = {
        [db.Sequelize.Op.or]: [
          { name: { [db.Sequelize.Op.iLike]: searchPattern } },
          { phone: { [db.Sequelize.Op.iLike]: searchPattern } }
        ]
      };
      include[0].required = true;
    }

    // Category filter
    if (category) {
      include[1].where = {
        category: { [db.Sequelize.Op.iLike]: `%${category}%` }
      };
      include[1].required = true;
    }

    // Sorting order
    let order = [["createdAt", "DESC"]];
    if (sort === "Oldest") {
      order = [["createdAt", "ASC"]];
    } else if (sort === "Highest Budget") {
      order = [["total_price", "DESC"]];
    } else if (sort === "Lowest Budget") {
      order = [["total_price", "ASC"]];
    }

    const { rows: bookings, count } = await db.Booking.findAndCountAll({
      where,
      include,
      order,
      limit: Number(limit),
      offset: Number(offset),
      distinct: true
    });

    // Format leads list
    const leadsList = bookings.map((b) => {
      let distance = "0.5 km";
      if (b.latitude && b.longitude && artist?.latitude && artist?.longitude) {
        const lat1 = Number(artist.latitude);
        const lon1 = Number(artist.longitude);
        const lat2 = Number(b.latitude);
        const lon2 = Number(b.longitude);
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = `${(R * c).toFixed(1)} km`;
      }

      return {
        id: b.id,
        booking_code: b.booking_code || `BK-${b.id}`,
        customer_name: b.user?.name || "Customer",
        customer_image: b.user?.profile_image || null,
        service_name: b.service?.specialization_name || "Mehndi Service",
        category: b.service?.category || "Regular Mehndi",
        city: b.city || artist?.city || "Jaipur",
        address: b.address,
        booking_date: b.reschedule_date || b.booking_date || b.createdAt,
        booking_time: b.reschedule_time || b.booking_time || "10:00 AM",
        price: b.total_price || b.total_amount || 0,
        distance,
        status: getLeadStatus(b),
        detailed_status: b.detailed_status,
        booking_status: b.booking_status
      };
    });

    let finalLeads = leadsList;
    if (status === "Expired") {
      finalLeads = leadsList.filter(l => l.status === "Expired");
    } else if (status === "New Lead") {
      finalLeads = leadsList.filter(l => l.status === "New Lead");
    }

    const allLeadsForStats = await db.Booking.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { artist_id: artistId },
          { artist_id: userId },
          { artist_id: null },
          { artist_id: 0 }
        ]
      },
      include: [
        { model: db.AvailabilitySlot, as: "slot", required: false }
      ]
    });

    const stats = {
      todayLeads: 0,
      pendingLeads: 0,
      acceptedLeads: 0,
      rejectedLeads: 0,
      completedLeads: 0,
      expiredLeads: 0,
      totalEarnings: 0,
      conversionRate: 100,
      responseTime: "12 mins"
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let totalAcceptTime = 0;
    let acceptCount = 0;

    allLeadsForStats.forEach((lead) => {
      const leadStatus = getLeadStatus(lead);
      const leadCreated = new Date(lead.createdAt);

      if (leadCreated >= todayStart) stats.todayLeads++;
      if (leadStatus === "Pending" || leadStatus === "New Lead" || leadStatus === "Viewed") stats.pendingLeads++;
      if (leadStatus === "Accepted") stats.acceptedLeads++;
      if (leadStatus === "Rejected") stats.rejectedLeads++;
      if (leadStatus === "Completed") stats.completedLeads++;
      if (leadStatus === "Expired") stats.expiredLeads++;
    });

    const wallet = await db.Wallet.findOne({ where: { user_id: userId } });
    stats.totalEarnings = wallet ? wallet.balance : 0;

    const totalLeads = allLeadsForStats.length;
    if (totalLeads > 0) {
      stats.conversionRate = Math.round(((stats.acceptedLeads + stats.completedLeads) / totalLeads) * 100);
    }

    const activities = await db.LeadActivity.findAll({
      where: { activity_type: ["ACCEPTED", "REJECTED"] },
      include: [{
        model: db.Booking,
        as: "booking",
        where: {
          [db.Sequelize.Op.or]: [
            { artist_id: artistId },
            { artist_id: userId }
          ]
        },
        required: true
      }]
    }).catch(() => []);

    activities.forEach((act) => {
      const created = new Date(act.booking.createdAt);
      const updated = new Date(act.createdAt);
      const diffMins = Math.round((updated - created) / 60000);
      if (diffMins > 0) {
        totalAcceptTime += diffMins;
        acceptCount++;
      }
    });

    if (acceptCount > 0) {
      stats.responseTime = `${Math.round(totalAcceptTime / acceptCount)} mins`;
    }

    return {
      leads: finalLeads,
      stats,
      totalCount: count
    };
  }

  async getLeadById(id, userId) {
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });

    const artistId = artist ? artist.id : userId;

    const booking = await db.Booking.findByPk(id, {
      include: [
        { model: db.User, as: "user", attributes: ["id", "name", "phone", "email", "profile_image"] },
        { model: db.Service, as: "service", attributes: ["id", "specialization_name", "category", "minimum_price", "description"] },
        { model: db.AvailabilitySlot, as: "slot", required: false }
      ]
    });

    if (!booking) throw new AppError("Lead booking not found", 404);
    if (booking.artist_id && booking.artist_id !== artistId && booking.artist_id !== userId) {
      throw new AppError("Unauthorized access to lead", 403);
    }

    let distance = "0.5 km";
    if (booking.latitude && booking.longitude && artist.latitude && artist.longitude) {
      const lat1 = Number(artist.latitude);
      const lon1 = Number(artist.longitude);
      const lat2 = Number(booking.latitude);
      const lon2 = Number(booking.longitude);
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distance = `${(R * c).toFixed(1)} km`;
    }

    return {
      id: booking.id,
      booking_code: booking.booking_code,
      customer: {
        id: booking.user?.id,
        name: booking.user?.name || "Customer",
        phone: booking.user?.phone || "",
        email: booking.user?.email || "",
        profile_image: booking.user?.profile_image || null
      },
      service: {
        id: booking.service?.id,
        name: booking.service?.specialization_name || "Mehndi Service",
        category: booking.service?.category || "Regular Mehndi",
        description: booking.service?.description || "",
        price: booking.total_price
      },
      address: booking.address,
      landmark: booking.landmark,
      latitude: booking.latitude,
      longitude: booking.longitude,
      notes: booking.notes,
      booking_date: booking.reschedule_date || booking.createdAt,
      booking_time: booking.reschedule_time || "10:00 AM",
      status: getLeadStatus(booking),
      detailed_status: booking.detailed_status,
      booking_status: booking.booking_status,
      payment_status: booking.payment_status,
      distance
    };
  }

  async viewLead(id, userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const booking = await db.Booking.findByPk(id);
    if (!booking) throw new AppError("Lead booking not found", 404);
    if (booking.artist_id !== artist.id) throw new AppError("Unauthorized access to lead", 403);

    if (booking.booking_status === "PENDING" && booking.detailed_status === "PENDING") {
      await booking.update({ detailed_status: "VIEWED" });
      await db.LeadActivity.create({
        booking_id: booking.id,
        activity_type: "VIEWED",
        notes: "Lead opened and viewed by artist"
      });
    }

    return { success: true };
  }

  async acceptLead(id, userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    if (artist.verification_status !== "APPROVED") {
      throw new AppError("Only approved artists with verified KYC can accept booking leads", 403);
    }

    const booking = await db.Booking.findByPk(id, {
      include: [{ model: db.AvailabilitySlot, as: "slot", required: false }]
    });

    if (booking.artist_id && Number(booking.artist_id) !== Number(artist.id)) {
      throw new AppError("Unauthorized access to lead", 403);
    }

    const leadStatus = getLeadStatus(booking);
    if (leadStatus === "Accepted" || leadStatus === "Completed") {
      throw new AppError("Lead already accepted or completed", 400);
    }
    if (leadStatus === "Expired") {
      throw new AppError("Cannot accept an expired lead", 400);
    }
    if (leadStatus === "Rejected" || leadStatus === "Cancelled") {
      throw new AppError("Cannot accept a rejected or cancelled lead", 400);
    }

    await booking.update({
      artist_id: artist.id,
      booking_status: "CONFIRMED",
      detailed_status: "ARTIST_ACCEPTED"
    });

    await db.LeadActivity.create({
      booking_id: booking.id,
      activity_type: "ACCEPTED",
      notes: "Lead accepted by artist"
    });

    if (booking.slot_id) {
      await db.AvailabilitySlot.update({ is_booked: true }, { where: { id: booking.slot_id } });
    }

    await db.Notification.create({
      user_id: booking.user_id,
      title: "Booking Accepted",
      message: `Your booking request #${booking.booking_code} has been accepted by the artist!`,
      type: "BOOKING",
      data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
    });

    try {
      const io = getIO();
      io.to(booking.user_id.toString()).emit("new_notification", {
        title: "Booking Accepted",
        message: `Your booking request #${booking.booking_code} has been accepted by the artist!`,
        type: "BOOKING",
        data: { bookingId: booking.id, booking_id: booking.id }
      });
      io.to(booking.user_id.toString()).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CONFIRMED",
        detailed_status: "ACCEPTED",
        status: "ACCEPTED",
        timestamp: new Date()
      });
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CONFIRMED",
        detailed_status: "ACCEPTED",
        status: "ACCEPTED",
        timestamp: new Date()
      });
    } catch {}

    return { success: true };
  }

  async rejectLead(id, userId, rejectReason) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const booking = await db.Booking.findByPk(id);
    if (!booking) throw new AppError("Lead booking not found", 404);
    if (booking.artist_id !== artist.id) throw new AppError("Unauthorized access to lead", 403);

    const leadStatus = getLeadStatus(booking);
    if (leadStatus === "Rejected" || leadStatus === "Cancelled") {
      throw new AppError("Lead already rejected or cancelled", 400);
    }
    if (leadStatus === "Completed") {
      throw new AppError("Cannot reject a completed lead", 400);
    }

    await booking.update({
      booking_status: "CANCELLED",
      detailed_status: "REJECTED",
      cancel_reason: rejectReason || "Rejected by artist"
    });

    await db.LeadActivity.create({
      booking_id: booking.id,
      activity_type: "REJECTED",
      notes: `Lead rejected by artist. Reason: ${rejectReason || "No reason specified"}`
    });

    if (booking.slot_id) {
      await db.AvailabilitySlot.update({ is_booked: false }, { where: { id: booking.slot_id } });
    }

    await db.Notification.create({
      user_id: booking.user_id,
      title: "Booking Declined",
      message: `Your booking request #${booking.booking_code} was declined by the artist.`,
      type: "BOOKING",
      data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
    });

    try {
      const io = getIO();
      io.to(booking.user_id.toString()).emit("new_notification", {
        title: "Booking Declined",
        message: `Your booking request #${booking.booking_code} was declined by the artist.`,
        type: "BOOKING",
        data: { bookingId: booking.id, booking_id: booking.id }
      });
      io.to(booking.user_id.toString()).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CANCELLED",
        detailed_status: "REJECTED",
        status: "REJECTED",
        timestamp: new Date()
      });
      io.to(`booking_room_${booking.id}`).emit("booking_status_updated", {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        booking_status: "CANCELLED",
        detailed_status: "REJECTED",
        status: "REJECTED",
        timestamp: new Date()
      });
    } catch {}

    return { success: true };
  }
}

function getLeadStatus(booking) {
  if (booking.booking_status === "COMPLETED") return "Completed";
  if (["WAITING_FOR_USER_PAYMENT", "COMPLETED_CLOSED"].includes(booking.detailed_status)) return "Completed";
  if (booking.booking_status === "CONFIRMED") return "Accepted";
  
  if (booking.booking_status === "PENDING") {
    const now = new Date();
    if (booking.slot && booking.slot.start_time) {
      const slotStart = new Date(booking.slot.start_time);
      if (slotStart < now) return "Expired";
    } else if (booking.reschedule_date) {
      const resched = new Date(booking.reschedule_date);
      if (resched < now) return "Expired";
    }
  }

  if (booking.booking_status === "CANCELLED") {
    if (booking.detailed_status === "REJECTED") return "Rejected";
    return "Cancelled";
  }

  if (booking.booking_status === "PENDING") {
    if (booking.detailed_status === "VIEWED") return "Viewed";
    return "New Lead";
  }

  return booking.booking_status;
}

module.exports = new ArtistService();
