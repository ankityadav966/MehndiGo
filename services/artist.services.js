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
  MessageRepository
} = require("../repositories");

const AppError = require("../utils/errors/app.error");
const razorpay = require("../utils/razorpay");

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

  return await ArtistProfileRepositor
    .getArtistByUserId(
      userId
    );
}
  async getArtistDetails(id) {
    const artist = await ArtistProfileRepositor.getArtistDetails(id);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }
    return artist;
  }

  async createService(data) {

  const {
    artist_id,

    specialization_name,

    minimum_price,

    category,
  } = data;

  const artist =
    await ArtistProfileRepositor.getOne({
      user_id: artist_id,
    });

  if (!artist) {

    throw new AppError(
      "Artist profile not found",
      404
    );
  }

  if (!specialization_name) {

    throw new AppError(
      "Specialization name required",
      400
    );
  }

  if (!category) {

    throw new AppError(
      "Category required",
      400
    );
  }

  if (!minimum_price) {

    throw new AppError(
      "Minimum price required",
      400
    );
  }

  const service =
    await ServiceRepositor.createService({

      ...data,

      artist_id:
        artist.id,
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
    console.log("Creating slot with data:", data);

    const {
      artist_id,

      date,

      start_time,

      end_time,
    } = data;

    // artist exists

    const artist = await ArtistProfileRepositor.getOne({
      user_id: artist_id,
    });

    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    // validations

    if (!date) {
      throw new AppError("Date is required", 400);
    }

    if (!start_time) {
      throw new AppError("Start time required", 400);
    }

    if (!end_time) {
      throw new AppError("End time required", 400);
    }

    // create proper datetime

    const startDateTime = new Date(`${date} ${start_time}`);

    const endDateTime = new Date(`${date} ${end_time}`);

    // invalid date check

    if (isNaN(startDateTime.getTime())) {
      throw new AppError("Invalid start time", 400);
    }

    if (isNaN(endDateTime.getTime())) {
      throw new AppError("Invalid end time", 400);
    }

    // end > start

    if (endDateTime <= startDateTime) {
      throw new AppError(
        "End time must be greater than start time",

        400,
      );
    }

    // overlap check

    const overlap = await SlotRepositor.checkOverlap(
      artist.id,

      startDateTime,

      endDateTime,
    );

    if (overlap) {
      throw new AppError("Slot already overlaps", 400);
    }

    // create slot

    const slot = await SlotRepositor.createSlot({
      artist_id: artist.id,

      start_time: startDateTime,

      end_time: endDateTime,
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
    } = data;

    // user exists

    const user = await UserRepositor.getById(user_id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // artist exists

    const artist = await ArtistProfileRepositor.getById(artist_id);

    if (!artist) {
      throw new AppError("Artist not found", 404);
    }

    // service exists

    const service = await ServiceRepositor.getById(service_id);

    if (!service) {
      throw new AppError("Service not found", 404);
    }

    // slot exists

    const slot = await SlotRepositor.getById(slot_id);

    if (!slot) {
      throw new AppError("Slot not found", 404);
    }

    // already booked

    if (slot.is_booked) {
      throw new AppError("Slot already booked", 400);
    }

    // booking code

    const booking_code = `BOOK-${Date.now()}`;

    // total price

    const total_price = service.price;

    // advance payment

    const advance_paid = 0;

    // remaining amount

    const remaining_amount = total_price - advance_paid;

    // booking date

    const booking_date = slot.start_time;

    // create booking

    const booking = await BookingRepositor.createBooking({
      user_id,

      artist_id,

      service_id,

      slot_id,

      address,

      booking_code,

      booking_date,

      start_time: slot.start_time,

      end_time: slot.end_time,

      total_price,

      advance_paid,

      remaining_amount,

      booking_status: "PENDING",

      payment_status: "PENDING",
    });
    await NotificationService
  .createNotification({

    user_id:
      artist.user_id,

    title:
      "New Booking",

    message:
      `New booking received from ${user.name}`,

    type:
      "BOOKING_CREATED",
  });

    // update slot

    await SlotRepositor.update(
      slot_id,

      {
        is_booked: true,
      },
    );

    return booking;
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
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: booking.booking_code,
    });
    await PaymentRepositor.create({
      booking_id,
      razorpay_order_id: order.id,
      amount,
      payment_status: "PENDING",
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
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
    if (generated_signature !== razorpay_signature) {
      throw new AppError("Invalid payment signature", 400);
    }
    const booking = await BookingRepositor.getById(booking_id);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }
    await BookingRepositor.update(booking_id, {
      payment_status: "PAID",
      booking_status: "CONFIRMED",
    });

    const payments = await PaymentRepositor.getAll({ booking_id });
    const payment = payments[0];
    if (payment) {
      await PaymentRepositor.update(payment.id, {
        razorpay_payment_id,
        razorpay_signature,
        payment_status: "PAID",
      });
    }
    await NotificationService
  .createNotification({

    user_id:
      booking.artist_id,

    title:
      "Payment Success",

    message:
      "Booking payment completed",

    type:
      "PAYMENT_SUCCESS",
  });
    return { success: true };
  }

  async createReview(data) {
    const { booking_id, artist_id, user_id, rating, review } = data;
    const booking = await BookingRepositor.getById(booking_id);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }
    if (booking.user_id !== user_id) {
      throw new AppError("Unauthorized", 403);
    }
    if (booking.booking_status !== "COMPLETED") {
      throw new AppError("Review allowed only after completed booking", 400);
    }
    const existingReview = await ReviewRepositor.findBookingReview(booking_id);
    if (existingReview) {
      throw new AppError("Review already submitted", 400);
    }
    if (!rating) {
      throw new AppError("Rating required", 400);
    }
    const newReview = await ReviewRepositor.createReview({
      booking_id,
      artist_id,
      user_id,
      rating,
      review,
    });

    await NotificationService
  .createNotification({

    user_id:
      artist_id,

    title:
      "New Review",

    message:
      "You received a new review",

    type:
      "REVIEW_RECEIVED",
  });cd


    const allReviews = await ReviewRepositor.getArtistReviews(artist_id);
    const totalReviews = allReviews.length;
    const totalRating = allReviews.reduce((sum, item) => sum + item.rating, 0);
    const avgRating = totalRating / totalReviews;
    await ArtistProfileRepositor.update(artist_id, {
      avg_rating: avgRating,
      total_reviews: totalReviews,
    });

    return newReview;
  }
  async getArtistReviews(artist_id) {
    const reviews = await ReviewRepositor.getArtistReviews(artist_id);
    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, item) => sum + item.rating, 0);
    const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0;
    return { avg_rating: avgRating, total_reviews: totalReviews, reviews };
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
