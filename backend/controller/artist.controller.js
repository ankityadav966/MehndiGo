const ArtistService = require("../services/artist.services");

const { SuccessResponse, ErrorResponse } = require("../utils/common");

// Artist profile management
async function createPortfolio(req, res) {
  try {
    const data = {
      user_id: req.user.id,

      bio: req.body.bio,

      experience_years: req.body.experience_years,

      home_service: req.body.home_service === "true",

      salon_service: req.body.salon_service === "true",

      location: req.body.location,

      city: req.body.city,

      state: req.body.state,

      pincode: req.body.pincode,

      latitude: req.body.latitude,

      longitude: req.body.longitude,

      last_location_update: new Date(),

      aadhaar_front: req.files?.aadhaar_front?.[0]?.path || null,

      aadhaar_back: req.files?.aadhaar_back?.[0]?.path || null,
 
      selfie_image: req.files?.selfie_image?.[0]?.path || null,
    };

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
    const response = await ArtistService.getArtists(req.user.id);

    return res.status(200).json(SuccessResponse("Artist fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function getArtistDetails(req, res) {
  try {
    const response = await ArtistService.getArtistDetails(req.user.id);
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
    const data = {
      ...req.body,

      artist_id: req.user.id,

      service_image: req.file?.path || null,
    };

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

async function getPortfolioById(req, res) {
  try {
    const response = await ArtistService.getPortfolioById(req.params.id);
    return res.status(200).json(SuccessResponse("Portfolio item fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function updatePortfolio(req, res) {
  try {
    const response = await ArtistService.updatePortfolio(
      req.params.id,
      req.user.id,
      req.body
    );
    return res.status(200).json(SuccessResponse("Portfolio item updated", response));
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
async function updateBookingStatus(req, res) {
  try {
    const response = await ArtistService.updateBookingStatus(
      req.params.id,
      req.user.id,
      req.body,
    );

    return res
      .status(200)
      .json(SuccessResponse("Booking status updated", response));
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
  console.log;
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

async function getArtistDetailsById(req, res) {
  try {
    const id = req.params.id;
    if (!id || id === "undefined" || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: "Invalid artist ID" });
    }
    const response = await ArtistService.getArtistDetailsById(id);
    return res.status(200).json(SuccessResponse("Artist fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function uploadPortfolioImage(req, res) {
  try {
    const isVideo = req.file?.mimetype?.startsWith("video/") || req.body.video_url;
    const path = req.file?.path || req.body.image_url || null;

    const data = {
      artist_id: req.user.id,
      image_url: isVideo ? (req.body.image_url || path) : path,
      video_url: isVideo ? path : (req.body.video_url || null),
      title: req.body.title || null,
      caption: req.body.caption || null,
      description: req.body.description || null,
      category: req.body.category || null,
      occasion: req.body.occasion || null,
      tags: req.body.tags || null,
      location: req.body.location || null,
      visibility: req.body.visibility === undefined ? true : (req.body.visibility === "true" || req.body.visibility === true),
      display_order: req.body.display_order ? Number(req.body.display_order) : 0
    };
    if (!data.image_url && !data.video_url) {
      return res.status(400).json(ErrorResponse("Portfolio media file is required"));
    }
    const response = await ArtistService.createPortfolio(data);
    return res.status(201).json(SuccessResponse("Portfolio item created successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function uploadPortfolioMedia(req, res) {
  try {
    const files = req.files || [];
    const mediaList = [];
    const db = require("../models");

    // Fetch the artist profile of the logged-in user if it exists
    const artist = await db.ArtistProfile.findOne({ where: { user_id: req.user.id } });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.mimetype.startsWith("video");
      const path = file.path;

      const item = {
        url: path,
        type: isVideo ? "video" : "image"
      };

      if (artist) {
        // If the user has an artist profile, automatically create a Portfolio record
        const data = {
          artist_id: req.user.id,
          image_url: path,
          video_url: isVideo ? path : null
        };
        const portfolioItem = await ArtistService.createPortfolio(data);
        item.portfolio_id = portfolioItem.id;
      }

      mediaList.push(item);
    }

    return res.status(201).json(SuccessResponse("Media files uploaded and stored successfully", mediaList));
  } catch (error) {
    return res
      .status(500)
      .json(ErrorResponse(error.message, error));
  }
}

async function updateProfile(req, res) {
  try {
    const response = await ArtistService.updateArtistProfile(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Artist profile updated", response));
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
  getArtistDetailsById,
  updateProfile,
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
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  uploadPortfolioImage,
  uploadPortfolioMedia,
  // Booking management
  createBooking,
  getMyBookings,
  getArtistBookings,
  updateBookingStatus,
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
