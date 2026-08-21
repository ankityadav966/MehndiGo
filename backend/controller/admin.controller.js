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
    await AdminService.approveArtist(req.params.id, req.user?.id);
    return res.status(200).json(SuccessResponse("Artist approved"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function rejectArtist(req, res) {
  try {
    await AdminService.rejectArtist(req.params.id, req.body.reason, req.user?.id);
    return res.status(200).json(SuccessResponse("Artist rejected"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function suspendArtist(req, res) {
  try {
    await AdminService.suspendArtist(req.params.id, req.body.reason, req.user?.id);
    return res.status(200).json(SuccessResponse("Artist suspended successfully"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function reactivateArtist(req, res) {
  try {
    await AdminService.reactivateArtist(req.params.id, req.user?.id);
    return res.status(200).json(SuccessResponse("Artist reactivated successfully"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getAllArtists(req, res) {
  try {
    const response = await AdminService.getAllArtists(req.query);
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

// --- REVIEW MODERATION ---
async function getReviews(req, res) {
  try {
    const { status } = req.query;
    const reviews = await AdminService.getReviews(status);
    return res.status(200).json(SuccessResponse("Reviews fetched successfully", reviews));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function approveReview(req, res) {
  try {
    const review = await AdminService.approveReview(req.params.id);
    return res.status(200).json(SuccessResponse("Review approved successfully", review));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function rejectReview(req, res) {
  try {
    const { reason } = req.body;
    const review = await AdminService.rejectReview(req.params.id, reason);
    return res.status(200).json(SuccessResponse("Review rejected successfully", review));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

// --- SUPPORT TICKETS ---
async function getSupportTickets(req, res) {
  try {
    const tickets = await AdminService.getSupportTickets(req.query);
    return res.status(200).json(SuccessResponse("Support tickets fetched successfully", tickets));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getSupportTicketDetails(req, res) {
  try {
    const ticket = await AdminService.getSupportTicketDetails(req.params.id);
    return res.status(200).json(SuccessResponse("Support ticket details fetched successfully", ticket));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateTicketStatus(req, res) {
  try {
    const { status } = req.body;
    const ticket = await AdminService.updateTicketStatus(req.params.id, status);
    return res.status(200).json(SuccessResponse("Ticket status updated successfully", ticket));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function replySupportTicket(req, res) {
  try {
    const { message, status } = req.body;
    const ticket = await AdminService.replySupportTicket(req.params.id, message, status, req.user.id);
    return res.status(200).json(SuccessResponse("Reply sent successfully", ticket));
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
  suspendArtist,
  reactivateArtist,
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
  getWalletTransactionDetails,
  getReviews,
  approveReview,
  rejectReview,
  getSupportTickets,
  getSupportTicketDetails,
  updateTicketStatus,
  replySupportTicket
};
