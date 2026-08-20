const CustomerService = require("../../services/customer.services");
const ReviewService = require("../../services/review.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

async function getHomeDashboard(req, res) {
  try {
    const { latitude, longitude } = req.query;
    const response = await CustomerService.getHomeDashboard(latitude, longitude, req.user?.id);
    return res.status(200).json(SuccessResponse("Home Dashboard Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getCategories(req, res) {
  try {
    const response = await CustomerService.getCategories();
    return res.status(200).json(SuccessResponse("Categories Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getOffers(req, res) {
  try {
    const response = await CustomerService.getOffers();
    return res.status(200).json(SuccessResponse("Offers Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getFeaturedArtists(req, res) {
  try {
    const { latitude, longitude } = req.query;
    const response = await CustomerService.getFeaturedArtists(latitude, longitude);
    return res.status(200).json(SuccessResponse("Featured Artists Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getNearbyArtists(req, res) {
  try {
    const { latitude, longitude, radius, page, limit, filter } = req.query;
    const response = await CustomerService.getNearbyArtists(latitude, longitude, radius, page, limit, filter);
    return res.status(200).json(SuccessResponse("Nearby Artists Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getPopularArtists(req, res) {
  try {
    const { latitude, longitude } = req.query;
    const response = await CustomerService.getPopularArtists(latitude, longitude);
    return res.status(200).json(SuccessResponse("Popular Artists Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function searchArtists(req, res) {
  try {
    const { query, latitude, longitude, page, limit, sort, ...filters } = req.query;
    const response = await CustomerService.searchArtists(query, filters, sort, latitude, longitude, page, limit);
    return res.status(200).json(SuccessResponse("Search Results Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getArtistById(req, res) {
  try {
    const response = await CustomerService.getArtistById(req.params.id);
    if (!response) {
      return res.status(404).json(ErrorResponse("Artist profile not found"));
    }
    return res.status(200).json(SuccessResponse("Artist Profile Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getArtistServices(req, res) {
  try {
    const response = await CustomerService.getArtistServices(req.params.id);
    return res.status(200).json(SuccessResponse("Artist Services Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getArtistPortfolio(req, res) {
  try {
    const response = await CustomerService.getArtistPortfolio(req.params.id);
    return res.status(200).json(SuccessResponse("Artist Portfolio Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getArtistReviews(req, res) {
  try {
    const response = await CustomerService.getArtistReviews(req.params.id);
    return res.status(200).json(SuccessResponse("Artist Reviews Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getArtistAvailability(req, res) {
  try {
    const response = await CustomerService.getArtistAvailability(req.params.id, req.query);
    return res.status(200).json(SuccessResponse("Artist Availability Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getSimilarArtists(req, res) {
  try {
    const response = await CustomerService.getSimilarArtists(req.params.id);
    return res.status(200).json(SuccessResponse("Similar Artists Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getTrendingArtists(req, res) {
  try {
    const { latitude, longitude } = req.query;
    const response = await CustomerService.getTrendingArtists(latitude, longitude);
    return res.status(200).json(SuccessResponse("Trending Artists Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getRecommendedArtists(req, res) {
  try {
    const { latitude, longitude } = req.query;
    const response = await CustomerService.getRecommendedArtists(latitude, longitude);
    return res.status(200).json(SuccessResponse("Recommended Artists Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getSuggestions(req, res) {
  try {
    const { query } = req.query;
    const response = await CustomerService.getSuggestions(query);
    return res.status(200).json(SuccessResponse("Suggestions Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getTrendingSearches(req, res) {
  try {
    const response = await CustomerService.getTrendingSearches();
    return res.status(200).json(SuccessResponse("Trending Searches Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getRecentSearches(req, res) {
  try {
    const response = await CustomerService.getRecentSearches(req.user.id);
    return res.status(200).json(SuccessResponse("Recent Searches Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function saveRecentSearch(req, res) {
  try {
    const { query } = req.body;
    const response = await CustomerService.saveRecentSearch(req.user.id, query);
    return res.status(201).json(SuccessResponse("Search Query Saved Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function deleteRecentSearch(req, res) {
  try {
    const { queryId } = req.query;
    await CustomerService.deleteRecentSearch(req.user.id, queryId);
    return res.status(200).json(SuccessResponse("Recent Search Deleted Successfully"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getFilterMetadata(req, res) {
  try {
    const response = await CustomerService.getFilterMetadata();
    return res.status(200).json(SuccessResponse("Filter Metadata Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function addFavorite(req, res) {
  try {
    const artistId = req.body?.artistId || req.query?.artistId || req.params?.artistId;
    const response = await CustomerService.addFavorite(req.user.id, artistId);
    return res.status(201).json(SuccessResponse("Artist Added to Favorites Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function removeFavorite(req, res) {
  try {
    const artistId = req.query?.artistId || req.body?.artistId || req.params?.artistId;
    await CustomerService.removeFavorite(req.user.id, artistId);
    return res.status(200).json(SuccessResponse("Artist Removed from Favorites Successfully"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getFavorites(req, res) {
  try {
    const response = await CustomerService.getFavorites(req.user.id);
    return res.status(200).json(SuccessResponse("Favorites Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getReviews(req, res) {
  try {
    const response = await ReviewService.getMyReviews(req.user.id);
    return res.status(200).json(SuccessResponse("Customer Reviews Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getArtistReviews(req, res) {
  try {
    const artistId = req.params.id || req.params.artistId;
    const response = await ReviewService.getReviews({ artist_id: artistId });
    return res.status(200).json(SuccessResponse("Artist Reviews Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getPortfolios(req, res) {
  try {
    const { query, page, limit, ...filters } = req.query;
    const response = await CustomerService.getPortfolios(query, filters, page, limit);
    let likedIds = [];
    let savedIds = [];
    if (req.user) {
      const [liked, saved] = await Promise.all([
        CustomerService.getLikedPortfolioIds(req.user.id),
        CustomerService.getSavedPortfolioIds(req.user.id)
      ]);
      likedIds = liked;
      savedIds = saved;
    }
    return res.status(200).json(SuccessResponse("Portfolios Fetched Successfully", {
      count: response.count,
      rows: response.rows,
      likedIds,
      savedIds
    }));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function likePortfolio(req, res) {
  try {
    const portfolioId = req.body.portfolioId || req.body.portfolio_id || req.query.portfolioId || req.query.portfolio_id || req.params.id;
    if (!portfolioId) return res.status(400).json(ErrorResponse("Portfolio ID is required"));
    const response = await CustomerService.likePortfolio(req.user.id, portfolioId);
    return res.status(201).json(SuccessResponse("Portfolio Liked Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function unlikePortfolio(req, res) {
  try {
    const portfolioId = req.query.portfolioId || req.query.portfolio_id || req.body.portfolioId || req.body.portfolio_id || req.params.id;
    if (!portfolioId) return res.status(400).json(ErrorResponse("Portfolio ID is required"));
    await CustomerService.unlikePortfolio(req.user.id, portfolioId);
    return res.status(200).json(SuccessResponse("Portfolio Unliked Successfully"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function savePortfolio(req, res) {
  try {
    const portfolioId = req.body.portfolioId || req.body.portfolio_id || req.query.portfolioId || req.query.portfolio_id || req.params.id;
    if (!portfolioId) return res.status(400).json(ErrorResponse("Portfolio ID is required"));
    const response = await CustomerService.savePortfolio(req.user.id, portfolioId);
    return res.status(201).json(SuccessResponse("Portfolio Saved Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function unsavePortfolio(req, res) {
  try {
    const portfolioId = req.query.portfolioId || req.query.portfolio_id || req.body.portfolioId || req.body.portfolio_id || req.params.id;
    if (!portfolioId) return res.status(400).json(ErrorResponse("Portfolio ID is required"));
    await CustomerService.unsavePortfolio(req.user.id, portfolioId);
    return res.status(200).json(SuccessResponse("Portfolio Unsaved Successfully"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getSavedPortfolios(req, res) {
  try {
    const response = await CustomerService.getSavedPortfolios(req.user.id);
    return res.status(200).json(SuccessResponse("Saved Portfolios Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getDashboard(req, res) {
  try {
    const response = await CustomerService.getDashboard(req.user.id);
    return res.status(200).json(SuccessResponse("Customer dashboard fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getBookings(req, res) {
  try {
    const response = await CustomerService.getBookings(req.user.id);
    return res.status(200).json(SuccessResponse("Customer bookings fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getProfile(req, res) {
  try {
    const response = await CustomerService.getProfile(req.user.id);
    return res.status(200).json(SuccessResponse("Customer profile fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateProfile(req, res) {
  try {
    const response = await CustomerService.updateProfile(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Customer profile updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getWishlist(req, res) {
  try {
    const response = await CustomerService.getWishlist(req.user.id);
    return res.status(200).json(SuccessResponse("Customer wishlist fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getCoupons(req, res) {
  try {
    const response = await CustomerService.getCoupons();
    return res.status(200).json(SuccessResponse("Coupons fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getNotifications(req, res) {
  try {
    const response = await CustomerService.getNotifications(req.user.id);
    return res.status(200).json(SuccessResponse("Notifications fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getAddresses(req, res) {
  try {
    const response = await CustomerService.getAddresses(req.user.id);
    return res.status(200).json(SuccessResponse("Addresses fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getReviews(req, res) {
  try {
    const response = await CustomerService.getReviews(req.user.id);
    return res.status(200).json(SuccessResponse("Reviews fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function addAddress(req, res) {
  try {
    const response = await CustomerService.addAddress(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Address added successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateAddress(req, res) {
  try {
    const response = await CustomerService.updateAddress(req.user.id, req.params.id, req.body);
    return res.status(200).json(SuccessResponse("Address updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function setDefaultAddress(req, res) {
  try {
    const response = await CustomerService.setDefaultAddress(req.user.id, req.params.id);
    return res.status(200).json(SuccessResponse("Primary address updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function changePassword(req, res) {
  try {
    const AuthService = require("../../services/auth.services");
    const response = await AuthService.changePassword(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Password changed successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function deleteAccount(req, res) {
  try {
    const AuthService = require("../../services/auth.services");
    const response = await AuthService.deleteAccount(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Account deleted successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function deleteAddress(req, res) {
  try {
    const response = await CustomerService.deleteAddress(req.user.id, req.params.id);
    return res.status(200).json(SuccessResponse("Address deleted successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function createSupportTicket(req, res) {
  try {
    const db = require("../../models");
    const { Op } = require("sequelize");
    const { category, subject, description, attachments, booking_id, bookingId, dispute_reason, disputeReason } = req.body;

    if (!subject && !description && !disputeReason) {
      return res.status(400).json(ErrorResponse("Subject and description are required"));
    }

    const targetBookingId = booking_id || bookingId || null;
    if (targetBookingId) {
      const booking = await db.Booking.findByPk(targetBookingId);
      if (!booking) {
        return res.status(400).json(ErrorResponse("Referenced booking not found"));
      }
      const isCustomer = booking.user_id === req.user.id;
      const isArtist = booking.artist_id === req.user.id || (req.user.artist_id && booking.artist_id === req.user.artist_id);
      if (!isCustomer && !isArtist && req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json(ErrorResponse("Invalid booking reference: booking does not belong to your account"));
      }
    }

    const finalSubject = subject || `Dispute for Booking #${targetBookingId || ''}`;
    const finalDescription = description || dispute_reason || "Dispute submitted by customer";

    // Idempotency: Prevent duplicate submissions within 15 seconds
    const recentDuplicate = await db.SupportTicket.findOne({
      where: {
        user_id: req.user.id,
        subject: finalSubject,
        description: finalDescription,
        createdAt: { [Op.gte]: new Date(Date.now() - 15000) }
      }
    });

    if (recentDuplicate) {
      return res.status(200).json(SuccessResponse("Support ticket already submitted", recentDuplicate));
    }

    const ticket = await db.SupportTicket.create({
      user_id: req.user.id,
      booking_id: targetBookingId,
      dispute_reason: dispute_reason || disputeReason || null,
      category: category || (targetBookingId ? "Booking Dispute" : "Other"),
      subject: finalSubject,
      description: finalDescription,
      attachments: attachments || null,
      status: "OPEN",
      priority: targetBookingId ? "HIGH" : "LOW"
    });

    return res.status(201).json(SuccessResponse("Support ticket created successfully", ticket));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getSupportTickets(req, res) {
  try {
    const db = require("../../models");
    const tickets = await db.SupportTicket.findAll({
      where: { user_id: req.user.id },
      order: [["createdAt", "DESC"]]
    });
    return res.status(200).json(SuccessResponse("Support tickets fetched successfully", tickets));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getSupportTicketDetails(req, res) {
  try {
    const db = require("../../models");
    const isAdmin = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
    const where = isAdmin ? { id: req.params.id } : { id: req.params.id, user_id: req.user.id };

    const ticket = await db.SupportTicket.findOne({
      where,
      include: [
        { model: db.User, as: "user", attributes: ["id", "name", "email", "phone", "profile_image", "role"] }
      ]
    });
    if (!ticket) {
      return res.status(404).json(ErrorResponse("Ticket not found"));
    }
    return res.status(200).json(SuccessResponse("Support ticket details fetched successfully", ticket));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function replySupportTicket(req, res) {
  try {
    const db = require("../../models");
    const { message, attachments, status } = req.body;
    if (!message && (!attachments || attachments.length === 0)) {
      return res.status(400).json(ErrorResponse("Either a message or an attachment is required"));
    }

    const isAdmin = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
    const where = isAdmin ? { id: req.params.id } : { id: req.params.id, user_id: req.user.id };

    const ticket = await db.SupportTicket.findOne({ where });
    if (!ticket) {
      return res.status(404).json(ErrorResponse("Ticket not found"));
    }

    if (ticket.status === "CLOSED" && !isAdmin) {
      return res.status(400).json(ErrorResponse("Cannot reply to a closed support ticket"));
    }

    const sender = await db.User.findByPk(req.user.id);
    let repliesList = [];
    try {
      repliesList = ticket.replies ? (typeof ticket.replies === "string" ? JSON.parse(ticket.replies) : ticket.replies) : [];
    } catch (_) {
      repliesList = [];
    }

    // Idempotency: Prevent immediate duplicate reply within 10 seconds
    if (repliesList.length > 0) {
      const lastReply = repliesList[repliesList.length - 1];
      if (
        lastReply.sender_id === req.user.id &&
        lastReply.message === message &&
        (new Date() - new Date(lastReply.created_at)) < 10000
      ) {
        return res.status(200).json(SuccessResponse("Reply already submitted", ticket));
      }
    }

    repliesList.push({
      sender_id: req.user.id,
      sender_name: sender ? sender.name : (isAdmin ? "Admin Support" : "User"),
      sender_role: req.user.role,
      message,
      attachments: attachments || null,
      created_at: new Date().toISOString()
    });

    const newStatus = status ? status : (isAdmin ? "OPEN" : "OPEN");
    await ticket.update({
      replies: JSON.stringify(repliesList),
      status: newStatus
    });

    return res.status(200).json(SuccessResponse("Reply added successfully", ticket));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function closeSupportTicket(req, res) {
  try {
    const db = require("../../models");
    const isAdmin = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
    const where = isAdmin ? { id: req.params.id } : { id: req.params.id, user_id: req.user.id };

    const ticket = await db.SupportTicket.findOne({ where });
    if (!ticket) {
      return res.status(404).json(ErrorResponse("Ticket not found"));
    }

    await ticket.update({ status: "CLOSED" });
    return res.status(200).json(SuccessResponse("Ticket closed successfully", ticket));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getHomeDashboard,
  getCategories,
  createSupportTicket,
  getOffers,
  getFeaturedArtists,
  getNearbyArtists,
  getPopularArtists,
  searchArtists,
  getArtistById,
  getArtistServices,
  getArtistPortfolio,
  getArtistReviews,
  getArtistAvailability,
  getSimilarArtists,
  getTrendingArtists,
  getRecommendedArtists,
  getSuggestions,
  getTrendingSearches,
  getRecentSearches,
  saveRecentSearch,
  deleteRecentSearch,
  getFilterMetadata,
  addFavorite,
  removeFavorite,
  getFavorites,
  getPortfolios,
  likePortfolio,
  unlikePortfolio,
  savePortfolio,
  unsavePortfolio,
  getSavedPortfolios,
  getDashboard,
  getBookings,
  getProfile,
  updateProfile,
  getWishlist,
  getCoupons,
  getNotifications,
  getAddresses,
  getReviews,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  changePassword,
  deleteAccount,
  getSupportTickets,
  getSupportTicketDetails,
  replySupportTicket,
  closeSupportTicket
};

async function getReels(req, res) {
  try {
    const { page, limit } = req.query;
    const userId = req.user ? req.user.id : null;
    const response = await CustomerService.getReels(userId, page, limit);
    return res.status(200).json(SuccessResponse("Reels fetched successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function commentPortfolio(req, res) {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!id) return res.status(400).json(ErrorResponse("Portfolio ID is required"));
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json(ErrorResponse("Comment text is required"));
    }
    if (text.trim().length > 1000) {
      return res.status(400).json(ErrorResponse("Comment exceeds maximum allowed length of 1000 characters"));
    }
    const response = await CustomerService.commentPortfolio(req.user.id, id, text.trim());
    return res.status(201).json(SuccessResponse("Comment added", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getPortfolioComments(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json(ErrorResponse("Portfolio ID is required"));
    const { page, limit } = req.query;
    const response = await CustomerService.getPortfolioComments(id, page, limit);
    return res.status(200).json(SuccessResponse("Comments fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function deletePortfolioComment(req, res) {
  try {
    const { commentId } = req.params;
    if (!commentId) return res.status(400).json(ErrorResponse("Comment ID is required"));
    await CustomerService.deletePortfolioComment(req.user.id, commentId);
    return res.status(200).json(SuccessResponse("Comment deleted"));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function addViewToPortfolio(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json(ErrorResponse("Portfolio ID is required"));
    await CustomerService.addViewToPortfolio(id);
    return res.status(200).json(SuccessResponse("View added"));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports.getReels = getReels;
module.exports.commentPortfolio = commentPortfolio;
module.exports.getPortfolioComments = getPortfolioComments;
module.exports.deletePortfolioComment = deletePortfolioComment;
module.exports.addViewToPortfolio = addViewToPortfolio;
