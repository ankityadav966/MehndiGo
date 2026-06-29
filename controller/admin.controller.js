const AdminService = require("../services/admin.services");

const { SuccessResponse, ErrorResponse } = require("../utils/common");

async function getStats(req, res) {
  try {
    const stats = await AdminService.getStats();
    return res.status(200).json(SuccessResponse("Admin stats fetched", stats));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getAllUsers(req, res) {
  try {
    const response = await AdminService.getAllUsers();

    return res.status(200).json(SuccessResponse("Users fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function verifyArtist(req, res) {
  try {
    const response = await AdminService.verifyArtist(req.params.id, req.body);

    return res.status(200).json(SuccessResponse("Artist verified", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

// New controller functions for pending artists
async function getPendingArtists(req, res) {
  try {
    const response = await AdminService.getPendingArtists();
    return res
      .status(200)
      .json(SuccessResponse("Pending artists fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function approveArtist(req, res) {
  try {
    await AdminService.approveArtist(req.params.id);
    return res.status(200).json(SuccessResponse("Artist approved"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function rejectArtist(req, res) {
  try {
    await AdminService.rejectArtist(req.params.id, req.body.reason);
    return res.status(200).json(SuccessResponse("Artist rejected"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getAllArtists(req, res) {
  try {
    const response = await AdminService.getAllArtists();
    return res.status(200).json(SuccessResponse("Artists fetched", response));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function getAllBookings(req, res) {
  try {
    const response = await AdminService.getAllBookings();
    return res.status(200).json(SuccessResponse("Bookings fetched", response));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function getAllPayments(req, res) {
  try {
    const response = await AdminService.getAllPayments();
    return res.status(200).json(SuccessResponse("Payments fetched", response));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function getAllNotifications(req, res) {
  try {
    const response = await AdminService.getAllNotifications();
    return res.status(200).json(SuccessResponse("Notifications fetched", response));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function sendSystemNotification(req, res) {
  try {
    const response = await AdminService.sendSystemNotification(req.body);
    return res.status(201).json(SuccessResponse("System notification sent", response));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function getAllMessages(req, res) {
  try {
    const response = await AdminService.getAllMessages();
    return res.status(200).json(SuccessResponse("Messages fetched", response));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getStats,
  getAllUsers,
  verifyArtist,
  getPendingArtists,
  approveArtist,
  rejectArtist,
  getAllArtists,
  getAllBookings,
  getAllPayments,
  getAllNotifications,
  sendSystemNotification,
  getAllMessages,
};
