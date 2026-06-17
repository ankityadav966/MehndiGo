const ArtistService = require("../services/artist.services");

const { SuccessResponse, ErrorResponse } = require("../utils/common");

// Artist profile management
async function createPortfolio(req, res) {
  try {
    console.log("Creating portfolio with body:", req.body); // Debug log
    console.log("Creating portfolio with files:", req.files); // Debug log
    const data = {
      user_id: req.user.id,
      bio: req.body.bio,
      price_start: req.body.price_start,
      experience_years: req.body.experience_years,
      home_service: req.body.home_service,
      salon_service: req.body.salon_service,
      aadhaar_front: req.files?.aadhaar_front?.[0]?.path || null,
      aadhaar_back: req.files?.aadhaar_back?.[0]?.path || null,
      selfie_image: req.files?.selfie_image?.[0]?.path || null,
    };
    console.log("Creating portfolio with data:", data); // Debug log
    const response = await ArtistService.createArtistProfile(data);
    return res
      .status(201)
      .json(SuccessResponse("Artist profile created", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function getArtists(req, res) {
  try {

    const response =
      await ArtistService.getArtists(
        req.user.id
      );

    return res
      .status(200)
      .json(
        SuccessResponse(
          "Artist fetched",
          response
        )
      );

  } catch (error) {

    return res
      .status(
        error.statusCode || 500
      )
      .json(
        ErrorResponse(
          error.message,
          error
        )
      );
  }
}
async function getArtistDetails(req, res) {
  try {
    const response = await ArtistService.getArtistDetails(req.params.id);
    return res.status(200).json(SuccessResponse("Artist fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
// Service management

async function createService(req, res) {
  try {
    const data = { ...req.body, artist_id: req.user.id };
    const response = await ArtistService.createService(data);
    return res.status(201).json(SuccessResponse("Service created", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function getMyServices(req, res) {
  try {
    const response = await ArtistService.getMyServices(req.user.id);
    return res.status(200).json(SuccessResponse("Services fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function updateService(req, res) {
  try {
    const response = await ArtistService.updateService(
      req.params.id,
      req.body,
      req.user.id,
    );
    return res.status(200).json(SuccessResponse("Service updated", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function deleteService(req, res) {
  try {
    await ArtistService.deleteService(req.params.id, req.user.id);
    return res.status(200).json(SuccessResponse("Service deleted"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function createSlot(req, res) {
  try {
    const data = { ...req.body, artist_id: req.user.id };
    console.log("Creating slot with data:", data); // Debug log
    const response = await ArtistService.createSlot(data);
    return res.status(201).json(SuccessResponse("Slot created", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function getMySlots(req, res) {
  try {
    const response = await ArtistService.getMySlots(req.user.id);
    return res.status(200).json(SuccessResponse("Slots fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function updateSlot(req, res) {
  try {
    const response = await ArtistService.updateSlot(
      req.params.id,
      req.body,
      req.user.id,
    );
    return res.status(200).json(SuccessResponse("Slot updated", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function deleteSlot(req, res) {
  try {
    await ArtistService.deleteSlot(req.params.id, req.user.id);
    return res.status(200).json(SuccessResponse("Slot deleted"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}



async function getMyPortfolio(req, res) {
  try {
    const response = await ArtistService.getMyPortfolio(req.user.id);
    return res.status(200).json(SuccessResponse("Portfolio fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function deletePortfolio(req, res) {
  try {
    await ArtistService.deletePortfolio(req.params.id, req.user.id);
    return res.status(200).json(SuccessResponse("Portfolio deleted"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

// Booking management
async function createBooking(req, res) {
  try {
    const data = { ...req.body, user_id: req.user.id };
    const response = await ArtistService.createBooking(data);
    return res.status(201).json(SuccessResponse("Booking created", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function getMyBookings(req, res) {
  try {
    const response = await ArtistService.getMyBookings(req.user.id);
    return res.status(200).json(SuccessResponse("Bookings fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function getArtistBookings(req, res) {
  try {
    const response = await ArtistService.getArtistBookings(req.user.id);
    return res
      .status(200)
      .json(SuccessResponse("Artist bookings fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function cancelBooking(req, res) {
  try {
    await ArtistService.cancelBooking(req.params.id, req.user.id);
    return res.status(200).json(SuccessResponse("Booking cancelled"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

// payment managment
async function createOrder(req, res) {
  try {
    const response = await ArtistService.createOrder(req.body.booking_id);
    return res.status(200).json(SuccessResponse("Order created", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function verifyPayment(req, res) {
  try {
    const response = await ArtistService.verifyPayment(req.body);
    return res.status(200).json(SuccessResponse("Payment verified", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
// review management
async function createReview(req, res) {
  try {
    const data = { ...req.body, user_id: req.user.id };
    const response = await ArtistService.createReview(data);
    return res.status(201).json(SuccessResponse("Review created", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function getArtistReviews(req, res) {
  try {
    const response = await ArtistService.getArtistReviews(req.params.artist_id);
    return res.status(200).json(SuccessResponse("Reviews fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

// notification management
async function getMyNotifications(req, res) {
  console.log("NOTIFICATION ROUTE HIT");

  try {
    const response = await ArtistService.getMyNotifications(req.user.id);

    return res
      .status(200)
      .json(SuccessResponse("Notifications fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function markAsRead(req, res) {
  try {
    await ArtistService.markAsRead(req.params.id, req.user.id);
    return res.status(200).json(SuccessResponse("Notification marked as read"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  // Artist profile management
  createPortfolio,
  getArtists,
  getArtistDetails,
  // Service management
  createService,
  getMyServices,
  updateService,
  deleteService,
  // Slot management
  createSlot,
  getMySlots,
  updateSlot,
  deleteSlot,
  // Portfolio management
  getMyPortfolio,
  deletePortfolio,
  // Booking management
  createBooking,
  getMyBookings,
  getArtistBookings,
  cancelBooking,
  // Payment management
  createOrder,
  verifyPayment,
  // Review management
  createReview,
  getArtistReviews,
  // Notification management
  getMyNotifications,
  markAsRead,
};
