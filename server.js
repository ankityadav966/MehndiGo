// MehndiGo Server Entry Point
require("./config/env");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: "*" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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
  limit: "50mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
app.use("/reviews", require("./routes/review.routes"));
app.use("/wallet", require("./routes/wallet.routes"));
app.use("/transactions", require("./routes/wallet.routes"));
app.use("/settlements", require("./routes/wallet.routes"));
app.use("/bank-account", require("./routes/wallet.routes"));
app.use("/api", require("./routes/index"));
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

console.log('====================================');
console.log("testing : ");
console.log('====================================');
app.use((error, req, res, next) => {
  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.message ||
      "Something went wrong",

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

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server running on port ${PORT}`
  );
});
// Trigger reload
