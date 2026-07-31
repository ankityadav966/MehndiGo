// MehndiGo Server Entry Point - Live Reloaded
require("./config/env");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const app = express();

// High-performance HTTP compression middleware for 60-80% smaller payloads
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`[HTTP DIAGNOSTIC] ${req.method} ${req.originalUrl || req.url}`);
    next();
  });
}

const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: "*" }));

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

const { checkBlockedIP, sanitizeInputs } = require("./middleware/security.middleware");

app.use(express.json({
  limit: "220mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
const path = require("path");
app.use(express.urlencoded({ limit: "220mb", extended: true }));

// Optimized static asset caching with 7-day browser maxAge and ETag support
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "7d",
  etag: true,
  immutable: false
}));
app.use(checkBlockedIP);
app.use(sanitizeInputs);
app.use("/auth", require("./routes/auth.routes"));
app.use("/analytics", require("./routes/analytics.routes"));
app.use("/security", require("./routes/security.routes"));
app.use("/customer", require("./routes/customer.routes"));
app.use("/artist", require("./routes/artist.routes"));
app.use("/booking", require("./routes/booking.routes"));
app.use("/chat", require("./routes/chat.routes"));
app.use("/coupon", require("./routes/coupon.routes"));
app.use("/notification", require("./routes/notification.routes"));
app.use("/payment", require("./routes/payment.routes"));
app.use("/referral", require("./routes/referral.routes"));
app.use("/category", require("./routes/category.routes"));
app.use("/reward", require("./routes/reward.routes"));
app.use("/reviews", require("./routes/review.routes"));
app.use("/wallet", require("./routes/wallet.routes"));
app.use("/transactions", require("./routes/wallet.routes"));
app.use("/settlements", require("./routes/wallet.routes"));
app.use("/bank-account", require("./routes/wallet.routes"));
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server running on port ${PORT}`
  );
});
// Trigger reload
