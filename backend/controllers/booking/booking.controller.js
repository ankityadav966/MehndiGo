const BookingService = require("../../services/booking.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");
const db = require("../../models");

async function calculatePriceDetails(req, res) {
  try {
    const { serviceId, couponCode, slotCount, customArtPrice, groupSize, serviceCoverage, distanceKm } = req.query;
    const count = slotCount ? parseInt(slotCount) : 1;
    const response = await BookingService.calculatePriceDetails(
      serviceId,
      couponCode,
      req.user ? req.user.id : null,
      count,
      distanceKm ? Number(distanceKm) : 0,
      customArtPrice ? Number(customArtPrice) : null,
      groupSize ? Number(groupSize) : 1,
      serviceCoverage || "BOTH_HANDS"
    );
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

async function checkRestrictedBooking(req, res) {
  try {
    const response = await BookingService.checkRestrictedBooking(req.user.id);
    return res.status(200).json(SuccessResponse("Restricted booking check completed", response));
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
    return res.status(201).json(SuccessResponse("Payment session created successfully", response));
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
    const bookingId = req.body.bookingId || req.body.booking_id || req.body.id;
    if (!bookingId) {
      return res.status(400).json(ErrorResponse("bookingId is required"));
    }
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "ARTIST_ON_THE_WAY", req.body);
    return res.status(200).json(SuccessResponse("Artist is now on the way", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function updateArrived(req, res) {
  try {
    const bookingId = req.body.bookingId || req.body.booking_id || req.body.id;
    if (!bookingId) {
      return res.status(400).json(ErrorResponse("bookingId is required"));
    }
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "ARTIST_ARRIVED", req.body);
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

async function selectCashPayment(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.selectCashPayment(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Cash payment selected successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function confirmCashPayment(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.confirmCashPayment(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Cash payment confirmed successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function rejectCashPayment(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.rejectCashPayment(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Cash payment dispute logged", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

// ─── OTP Controller Functions (were missing — caused 500 on all OTP routes) ───

async function sendCheckInOtp(req, res) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json(ErrorResponse("bookingId is required"));
    }
    const response = await BookingService.sendCheckInOtp(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Check-In OTP sent successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function verifyCheckInOtp(req, res) {
  try {
    const { bookingId, otp } = req.body;
    if (!bookingId || !otp) {
      return res.status(400).json(ErrorResponse("bookingId and otp are required"));
    }
    const response = await BookingService.verifyCheckInOtp(bookingId, otp, req.user.id);
    return res.status(200).json(SuccessResponse("Check-In OTP verified successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function sendCheckOutOtp(req, res) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json(ErrorResponse("bookingId is required"));
    }
    const response = await BookingService.sendCheckOutOtp(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Check-Out OTP sent successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function verifyCheckOutOtp(req, res) {
  try {
    const { bookingId, otp } = req.body;
    if (!bookingId || !otp) {
      return res.status(400).json(ErrorResponse("bookingId and otp are required"));
    }
    const response = await BookingService.verifyCheckOutOtp(bookingId, otp, req.user.id);
    return res.status(200).json(SuccessResponse("Service completed successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  calculatePriceDetails,
  createBooking,
  getBookingDetails,
  getBookingHistory,
  checkRestrictedBooking,
  applyCoupon,
  createPaymentSession,
  verifyPayment,
  cancelBooking,
  rescheduleBooking,
  acceptBooking,
  rejectBooking,
  updateOnTheWay,
  updateArrived,
  startService,
  completeService,
  getInvoice,
  getPendingPayment,
  skipReview,
  selectCashPayment,
  confirmCashPayment,
  rejectCashPayment,
  sendCheckInOtp,
  verifyCheckInOtp,
  sendCheckOutOtp,
  verifyCheckOutOtp
};
