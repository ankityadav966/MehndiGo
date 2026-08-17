// MehndiGo Server Entry Point - Live Reloaded
const envConfig = require("./env.config");

const express = require("express");

const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const app = express();

const { sanitizeInput } = require("./middleware/sanitize.middleware");
const { monitoringMiddleware } = require("./middleware/monitoring.middleware");

app.use(compression());
app.use(sanitizeInput);
app.use(monitoringMiddleware);
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production" || process.env.DEBUG === "true") {
    console.log(`[HTTP DIAGNOSTIC] ${req.method} ${req.originalUrl || req.url}`);
  }
  next();
});




const PORT = process.env.PORT || 3000;

app.use(
  helmet({
    contentSecurityPolicy: false, // Allow mobile & admin API resource loading
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
  })
);

// Enable trust proxy to correctly read X-Forwarded-For headers from Nginx proxy
app.set("trust proxy", 1);


const maxRequests = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 2000;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again after 15 minutes."
  }
});
app.use("/api", limiter);

const { checkBlockedIP, sanitizeInputs, secureHeaders } = require("./middleware/security.middleware");

app.use(express.json({
  limit: "220mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
const path = require("path");
app.use(express.urlencoded({ limit: "220mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(secureHeaders);
app.use(checkBlockedIP);
app.use(sanitizeInputs);

const authRoutes = require("./routes/auth.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const securityRoutes = require("./routes/security.routes");
const customerRoutes = require("./routes/customer.routes");
const artistRoutes = require("./routes/artist.routes");
const bookingRoutes = require("./routes/booking.routes");
const chatRoutes = require("./routes/chat.routes");
const couponRoutes = require("./routes/coupon.routes");
const notificationRoutes = require("./routes/notification.routes");
const paymentRoutes = require("./routes/payment.routes");
const referralRoutes = require("./routes/referral.routes");
const categoryRoutes = require("./routes/category.routes");
const rewardRoutes = require("./routes/reward.routes");
const reviewRoutes = require("./routes/review.routes");
const walletRoutes = require("./routes/wallet.routes");

const routeMap = [
  ["/auth", authRoutes],
  ["/analytics", analyticsRoutes],
  ["/security", securityRoutes],
  ["/customer", customerRoutes],
  ["/artist", artistRoutes],
  ["/booking", bookingRoutes],
  ["/chat", chatRoutes],
  ["/coupon", couponRoutes],
  ["/notification", notificationRoutes],
  ["/payment", paymentRoutes],
  ["/referral", referralRoutes],
  ["/category", categoryRoutes],
  ["/reward", rewardRoutes],
  ["/reviews", reviewRoutes],
  ["/wallet", walletRoutes],
  ["/transactions", walletRoutes],
  ["/settlements", walletRoutes],
  ["/bank-account", walletRoutes]
];

routeMap.forEach(([path, router]) => {
  app.use(path, router);
  app.use(`/api${path}`, router);
  app.use(`/api/v1${path}`, router);
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    status: "UP",
    timestamp: new Date()
  });
});

app.use("/api", require("./routes/index"));
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});
app.use((error, req, res, next) => {
  console.error("[SERVER ERROR]:", error);
  let message = error.message || "Something went wrong";

  if (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError") {
    if (error.errors && error.errors.length > 0) {
      message = error.errors.map((e) => {
        if (e.type === "unique violation") {
          return `${e.path || 'Field'} is already registered with another account.`;
        }
        return e.message;
      }).join(", ");
    }
  }

  return res.status(error.statusCode || 400).json({
    success: false,
    message: message,
    data: {},
    error,
  });
});



const http = require("http");
const { initSocket } = require("./sockets/socket");

const server = http.createServer(app);
initSocket(server);

const { startScheduler } = require("./services/cron.services");
startScheduler();

// Connect to Redis for live tracking
const { connectRedis } = require("./config/redis");
connectRedis();

// Self-healing DB Schema Migration for Addresses, Wallets, Ledger, and Commission tables
const db = require("./models");
(async () => {
  try {
    await db.sequelize.query('ALTER TABLE "Addresses" ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;');
    await db.sequelize.query('ALTER TABLE "Addresses" ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;');
    await db.sequelize.query('ALTER TABLE "Addresses" ADD COLUMN IF NOT EXISTS landmark VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Addresses" ADD COLUMN IF NOT EXISTS house_flat VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Addresses" ADD COLUMN IF NOT EXISTS label VARCHAR(255);');
    
    await db.sequelize.query('ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS available_balance DOUBLE PRECISION DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS pending_settlement DOUBLE PRECISION DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS processing_settlement DOUBLE PRECISION DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS outstanding_commission DOUBLE PRECISION DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS today_earnings DOUBLE PRECISION DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS weekly_earnings DOUBLE PRECISION DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS monthly_earnings DOUBLE PRECISION DEFAULT 0;');

    await db.sequelize.query('ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);');

    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS completion_pin VARCHAR(10);');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS selected_art_id INTEGER;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS selected_art_title VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS selected_art_image VARCHAR(500);');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS selected_art_tier VARCHAR(50) DEFAULT \'STANDARD\';');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS selected_art_duration INTEGER DEFAULT 60;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS selected_art_price INTEGER;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMP WITH TIME ZONE;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS service_coverage VARCHAR(50) DEFAULT \'BOTH_HANDS\';');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS reference_images JSONB DEFAULT \'[]\';');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP WITH TIME ZONE;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS cancellation_fee INTEGER DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS refund_amount INTEGER DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS is_rescheduled BOOLEAN DEFAULT FALSE;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS original_booking_id INTEGER;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS travel_origin_type VARCHAR(50) DEFAULT \'HOME_BASE\';');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS travel_origin_address VARCHAR(500);');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS travel_distance_km DOUBLE PRECISION;');
    await db.sequelize.query('ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS travel_duration_mins INTEGER;');

    await db.sequelize.query('ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS art_tier VARCHAR(50) DEFAULT \'STANDARD\';');
    await db.sequelize.query('ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS price INTEGER;');
    await db.sequelize.query('ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;');
    await db.sequelize.query('ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS complexity_level VARCHAR(50) DEFAULT \'MEDIUM\';');

    await db.sequelize.query('ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);');
    await db.sequelize.query('ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS video_thumbnail VARCHAR(500);');
    await db.sequelize.query('ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT \'[]\';');
    await db.sequelize.query('ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;');

    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT \'["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]\';');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS working_start_time VARCHAR(20) DEFAULT \'09:00\';');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS working_end_time VARCHAR(20) DEFAULT \'20:00\';');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS break_start_time VARCHAR(20) DEFAULT \'14:00\';');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS break_end_time VARCHAR(20) DEFAULT \'15:00\';');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS leave_dates JSONB DEFAULT \'[]\';');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS same_day_booking BOOLEAN DEFAULT TRUE;');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 2;');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS max_advance_days INTEGER DEFAULT 60;');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS max_bookings_per_day INTEGER DEFAULT 4;');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS pan_number VARCHAR(50);');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50);');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255);');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS cancellation_count_30d INTEGER DEFAULT 0;');
    await db.sequelize.query('ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS on_time_arrival_rate DOUBLE PRECISION DEFAULT 100.0;');

    await db.sequelize.query('ALTER TABLE "ArtistScores" ADD COLUMN IF NOT EXISTS reliability_score DOUBLE PRECISION DEFAULT 100.0;');
    await db.sequelize.query('ALTER TABLE "ArtistScores" ADD COLUMN IF NOT EXISTS acceptance_rate DOUBLE PRECISION DEFAULT 100.0;');
    await db.sequelize.query('ALTER TABLE "ArtistScores" ADD COLUMN IF NOT EXISTS completion_rate DOUBLE PRECISION DEFAULT 100.0;');
    await db.sequelize.query('ALTER TABLE "ArtistScores" ADD COLUMN IF NOT EXISTS on_time_rate DOUBLE PRECISION DEFAULT 100.0;');
    await db.sequelize.query('ALTER TABLE "ArtistScores" ADD COLUMN IF NOT EXISTS tier_badge VARCHAR(50) DEFAULT \'ON_TIME_PRO\';');

    await db.sequelize.query('ALTER TABLE "SupportTickets" ADD COLUMN IF NOT EXISTS booking_id INTEGER;');
    await db.sequelize.query('ALTER TABLE "SupportTickets" ADD COLUMN IF NOT EXISTS dispute_reason VARCHAR(255);');

    await db.User.sync({ alter: true });
    await db.Payment.sync({ alter: true });
    await db.Transaction.sync({ alter: true });
    await db.Wallet.sync({ alter: true });
    await db.WalletTransaction.sync({ alter: true });
    await db.Booking.sync({ alter: true });
    await db.ArtistProfile.sync({ alter: true });
    await db.Portfolio.sync({ alter: true });
    await db.Review.sync({ alter: true });
    await db.ArtistScore.sync({ alter: true });
    await db.SupportTicket.sync({ alter: true });
    await db.LedgerEntry.sync({ alter: true });
    await db.OutstandingCommission.sync({ alter: true });
    console.log("[DB MIGRATION] All database schemas updated successfully.");
  } catch (err) {
    console.log("[DB MIGRATION] Self-healing migration note:", err.message);
  }
})();


server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server running on port ${PORT}`
  );
});

// Trigger reload - ready
