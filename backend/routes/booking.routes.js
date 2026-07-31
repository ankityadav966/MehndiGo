const express = require("express");
const router = express.Router();
const BookingController = require("../controllers/booking/booking.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Price estimation
router.get("/price-details", authenticate, BookingController.calculatePriceDetails);

// Booking operations
router.post("/create", authenticate, BookingController.createBooking);
router.get("/details/:id", authenticate, BookingController.getBookingDetails);
router.get("/history", authenticate, BookingController.getBookingHistory);
router.get("/check-restricted", authenticate, BookingController.checkRestrictedBooking);

// Status update actions
router.put("/cancel", authenticate, BookingController.cancelBooking);
router.put("/reschedule", authenticate, BookingController.rescheduleBooking);
router.put("/accept", authenticate, BookingController.acceptBooking);
router.put("/reject", authenticate, BookingController.rejectBooking);
router.put("/on-the-way", authenticate, BookingController.updateOnTheWay || BookingController.onTheWayBooking);
router.put("/arrived", authenticate, BookingController.updateArrived);
router.put("/start", authenticate, BookingController.startService);
router.put("/complete", authenticate, BookingController.completeService);
router.put("/skip-review", authenticate, BookingController.skipReview);
router.put("/select-cash", authenticate, BookingController.selectCashPayment);
router.put("/confirm-cash", authenticate, BookingController.confirmCashPayment);
router.put("/reject-cash", authenticate, BookingController.rejectCashPayment);
router.post("/send-checkin-otp", authenticate, BookingController.sendCheckInOtp);
router.post("/verify-checkin-otp", authenticate, BookingController.verifyCheckInOtp);
router.post("/send-checkout-otp", authenticate, BookingController.sendCheckOutOtp);
router.post("/verify-checkout-otp", authenticate, BookingController.verifyCheckOutOtp);

// Coupon validations
router.post("/apply-coupon", authenticate, BookingController.applyCoupon);
router.post("/remove-coupon", authenticate, BookingController.calculatePriceDetails); // Alias fallback

// Payments checkout integrations
router.get("/pending", authenticate, BookingController.getPendingPayment);
router.post("/create-session", authenticate, BookingController.createPaymentSession);
router.post("/create-order", authenticate, BookingController.createPaymentSession);
router.post("/verify-payment", authenticate, BookingController.verifyPayment);

// Document download
router.get("/invoice", authenticate, BookingController.getInvoice);

// Live Tracking Location Query
const TrackingController = require("../controllers/tracking/tracking.controller");
router.get("/:bookingId/live-location", authenticate, TrackingController.getArtistLocation);
router.get("/:bookingId/location", authenticate, TrackingController.getArtistLocation);

module.exports = router;
