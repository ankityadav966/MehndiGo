const ArtistService = require("../../services/artist.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

async function getDashboard(req, res) {
  try {
    const response = await ArtistService.getDashboard(req.user.id);
    return res.status(200).json(SuccessResponse("Artist dashboard fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getBookings(req, res) {
  try {
    const response = await ArtistService.getArtistBookings(req.user.id);
    return res.status(200).json(SuccessResponse("Artist bookings fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getEarnings(req, res) {
  try {
    const response = await ArtistService.getEarnings(req.user.id);
    return res.status(200).json(SuccessResponse("Artist earnings fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getWallet(req, res) {
  try {
    const response = await ArtistService.getWalletDetails(req.user.id);
    return res.status(200).json(SuccessResponse("Artist wallet details fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getReviews(req, res) {
  try {
    const response = await ArtistService.getReviews(req.user.id);
    return res.status(200).json(SuccessResponse("Artist reviews fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getAnalytics(req, res) {
  try {
    const response = await ArtistService.getAnalytics(req.user.id);
    return res.status(200).json(SuccessResponse("Artist analytics fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getProfile(req, res) {
  try {
    const response = await ArtistService.getProfile(req.user.id);
    return res.status(200).json(SuccessResponse("Artist profile fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateProfile(req, res) {
  try {
    const response = await ArtistService.updateProfileDetails(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Artist profile updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getNotifications(req, res) {
  try {
    const response = await ArtistService.getNotifications(req.user.id);
    return res.status(200).json(SuccessResponse("Artist notifications fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getServices(req, res) {
  try {
    const response = await ArtistService.getServicesList(req.user.id);
    return res.status(200).json(SuccessResponse("Services list fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getServiceById(req, res) {
  try {
    const response = await ArtistService.getServiceDetails(req.params.id);
    return res.status(200).json(SuccessResponse("Service details fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function createService(req, res) {
  try {
    const response = await ArtistService.createNewService(req.user.id, req.body);
    return res.status(201).json(SuccessResponse("Service created successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateService(req, res) {
  try {
    const response = await ArtistService.updateServiceDetails(req.params.id, req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Service updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function deleteService(req, res) {
  try {
    await ArtistService.deleteServiceItem(req.params.id, req.user.id);
    return res.status(200).json(SuccessResponse("Service deleted successfully", null));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateServiceStatus(req, res) {
  try {
    const { id, is_active } = req.body;
    const response = await ArtistService.updateServiceActiveStatus(id, req.user.id, is_active);
    return res.status(200).json(SuccessResponse("Service status updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function postServiceMedia(req, res) {
  try {
    const { id, image_url } = req.body;
    const response = await ArtistService.uploadServiceMedia(id, req.user.id, image_url);
    return res.status(200).json(SuccessResponse("Service media uploaded successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function deleteServiceMedia(req, res) {
  try {
    const { id } = req.body;
    const response = await ArtistService.uploadServiceMedia(id, req.user.id, null);
    return res.status(200).json(SuccessResponse("Service media deleted successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getCustomerServices(req, res) {
  try {
    const response = await ArtistService.getCustomerServicesList();
    return res.status(200).json(SuccessResponse("Active services fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

function logDebug(req, res, statusCode, responseBody) {
  console.log("===== API DEBUG =====");
  console.log(`URL: ${req.originalUrl}`);
  console.log(`Method: ${req.method}`);
  console.log("Headers:", JSON.stringify(req.headers));
  console.log("Params:", JSON.stringify(req.params));
  console.log("Query:", JSON.stringify(req.query));
  console.log("Body:", JSON.stringify(req.body));
  console.log(`Status Code: ${statusCode}`);
  console.log("Response Body:", JSON.stringify(responseBody));
  console.log("=====================");
}

async function getLeads(req, res) {
  try {
    const response = await ArtistService.getLeads(req.user.id, req.query);
    logDebug(req, res, 200, response);
    return res.status(200).json(SuccessResponse("Leads fetched successfully", response));
  } catch (error) {
    logDebug(req, res, error.statusCode || 500, { error: error.message });
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getLeadById(req, res) {
  try {
    const response = await ArtistService.getLeadById(req.params.id, req.user.id);
    logDebug(req, res, 200, response);
    return res.status(200).json(SuccessResponse("Lead fetched successfully", response));
  } catch (error) {
    logDebug(req, res, error.statusCode || 500, { error: error.message });
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function acceptLead(req, res) {
  try {
    const id = req.body.booking_id || req.body.id;
    if (!id) return res.status(400).json(ErrorResponse("booking_id is required"));
    const response = await ArtistService.acceptLead(id, req.user.id);
    logDebug(req, res, 200, response);
    return res.status(200).json(SuccessResponse("Lead accepted successfully", response));
  } catch (error) {
    logDebug(req, res, error.statusCode || 500, { error: error.message });
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function rejectLead(req, res) {
  try {
    const id = req.body.booking_id || req.body.id;
    const reason = req.body.reject_reason || req.body.reason;
    if (!id) return res.status(400).json(ErrorResponse("booking_id is required"));
    const response = await ArtistService.rejectLead(id, req.user.id, reason);
    logDebug(req, res, 200, response);
    return res.status(200).json(SuccessResponse("Lead rejected successfully", response));
  } catch (error) {
    logDebug(req, res, error.statusCode || 500, { error: error.message });
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function viewLead(req, res) {
  try {
    const id = req.body.booking_id || req.body.id;
    if (!id) return res.status(400).json(ErrorResponse("booking_id is required"));
    const response = await ArtistService.viewLead(id, req.user.id);
    logDebug(req, res, 200, response);
    return res.status(200).json(SuccessResponse("Lead marked as viewed", response));
  } catch (error) {
    logDebug(req, res, error.statusCode || 500, { error: error.message });
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function filterLeads(req, res) {
  try {
    const response = await ArtistService.getLeads(req.user.id, req.query);
    logDebug(req, res, 200, response);
    return res.status(200).json(SuccessResponse("Filtered leads fetched successfully", response));
  } catch (error) {
    logDebug(req, res, error.statusCode || 500, { error: error.message });
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function searchLeads(req, res) {
  try {
    const response = await ArtistService.getLeads(req.user.id, { search: req.query.q || req.query.search });
    logDebug(req, res, 200, response);
    return res.status(200).json(SuccessResponse("Search results fetched successfully", response));
  } catch (error) {
    logDebug(req, res, error.statusCode || 500, { error: error.message });
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getCustomerServiceDetail(req, res) {
  try {
    const response = await ArtistService.getServiceDetails(req.params.id);
    return res.status(200).json(SuccessResponse("Service details fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function createPackage(req, res) {
  try {
    const { serviceId } = req.params;
    const response = await ArtistService.createServicePackage(serviceId, req.user.id, req.body);
    return res.status(201).json(SuccessResponse("Package created successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updatePackage(req, res) {
  try {
    const { id } = req.params;
    const response = await ArtistService.updateServicePackage(id, req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Package updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function deletePackage(req, res) {
  try {
    const { id } = req.params;
    await ArtistService.deleteServicePackage(id, req.user.id);
    return res.status(200).json(SuccessResponse("Package deleted successfully", null));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getAvailability(req, res) {
  try {
    const response = await ArtistService.getAvailabilitySchedule(req.user.id);
    return res.status(200).json(SuccessResponse("Availability schedule fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateAvailability(req, res) {
  try {
    const response = await ArtistService.updateAvailabilitySchedule(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Availability schedule updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function addBlockedDate(req, res) {
  try {
    const { date } = req.body;
    const response = await ArtistService.addBlockedDate(req.user.id, date);
    return res.status(200).json(SuccessResponse("Date blocked successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function removeBlockedDate(req, res) {
  try {
    const { date } = req.body;
    const response = await ArtistService.removeBlockedDate(req.user.id, date);
    return res.status(200).json(SuccessResponse("Date unblocked successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getMyPortfolio(req, res) {
  try {
    const response = await ArtistService.getMyPortfolio(req.user.id);
    return res.status(200).json(SuccessResponse("Portfolio fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getPortfolioById(req, res) {
  try {
    const response = await ArtistService.getPortfolioById(req.params.id);
    return res.status(200).json(SuccessResponse("Portfolio item fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function createPortfolio(req, res) {
  try {
    const isVideo = req.file?.mimetype?.startsWith("video/") || req.body.video_url;
    const path = req.file?.path || req.body.image_url || null;

    const payload = {
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
      display_order: req.body.display_order !== undefined ? Number(req.body.display_order) : 0,
      art_tier: req.body.art_tier || "STANDARD",
      price: req.body.price !== undefined && req.body.price !== "" ? Number(req.body.price) : null,
      duration_minutes: req.body.duration_minutes ? Number(req.body.duration_minutes) : 60,
      complexity_level: req.body.complexity_level || "MEDIUM",
      is_cover: req.body.is_cover === true || req.body.is_cover === "true",
      is_featured: req.body.is_featured === true || req.body.is_featured === "true"
    };

    const response = await ArtistService.createPortfolio(req.user.id, payload);
    return res.status(201).json(SuccessResponse("Portfolio item created successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updatePortfolio(req, res) {
  try {
    const response = await ArtistService.updatePortfolio(req.params.id, req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Portfolio item updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function deletePortfolio(req, res) {
  try {
    await ArtistService.deletePortfolio(req.params.id, req.user.id);
    return res.status(200).json(SuccessResponse("Portfolio item deleted successfully"));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function reorderPortfolio(req, res) {
  try {
    const items = req.body.items || req.body;
    const response = await ArtistService.reorderPortfolio(req.user.id, items);
    return res.status(200).json(SuccessResponse("Portfolio display order updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function setCoverImage(req, res) {
  try {
    const response = await ArtistService.setCoverImage(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Cover image updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function uploadPortfolioMedia(req, res) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    const results = [];
    for (const file of files) {
      const isVideo = file.mimetype?.startsWith("video/") || /\.(mp4|mov|3gp|mkv)$/i.test(file.originalname || "");
      results.push({
        url: file.path,
        type: isVideo ? "video" : "image"
      });
    }
    return res.status(200).json(SuccessResponse("Media uploaded successfully", results));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getUploadSignature(req, res) {
  try {
    const cloudinary = require("../../config/cloudinary");
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "mehndigo/portfolio";
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: folder
      },
      cloudinary.config().api_secret
    );

    return res.status(200).json(SuccessResponse("Signature generated successfully", {
      signature,
      timestamp,
      folder,
      api_key: cloudinary.config().api_key,
      cloud_name: cloudinary.config().cloud_name
    }));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getDashboard,
  getBookings,
  getEarnings,
  getWallet,
  getReviews,
  getAnalytics,
  getProfile,
  updateProfile,
  getNotifications,
  getLeads,
  getLeadById,
  acceptLead,
  rejectLead,
  viewLead,
  filterLeads,
  searchLeads,
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  updateServiceStatus,
  postServiceMedia,
  deleteServiceMedia,
  getCustomerServices,
  getCustomerServiceDetail,
  createPackage,
  updatePackage,
  deletePackage,
  getAvailability,
  updateAvailability,
  addBlockedDate,
  removeBlockedDate,
  getMyPortfolio,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  reorderPortfolio,
  setCoverImage,
  uploadPortfolioMedia,
  getUploadSignature
};
