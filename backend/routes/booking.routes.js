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

// Status update actions
router.put("/cancel", authenticate, BookingController.cancelBooking);
router.put("/reschedule", authenticate, BookingController.rescheduleBooking);
router.put("/accept", authenticate, BookingController.acceptBooking);
router.put("/reject", authenticate, BookingController.rejectBooking);
router.put("/start", authenticate, BookingController.startService);
router.put("/complete", authenticate, BookingController.completeService);

// Coupon validations
router.post("/apply-coupon", authenticate, BookingController.applyCoupon);
router.post("/remove-coupon", authenticate, BookingController.calculatePriceDetails); // Alias fallback

// Payments checkout integrations
router.post("/create-order", authenticate, BookingController.createRazorpayOrder);
router.post("/verify-payment", authenticate, BookingController.verifyPayment);

// Document download
router.get("/invoice", authenticate, BookingController.getInvoice);

module.exports = router;
