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
    const response = await ArtistService.getBookings(req.user.id);
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
  getCustomerServiceDetail
};
