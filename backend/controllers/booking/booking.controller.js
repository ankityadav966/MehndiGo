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
    const { bookingId, cancelReason } = req.body;
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "CANCELLED", { cancelReason });
    return res.status(200).json(SuccessResponse("Booking cancelled successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function rescheduleBooking(req, res) {
  try {
    const { bookingId, date, time } = req.body;
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "RESCHEDULED", { date, time });
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
    const userId = req.user.id;

    if (!bookingId) {
      return res.status(400).json(ErrorResponse("Booking ID is required"));
    }

    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json(ErrorResponse("Booking not found"));
    }

    if (booking.user_id !== userId) {
      return res.status(403).json(ErrorResponse("Unauthorized to modify booking"));
    }

    await booking.update({
      review_skipped: true,
      detailed_status: "COMPLETED_CLOSED"
    });

    try {
      await db.Notification.create({
        user_id: userId,
        title: "Booking Closed & Chat Session Terminated 🔒",
        message: `Your booking #${booking.booking_code} lifecycle is now fully closed. Chat history is preserved as read-only.`,
        type: "SYSTEM"
      });

      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        await db.Notification.create({
          user_id: artistProfile.user_id,
          title: "Booking Closed & Chat Session Terminated 🔒",
          message: `Booking #${booking.booking_code} lifecycle is now fully closed. Chat history is preserved as read-only.`,
          type: "SYSTEM"
        });
      }
    } catch (e) {
      console.error("[Skip Review Notification] Error:", e.message);
    }

    return res.status(200).json(SuccessResponse("Review skipped successfully"));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function selectCashPayment(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.selectCashPayment(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Cash payment method selected", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function confirmCashPayment(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.confirmCashPayment(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Cash payment confirmed", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function rejectCashPayment(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.rejectCashPayment(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Cash payment rejected (disputed)", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function checkRestrictedBooking(req, res) {
  try {
    const hasRestricted = await BookingService.hasRestrictedBooking(req.user.id);
    let bookingId = null;
    if (hasRestricted) {
      const active = await db.Booking.findOne({
        where: {
          user_id: req.user.id,
          booking_status: { [db.Sequelize.Op.ne]: "CANCELLED" },
          detailed_status: { [db.Sequelize.Op.ne]: "COMPLETED_CLOSED" },
          review_skipped: false
        },
        attributes: ["id"]
      });
      if (active) bookingId = active.id;
    }
    return res.status(200).json(SuccessResponse("Checked restriction status", { hasRestricted, bookingId }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function onTheWayBooking(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "ARTIST_ON_THE_WAY");
    return res.status(200).json(SuccessResponse("Artist is on the way", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateOnTheWay(req, res) {
  return onTheWayBooking(req, res);
}

async function updateArrived(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.updateBookingStatus(bookingId, req.user.id, req.user.role, "ARTIST_ARRIVED");
    return res.status(200).json(SuccessResponse("Artist arrived at location", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function sendCheckInOtp(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.sendCheckInOtp(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Check-In OTP sent successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function verifyCheckInOtp(req, res) {
  try {
    const { bookingId, otp } = req.body;
    const response = await BookingService.verifyCheckInOtp(bookingId, otp, req.user.id);
    return res.status(200).json(SuccessResponse("Check-In OTP verified successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function sendCheckOutOtp(req, res) {
  try {
    const { bookingId } = req.body;
    const response = await BookingService.sendCheckOutOtp(bookingId, req.user.id);
    return res.status(200).json(SuccessResponse("Check-Out OTP sent successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function verifyCheckOutOtp(req, res) {
  try {
    const { bookingId, otp } = req.body;
    const response = await BookingService.verifyCheckOutOtp(bookingId, otp, req.user.id);
    return res.status(200).json(SuccessResponse("Check-Out OTP verified successfully", response));
  } catch (error) {

    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getInvoice(req, res) {
  try {
    const bookingId = req.query.bookingId || req.params.bookingId || req.params.id;
    if (!bookingId) {
      return res.status(400).json(ErrorResponse("Missing required parameter: bookingId"));
    }
    const response = await BookingService.getInvoice(bookingId);
    return res.status(200).json(SuccessResponse("Invoice retrieved successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {


  calculatePriceDetails,
  createBooking,
  getBookingDetails,
  getBookingHistory,
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
  onTheWayBooking,
  getInvoice,
  getPendingPayment,
  skipReview,
  selectCashPayment,
  confirmCashPayment,
  rejectCashPayment,
  checkRestrictedBooking,
  sendCheckInOtp,
  verifyCheckInOtp,
  sendCheckOutOtp,
  verifyCheckOutOtp
};
