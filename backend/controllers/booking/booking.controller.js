const BookingService = require("../../services/booking.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");
const db = require("../../models");

async function calculatePriceDetails(req, res) {
  try {
    const { serviceId, couponCode, slotCount } = req.query;
    const count = slotCount ? parseInt(slotCount) : 1;
    const response = await BookingService.calculatePriceDetails(serviceId, couponCode, req.user ? req.user.id : null, count);
    return res.status(200).json(SuccessResponse("Pricing details calculated successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function createBooking(req, res) {
  try {
    const response = await BookingService.createBooking(req.user.id, req.body);
    return res.status(201).json(SuccessResponse("Booking created successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getBookingDetails(req, res) {
  try {
    const response = await BookingService.getBookingDetails(req.params.id, req.user.id, req.user.role);
    if (!response) {
      return res.status(404).json(ErrorResponse("Booking not found"));
    }
    return res.status(200).json(SuccessResponse("Booking details fetched successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getBookingHistory(req, res) {
  try {
    const response = await BookingService.getBookingHistory(req.user.id, req.user.role);
    return res.status(200).json(SuccessResponse("Booking history fetched successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function applyCoupon(req, res) {
  try {
    const { couponCode, serviceId } = req.body;
    const response = await BookingService.applyCoupon(req.user.id, couponCode, serviceId);
    return res.status(200).json(SuccessResponse("Coupon applied successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function createPaymentSession(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.createPaymentSession(bookingId, req.user.id);
    return res.status(201).json(SuccessResponse("Cashfree payment session created successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function verifyPayment(req, res) {
  try {
    const response = await BookingService.verifyPayment(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Payment verified successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function cancelBooking(req, res) {
  try {
    const bookingId = req.body.bookingId || req.body.booking_id || req.body.id;
    const cancelReason = req.body.cancelReason || req.body.reason || "Cancelled by user";
    const response = await BookingService.cancelBookingWithPolicy(bookingId, req.user.id, req.user.role, cancelReason);
    return res.status(200).json(SuccessResponse("Booking cancelled successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function rescheduleBooking(req, res) {
  try {
    const bookingId = req.body.bookingId || req.body.booking_id || req.body.id;
    const { date, time, latitude, longitude } = req.body;
    const response = await BookingService.rescheduleBooking(bookingId, req.user.id, date, time, latitude, longitude);
    return res.status(200).json(SuccessResponse("Booking rescheduled successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function acceptBooking(req, res) {
  try {
    const bookingId = req.body.bookingId || req.body.booking_id || req.body.id;
    if (!bookingId) {
      return res.status(400).json(ErrorResponse("bookingId is required"));
    }
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "ARTIST_ACCEPTED");
    return res.status(200).json(SuccessResponse("Booking accepted successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function rejectBooking(req, res) {
  try {
    const bookingId = req.body.bookingId || req.body.booking_id || req.body.id;
    const { rejectReason, cancelReason } = req.body;
    if (!bookingId) {
      return res.status(400).json(ErrorResponse("bookingId is required"));
    }
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "CANCELLED", { cancelReason: rejectReason || cancelReason || "Rejected by artist" });
    return res.status(200).json(SuccessResponse("Booking rejected successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function updateOnTheWay(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "ARTIST_ON_THE_WAY");
    return res.status(200).json(SuccessResponse("Artist is now on the way", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function updateArrived(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "ARTIST_ARRIVED");
    return res.status(200).json(SuccessResponse("Artist has arrived at customer location", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function startService(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "SERVICE_STARTED");
    return res.status(200).json(SuccessResponse("Service started successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function completeService(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "COMPLETED");
    return res.status(200).json(SuccessResponse("Service completed successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getInvoice(req, res) {
  try {
    const response = await BookingService.getInvoice(req.query.bookingId);
    return res.status(200).json(SuccessResponse("Invoice fetched successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getPendingPayment(req, res) {
  try {
    const response = await BookingService.getPendingPayment(req.user.id);
    return res.status(200).json(SuccessResponse("Pending payment retrieved successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function skipReview(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.skipReview(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Review skipped successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

  getInvoice,
  getPendingPayment,
  skipReview,
  sendCheckInOtp,
  verifyCheckInOtp,
  sendCheckOutOtp,
  verifyCheckOutOtp
};
