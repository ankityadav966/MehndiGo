const CustomerService = require("../../services/customer.services");
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
    const { latitude, longitude, radius, page, limit } = req.query;
    const response = await CustomerService.getNearbyArtists(latitude, longitude, radius, page, limit);
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
    const response = await CustomerService.getArtistAvailability(req.params.id);
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
    const { artistId } = req.body;
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
    const { artistId } = req.query;
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
    const { portfolioId } = req.body;
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
    const { portfolioId } = req.query;
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
    const { portfolioId } = req.body;
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
    const { portfolioId } = req.query;
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
    const { category, subject, description, attachments } = req.body;

    if (!subject || !description) {
      return res.status(400).json(ErrorResponse("Subject and description are required"));
    }

    const ticket = await db.SupportTicket.create({
      user_id: req.user.id,
      category: category || "Other",
      subject,
      description,
      attachments: attachments || null,
      status: "OPEN",
      priority: "LOW"
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
    const ticket = await db.SupportTicket.findOne({
      where: { id: req.params.id, user_id: req.user.id }
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
    const { message, attachments } = req.body;
    if (!message && (!attachments || attachments.length === 0)) {
      return res.status(400).json(ErrorResponse("Either a message or an attachment is required"));
    }

    const ticket = await db.SupportTicket.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!ticket) {
      return res.status(404).json(ErrorResponse("Ticket not found"));
    }

    const sender = await db.User.findByPk(req.user.id);
    const repliesList = ticket.replies ? JSON.parse(ticket.replies) : [];

    repliesList.push({
      sender_id: req.user.id,
      sender_name: sender ? sender.name : "User",
      sender_role: req.user.role,
      message,
      attachments: attachments || null,
      created_at: new Date().toISOString()
    });

    await ticket.update({
      replies: JSON.stringify(repliesList),
      status: "OPEN"
    });

    return res.status(200).json(SuccessResponse("Reply added successfully", ticket));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function closeSupportTicket(req, res) {
  try {
    const db = require("../../models");
    const ticket = await db.SupportTicket.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
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
  deleteAddress,
  getSupportTickets,
  getSupportTicketDetails,
  replySupportTicket,
  closeSupportTicket
};
