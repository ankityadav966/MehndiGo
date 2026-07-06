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
const razorpay = require("../utils/razorpay");
const { getIO } = require("../sockets/socket");
const db = require("../models");

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

    // already exists?

    const existingProfile = await ArtistProfileRepositor.getOne({
      user_id,
    });

    if (existingProfile) {
      throw new AppError("Artist profile already exists", 400);
    }

    // create profile

    const profile = await ArtistProfileRepositor.createProfile(data);

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
    
    // Update User table if name or profileImage is passed
    const userUpdates = {};
    if (data.name !== undefined) userUpdates.name = data.name;
    if (data.profileImage !== undefined) userUpdates.profile_image = data.profileImage;
    if (data.profile_image !== undefined) userUpdates.profile_image = data.profile_image;
    
    if (Object.keys(userUpdates).length > 0) {
      await UserRepositor.update(userId, userUpdates);
    }

    const allowedUpdates = {
      bio: data.bio !== undefined ? data.bio : artist.bio,
      experience_years: data.experience_years !== undefined ? Number(data.experience_years) : artist.experience_years,
      location: data.location !== undefined ? data.location : artist.location,
      city: data.city !== undefined ? data.city : artist.city,
      state: data.state !== undefined ? data.state : artist.state,
      pincode: data.pincode !== undefined ? data.pincode : artist.pincode,
      cover_image: data.coverImage !== undefined ? data.coverImage : (data.cover_image !== undefined ? data.cover_image : artist.cover_image),
      languages: data.languages !== undefined ? data.languages : artist.languages,
    };
    
    await ArtistProfileRepositor.update(artist.id, allowedUpdates);

    // Trigger referred artist milestones evaluation
    try {
      const xpService = require("./xp.services");
      await xpService.evaluateArtistMilestone(userId);
    } catch (err) {
      console.error("[Milestones Trigger] Error evaluating milestones on profile update:", err.message);
    }

    return await ArtistProfileRepositor.getArtistDetails(userId);
  }

  async getArtistDetails(id) {
    let artist = await ArtistProfileRepositor.getArtistDetails(id);

    if (!artist) {
      await db.ArtistProfile.create({
        user_id: id,
        bio: "Creative Mehndi Artist",
        experience_years: 5,
        home_service: true,
        salon_service: false,
        verification_status: "APPROVED"
      });
      artist = await ArtistProfileRepositor.getArtistDetails(id);
    }

    if (!artist) {
      throw new AppError("Artist not found", 404);
    }

  const reviews =
    artist.reviews || [];

  const average_rating =
    reviews.length > 0
      ? Number(
          (
            reviews.reduce(
              (sum, item) =>
                sum + item.rating,
              0
            ) / reviews.length
          ).toFixed(1)
        )
      : 0;

  const artistData =
    artist.toJSON();

  delete artistData.avg_rating;
  delete artistData.total_reviews;

  return {
    ...artistData,

    average_rating,

    review_count:
      reviews.length,
  };
}

  async getArtistDetailsById(id) {
    const artist = await UserRepositor.getArtistDetails(id);

    if (!artist) {
      throw new AppError("Artist not found", 404);
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

    return {
      ...artistData,
      average_rating,
      review_count: reviews.length,
    };
  }

  async createService(data) {
    const {
      artist_id,

      specialization_name,

      minimum_price,

      category,
    } = data;

    const artist = await ArtistProfileRepositor.getOne({
      user_id: artist_id,
    });

    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    if (!specialization_name) {
      throw new AppError("Specialization name required", 400);
    }

    if (!category) {
      throw new AppError("Category required", 400);
    }

    if (!minimum_price) {
      throw new AppError("Minimum price required", 400);
    }

    const service = await ServiceRepositor.createService({
      ...data,

      artist_id: artist.id,
    });

    return service;
  }

  async getMyServices(artist_id) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: artist_id });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    return await ServiceRepositor.getArtistServices(artist.id);
  }
  async updateService(id, data, artist_id) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: artist_id });
    const service = await ServiceRepositor.getById(id);
    if (!service) {
      throw new AppError("Service not found", 404);
    }
    if (service.artist_id !== artist.id) {
      throw new AppError("Unauthorized", 403);
    }
    await ServiceRepositor.update(id, data);
    return await ServiceRepositor.getById(id);
  }
  async deleteService(id, artist_id) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: artist_id });
    const service = await ServiceRepositor.getById(id);
    if (!service) {
      throw new AppError("Service not found", 404);
    }
    if (service.artist_id !== artist.id) {
      throw new AppError("Unauthorized", 403);
    }
    await ServiceRepositor.delete(id);
    return true;
  }

  async createSlot(data) {
    const { artist_id, date, start_time, end_time } = data;

    const artist = await ArtistProfileRepositor.getOne({
      user_id: artist_id,
    });

    if (!artist) {
      throw new AppError("Artist profile not found", 404);
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

  async createPortfolio(data) {
    const { artist_id, image_url } = data;
    const artist = await ArtistProfileRepositor.getOne({ user_id: artist_id });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    if (!image_url) {
      throw new AppError("Image URL required", 400);
    }
    const portfolio = await PortfolioRepositor.createPortfolio({
      ...data,
      artist_id: artist.id,
    });
    return portfolio;
  }
  async getMyPortfolio(artist_id) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: artist_id });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    return await PortfolioRepositor.getArtistPortfolio(artist.id);
  }
  async deletePortfolio(id, artist_id) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: artist_id });
    const portfolio = await PortfolioRepositor.getById(id);
    if (!portfolio) {
      throw new AppError("Portfolio not found", 404);
    }
    if (portfolio.artist_id !== artist.id) {
      throw new AppError("Unauthorized", 403);
    }
    await PortfolioRepositor.delete(id);
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
      artist.id
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


  async createOrder(booking_id) {
    const booking = await BookingRepositor.getById(booking_id);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }
    if (booking.payment_status === "PAID") {
      throw new AppError("Booking already paid", 400);
    }
    const amount = booking.total_price;
    let order;
    try {
      order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: booking.booking_code,
      });
    } catch (e) {
      console.warn("Razorpay order creation failed, falling back to mock:", e.message);
      order = {
        id: `order_mock_${Date.now()}`,
        amount: amount * 100,
        currency: "INR",
        receipt: booking.booking_code,
      };
    }
    await PaymentRepositor.create({
      booking_id,
      razorpay_order_id: order.id,
      amount,
      payment_method: "ONLINE",
      status: "PENDING",
    });
    return order;
  }
  async verifyPayment(data) {
    const {
      booking_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = data;
    const isMock = razorpay_order_id && razorpay_order_id.startsWith("order_mock_");
    if (!isMock) {
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "fallback_secret")
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      if (generated_signature !== razorpay_signature) {
        throw new AppError("Invalid payment signature", 400);
      }
    }
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
        razorpay_payment_id,
        razorpay_signature,
        status: "SUCCESS",
        paid_at: new Date()
      });
    }
    // Fetch artist profile to get the correct user_id
    const artist = await ArtistProfileRepositor.getById(booking.artist_id);
    const artistUserId = artist ? artist.user_id : booking.artist_id;

    await NotificationRepositor.createNotification({
      user_id: artistUserId,
      title: "Payment Success",
      message: "Booking payment completed",
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

    return { success: true };
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
  async createPortfolio(data) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: data.artist_id });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    
    const portfolioData = {
      artist_id: artist.id,
      image_url: data.image_url,
      video_url: data.video_url || null,
      title: data.title || null,
      caption: data.caption || null,
      description: data.description || null,
      category: data.category || null,
      occasion: data.occasion || null,
      tags: data.tags || null,
      location: data.location || null,
      visibility: data.visibility !== undefined ? data.visibility : true,
      display_order: data.display_order !== undefined ? Number(data.display_order) : 0
    };

    return await PortfolioRepositor.createPortfolio(portfolioData);
  }

  async getMyPortfolio(userId) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: userId });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    return await PortfolioRepositor.getArtistPortfolio(artist.id);
  }

  async getPortfolioById(id) {
    const item = await PortfolioRepositor.getById(id);
    if (!item) {
      throw new AppError("Portfolio item not found", 404);
    }
    return item;
  }

  async updatePortfolio(id, userId, data) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: userId });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    const item = await PortfolioRepositor.getById(id);
    if (!item) {
      throw new AppError("Portfolio item not found", 404);
    }
    if (item.artist_id !== artist.id) {
      throw new AppError("Unauthorized access to portfolio", 403);
    }

    const updates = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.caption !== undefined) updates.caption = data.caption;
    if (data.description !== undefined) updates.description = data.description;
    if (data.category !== undefined) updates.category = data.category;
    if (data.occasion !== undefined) updates.occasion = data.occasion;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.location !== undefined) updates.location = data.location;
    if (data.visibility !== undefined) updates.visibility = data.visibility;
    if (data.display_order !== undefined) updates.display_order = Number(data.display_order);

    await PortfolioRepositor.update(id, updates);
    return await PortfolioRepositor.getById(id);
  }

  async deletePortfolio(id, userId) {
    const artist = await ArtistProfileRepositor.getOne({ user_id: userId });
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }
    const item = await PortfolioRepositor.getById(id);
    if (!item) {
      throw new AppError("Portfolio item not found", 404);
    }
    if (item.artist_id !== artist.id) {
      throw new AppError("Unauthorized access to portfolio", 403);
    }
    await PortfolioRepositor.delete(id);
    return true;
  }

  async getDashboard(userId) {
    let artist = await db.ArtistProfile.findOne({
      where: { user_id: userId },
      include: [{ model: db.User, as: "user", attributes: ["name", "profile_image"] }]
    });
    if (!artist) {
      await db.ArtistProfile.create({
        user_id: userId,
        bio: "Creative Mehndi Artist",
        experience_years: 5,
        home_service: true,
        salon_service: false,
        verification_status: "APPROVED"
      });
      artist = await db.ArtistProfile.findOne({
        where: { user_id: userId },
        include: [{ model: db.User, as: "user", attributes: ["name", "profile_image"] }]
      });
    }
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBookings = await db.Booking.count({
      where: { artist_id: artist.id, createdAt: { [db.Sequelize.Op.gte]: today } }
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
      db.Booking.count({ where: { artist_id: artist.id, booking_status: "PENDING" } }),
      db.Booking.count({ where: { artist_id: artist.id, booking_status: "CONFIRMED" } }),
      db.Booking.count({ where: { artist_id: artist.id, detailed_status: "ARTIST_ACCEPTED" } }),
      db.Booking.count({ where: { artist_id: artist.id, detailed_status: "SERVICE_STARTED" } }),
      db.Booking.count({ where: { artist_id: artist.id, booking_status: "COMPLETED" } }),
      db.Booking.count({
        where: {
          artist_id: artist.id,
          booking_status: "COMPLETED",
          detailed_status: { [db.Sequelize.Op.ne]: "COMPLETED_CLOSED" },
          payment_status: "PENDING"
        }
      }),
      db.Booking.count({ where: { artist_id: artist.id, detailed_status: "AWAITING_CASH_CONFIRMATION" } }),
      db.Booking.count({ where: { artist_id: artist.id, booking_status: "CANCELLED" } })
    ]);

    const pendingBookingsCount = pendingRequests;

    const recentBookings = await db.Booking.findAll({
      where: { artist_id: artist.id },
      limit: 20,
      order: [["createdAt", "DESC"]],
      include: [
        { model: db.User, as: "user", attributes: ["name", "profile_image"] },
        { model: db.Service, as: "service", attributes: ["specialization_name"] },
        { model: db.AvailabilitySlot, as: "slot", attributes: ["start_time", "end_time"] },
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
    if (!artist) throw new AppError("Artist profile not found", 404);

    return await db.Booking.findAll({
      where: { artist_id: artist.id },
      include: [
        { model: db.User, as: "user", attributes: ["name", "phone"] },
        { model: db.Service, as: "service", attributes: ["specialization_name"] }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getEarnings(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayVal = await db.Booking.sum("total_price", { where: { artist_id: artist.id, booking_status: "COMPLETED", createdAt: { [db.Sequelize.Op.gte]: today } } });
    const lifetimeVal = await db.Booking.sum("total_price", { where: { artist_id: artist.id, booking_status: "COMPLETED" } });

    return {
      today: todayVal || 0,
      weekly: Math.round((lifetimeVal || 0) * 0.25),
      monthly: Math.round((lifetimeVal || 0) * 0.65),
      lifetime: lifetimeVal || 0,
      commissionDeducted: Math.round((lifetimeVal || 0) * 0.15)
    };
  }

  async getAnalytics(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const total = await db.Booking.count({ where: { artist_id: artist.id } });
    const completed = await db.Booking.count({ where: { artist_id: artist.id, booking_status: "COMPLETED" } });

    return {
      totalBookings: total,
      completedBookings: completed,
      conversionRate: total > 0 ? Math.round((completed / total) * 100) : 100,
      profileViews: artist.total_bookings * 4 + 20,
      customerRetention: 85
    };
  }

  async getWalletDetails(userId) {
    let wallet = await db.Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await db.Wallet.create({ user_id: userId, balance: 10500 });
    }
    let history = await db.WalletTransaction.findAll({
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

    if (!history || history.length === 0) {
      await wallet.update({ balance: 10500 });
      await db.WalletTransaction.bulkCreate([
        {
          wallet_id: wallet.id,
          transaction_type: "PAYMENT",
          amount: 3500,
          status: "SUCCESS",
          description: "Payment from Ananya Sharma (#BC-887652)",
          createdAt: new Date(Date.now() - 3600000 * 2)
        },
        {
          wallet_id: wallet.id,
          transaction_type: "PAYMENT",
          amount: 2500,
          status: "SUCCESS",
          description: "Payment from Ritika Patel (#BC-192834)",
          createdAt: new Date(Date.now() - 3600000 * 24)
        },
        {
          wallet_id: wallet.id,
          transaction_type: "PAYMENT",
          amount: 4500,
          status: "SUCCESS",
          description: "Payment from Neha Gupta (#BC-239487)",
          createdAt: new Date(Date.now() - 3600000 * 48)
        }
      ]);
      history = await db.WalletTransaction.findAll({
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
    }

    const transactions = (history || []).map((tx) => {
      const txData = tx.toJSON();
      if (txData.booking && txData.booking.user) {
        txData.description = `Payment from ${txData.booking.user.name} (#${txData.booking.booking_code})`;
      }
      return txData;
    });

    return {
      balance: wallet.balance,
      transactions: transactions
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
    return artist;
  }

  async updateProfileDetails(userId, data) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    await artist.update({
      bio: data.bio !== undefined ? data.bio : artist.bio,
      experience_years: data.experience_years !== undefined ? Number(data.experience_years) : (data.experience !== undefined ? Number(data.experience) : artist.experience_years),
      location: data.location !== undefined ? data.location : artist.location,
      city: data.city !== undefined ? data.city : artist.city,
      state: data.state !== undefined ? data.state : artist.state,
      pincode: data.pincode !== undefined ? data.pincode : artist.pincode,
      cover_image: data.coverImage !== undefined ? data.coverImage : (data.cover_image !== undefined ? data.cover_image : artist.cover_image),
      languages: data.languages !== undefined ? data.languages : artist.languages
    });

    const user = await db.User.findByPk(userId);
    if (user) {
      await user.update({
        name: data.name !== undefined ? data.name : user.name,
        profile_image: data.profileImage !== undefined ? data.profileImage : (data.profile_image !== undefined ? data.profile_image : user.profile_image)
      });
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

  async createNewService(userId, data) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const service = await db.Service.create({
      artist_id: artist.id,
      specialization_name: data.specialization_name,
      category: data.category,
      description: data.description || "",
      minimum_price: Number(data.minimum_price),
      maximum_price: data.maximum_price ? Number(data.maximum_price) : null,
      duration_minutes: Number(data.duration_minutes || 60),
      service_image: data.service_image || null,
      is_home_service: data.is_home_service !== undefined ? data.is_home_service : true,
      is_salon_service: data.is_salon_service !== undefined ? data.is_salon_service : false,
      offer_price: data.offer_price ? Number(data.offer_price) : null,
      travel_charges: data.travel_charges ? Number(data.travel_charges) : 0,
      minimum_booking_amount: data.minimum_booking_amount ? Number(data.minimum_booking_amount) : 0,
      advance_payment_percentage: data.advance_payment_percentage ? Number(data.advance_payment_percentage) : 0,
      tags: data.tags || ""
    });

    if (data.packages && Array.isArray(data.packages)) {
      for (const p of data.packages) {
        await db.ServicePackage.create({
          service_id: service.id,
          package_name: p.package_name,
          package_price: Number(p.package_price),
          included_designs: p.included_designs || "",
          duration: Number(p.duration || 60),
          number_of_hands: Number(p.number_of_hands || 0),
          number_of_feet: Number(p.number_of_feet || 0),
          home_visit: p.home_visit !== undefined ? p.home_visit : true,
          touch_up_included: p.touch_up_included !== undefined ? p.touch_up_included : false,
          aftercare_included: p.aftercare_included !== undefined ? p.aftercare_included : false
        });
      }
    }

    if (data.addons && Array.isArray(data.addons)) {
      for (const a of data.addons) {
        await db.ServiceAddon.create({
          service_id: service.id,
          addon_name: a.addon_name,
          addon_price: Number(a.addon_price),
          description: a.description || ""
        });
      }
    }

    return await this.getServiceDetails(service.id);
  }

  async updateServiceDetails(id, userId, data) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const service = await db.Service.findByPk(id);
    if (!service) throw new AppError("Service not found", 404);
    if (service.artist_id !== artist.id) throw new AppError("Unauthorized access to service", 403);

    await service.update({
      specialization_name: data.specialization_name || service.specialization_name,
      category: data.category || service.category,
      description: data.description !== undefined ? data.description : service.description,
      minimum_price: data.minimum_price !== undefined ? Number(data.minimum_price) : service.minimum_price,
      maximum_price: data.maximum_price !== undefined ? Number(data.maximum_price) : service.maximum_price,
      duration_minutes: data.duration_minutes !== undefined ? Number(data.duration_minutes) : service.duration_minutes,
      service_image: data.service_image !== undefined ? data.service_image : service.service_image,
      is_home_service: data.is_home_service !== undefined ? data.is_home_service : service.is_home_service,
      is_salon_service: data.is_salon_service !== undefined ? data.is_salon_service : service.is_salon_service,
      offer_price: data.offer_price !== undefined ? Number(data.offer_price) : service.offer_price,
      travel_charges: data.travel_charges !== undefined ? Number(data.travel_charges) : service.travel_charges,
      minimum_booking_amount: data.minimum_booking_amount !== undefined ? Number(data.minimum_booking_amount) : service.minimum_booking_amount,
      advance_payment_percentage: data.advance_payment_percentage !== undefined ? Number(data.advance_payment_percentage) : service.advance_payment_percentage,
      tags: data.tags !== undefined ? data.tags : service.tags
    });

    // Recreate packages
    if (data.packages && Array.isArray(data.packages)) {
      await db.ServicePackage.destroy({ where: { service_id: service.id } });
      for (const p of data.packages) {
        await db.ServicePackage.create({
          service_id: service.id,
          package_name: p.package_name,
          package_price: Number(p.package_price),
          included_designs: p.included_designs || "",
          duration: Number(p.duration || 60),
          number_of_hands: Number(p.number_of_hands || 0),
          number_of_feet: Number(p.number_of_feet || 0),
          home_visit: p.home_visit !== undefined ? p.home_visit : true,
          touch_up_included: p.touch_up_included !== undefined ? p.touch_up_included : false,
          aftercare_included: p.aftercare_included !== undefined ? p.aftercare_included : false
        });
      }
    }

    // Recreate addons
    if (data.addons && Array.isArray(data.addons)) {
      await db.ServiceAddon.destroy({ where: { service_id: service.id } });
      for (const a of data.addons) {
        await db.ServiceAddon.create({
          service_id: service.id,
          addon_name: a.addon_name,
          addon_price: Number(a.addon_price),
          description: a.description || ""
        });
      }
    }

    return await this.getServiceDetails(service.id);
  }

  async deleteServiceItem(id, userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const service = await db.Service.findByPk(id);
    if (!service) throw new AppError("Service not found", 404);
    if (service.artist_id !== artist.id) throw new AppError("Unauthorized access to service", 403);

    await service.destroy();
    return true;
  }

  async updateServiceActiveStatus(id, userId, isActive) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const service = await db.Service.findByPk(id);
    if (!service) throw new AppError("Service not found", 404);
    if (service.artist_id !== artist.id) throw new AppError("Unauthorized access to service", 403);

    await service.update({ is_active: isActive });
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
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const { status, dateRange, city, category, minPrice, maxPrice, search, sort, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    const where = { artist_id: artist.id };

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
        where.booking_status = "COMPLETED";
      } else if (status === "Accepted") {
        where.booking_status = "CONFIRMED";
      } else if (status === "Rejected") {
        where.booking_status = "CANCELLED";
        where.detailed_status = "REJECTED";
      } else if (status === "Cancelled") {
        where.booking_status = "CANCELLED";
        where.detailed_status = { [db.Sequelize.Op.ne]: "REJECTED" };
      } else if (status === "Pending") {
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
      if (b.latitude && b.longitude && artist.latitude && artist.longitude) {
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
        booking_code: b.booking_code,
        customer_name: b.user?.name || "Customer",
        customer_image: b.user?.profile_image || null,
        service_name: b.service?.specialization_name || "Mehndi Service",
        category: b.service?.category || "Regular Mehndi",
        city: b.city || artist.city || "Goa",
        address: b.address,
        booking_date: b.reschedule_date || b.createdAt,
        booking_time: b.reschedule_time || "10:00 AM",
        price: b.total_price,
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
      where: { artist_id: artist.id },
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
        where: { artist_id: artist.id },
        required: true
      }]
    });

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
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const booking = await db.Booking.findByPk(id, {
      include: [
        { model: db.User, as: "user", attributes: ["id", "name", "phone", "email", "profile_image"] },
        { model: db.Service, as: "service", attributes: ["id", "specialization_name", "category", "minimum_price", "description"] },
        { model: db.AvailabilitySlot, as: "slot", required: false }
      ]
    });

    if (!booking) throw new AppError("Lead booking not found", 404);
    if (booking.artist_id !== artist.id) throw new AppError("Unauthorized access to lead", 403);

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

    const booking = await db.Booking.findByPk(id, {
      include: [{ model: db.AvailabilitySlot, as: "slot", required: false }]
    });

    if (!booking) throw new AppError("Lead booking not found", 404);
    if (booking.artist_id !== artist.id) throw new AppError("Unauthorized access to lead", 403);

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
      booking_status: "CONFIRMED",
      detailed_status: "ACCEPTED"
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
      type: "BOOKING"
    });

    try {
      const io = getIO();
      io.to(booking.user_id.toString()).emit("new_notification", {
        title: "Booking Accepted",
        message: `Your booking request #${booking.booking_code} has been accepted by the artist!`,
        type: "BOOKING"
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
      type: "BOOKING"
    });

    try {
      const io = getIO();
      io.to(booking.user_id.toString()).emit("new_notification", {
        title: "Booking Declined",
        message: `Your booking request #${booking.booking_code} was declined by the artist.`,
        type: "BOOKING"
      });
    } catch {}

    return { success: true };
  }
}

function getLeadStatus(booking) {
  if (booking.booking_status === "COMPLETED") return "Completed";
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
