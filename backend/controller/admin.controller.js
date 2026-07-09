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

async function getAllWithdrawals(req, res) {
  try {
    const response = await AdminService.getAllWithdrawals();
    return res.status(200).json(SuccessResponse("Withdrawal requests fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function approveWithdrawal(req, res) {
  try {
    const response = await AdminService.approveWithdrawal(req.params.id);
    return res.status(200).json(SuccessResponse("Withdrawal request approved successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function rejectWithdrawal(req, res) {
  try {
    const { reason } = req.body;
    const response = await AdminService.rejectWithdrawal(req.params.id, reason);
    return res.status(200).json(SuccessResponse("Withdrawal request rejected successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getWalletSummary(req, res) {
  try {
    const summary = await AdminService.getWalletSummary();
    return res.status(200).json(SuccessResponse("Wallet summary fetched successfully", summary));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getCommissionHistory(req, res) {
  try {
    const history = await AdminService.getCommissionHistory(req.query);
    return res.status(200).json(SuccessResponse("Commission history fetched successfully", history));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getDashboardSummary(req, res) {
  try {
    const summary = await AdminService.getDashboardSummary();
    return res.status(200).json(SuccessResponse("Dashboard summary fetched successfully", summary));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getWalletTransactionDetails(req, res) {
  try {
    const details = await AdminService.getWalletTransactionDetails(req.params.id);
    return res.status(200).json(SuccessResponse("Transaction details fetched successfully", details));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
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
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getWalletSummary,
  getCommissionHistory,
  getDashboardSummary,
  getWalletTransactionDetails
};
