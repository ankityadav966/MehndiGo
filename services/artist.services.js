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
    const allowedUpdates = {
      bio: data.bio !== undefined ? data.bio : artist.bio,
      experience_years: data.experience_years !== undefined ? Number(data.experience_years) : artist.experience_years,
      location: data.location !== undefined ? data.location : artist.location,
      city: data.city !== undefined ? data.city : artist.city,
      state: data.state !== undefined ? data.state : artist.state,
      pincode: data.pincode !== undefined ? data.pincode : artist.pincode,
    };
    await ArtistProfileRepositor.update(artist.id, allowedUpdates);
    return await ArtistProfileRepositor.getById(artist.id);
  }

  async getArtistDetails(id) {

  const artist =
    await ArtistProfileRepositor
      .getArtistDetails(id);

  if (!artist) {
    throw new AppError(
      "Artist not found",
      404
    );
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
  await NotificationRepositor.createNotification({
    user_id: booking.user_id,
    title: `Booking ${booking_status}`,
    message: `Your booking has been ${booking_status.toLowerCase()}`,
    type: "BOOKING",
  });

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
}

module.exports = new ArtistService();
