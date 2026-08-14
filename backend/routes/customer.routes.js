const express = require("express");
const router = express.Router();
const CustomerController = require("../controllers/customer/customer.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Customer dashboard base APIs
router.get("/home", authenticate, CustomerController.getHomeDashboard);
router.get("/categories", authenticate, CustomerController.getCategories);
router.get("/offers", authenticate, CustomerController.getOffers);
router.get("/featured-artists", authenticate, CustomerController.getFeaturedArtists);
router.get("/nearby-artists", authenticate, CustomerController.getNearbyArtists);
router.get("/popular-artists", authenticate, CustomerController.getPopularArtists);

// Customer artist listing specific queries
router.get("/artists", authenticate, CustomerController.searchArtists);
router.get("/artists/:id", authenticate, CustomerController.getArtistById);
router.get("/trending-artists", authenticate, CustomerController.getTrendingArtists);
router.get("/recommended-artists", authenticate, CustomerController.getRecommendedArtists);

// Singular artist profile sub-resource queries
router.get("/artist/:id", authenticate, CustomerController.getArtistById);
router.get("/artist/:id/services", authenticate, CustomerController.getArtistServices);
router.get("/artist/:id/portfolio", authenticate, CustomerController.getArtistPortfolio);
router.get("/artist/:id/reviews", authenticate, CustomerController.getArtistReviews);
router.get("/artist/:id/availability", authenticate, CustomerController.getArtistAvailability);
router.get("/artist/:id/similar", authenticate, CustomerController.getSimilarArtists);

// Singular artist favorite actions
router.post("/artist/favorite", authenticate, CustomerController.addFavorite);
router.delete("/artist/favorite", authenticate, CustomerController.removeFavorite);

// Customer search and discovery routes
router.get("/search", authenticate, CustomerController.searchArtists);
router.get("/search/suggestions", authenticate, CustomerController.getSuggestions);
router.get("/trending-search", authenticate, CustomerController.getTrendingSearches);
router.get("/recent-search", authenticate, CustomerController.getRecentSearches);
router.post("/recent-search", authenticate, CustomerController.saveRecentSearch);
router.delete("/recent-search", authenticate, CustomerController.deleteRecentSearch);
router.get("/filter", authenticate, CustomerController.getFilterMetadata);

// Customer favorites routes
router.get("/favorite", authenticate, CustomerController.getFavorites);
router.post("/favorite", authenticate, CustomerController.addFavorite);
router.delete("/favorite", authenticate, CustomerController.removeFavorite);

// Customer portfolio gallery & reaction routes
router.get("/portfolio", authenticate, CustomerController.getPortfolios);
router.post("/portfolio/like", authenticate, CustomerController.likePortfolio);
router.delete("/portfolio/like", authenticate, CustomerController.unlikePortfolio);
router.post("/portfolio/save", authenticate, CustomerController.savePortfolio);
router.delete("/portfolio/save", authenticate, CustomerController.unsavePortfolio);
router.get("/portfolio/saved", authenticate, CustomerController.getSavedPortfolios);

// Customer dashboard module sub-resources routes
router.get("/dashboard", authenticate, CustomerController.getDashboard);
router.get("/bookings", authenticate, CustomerController.getBookings);
router.get("/profile", authenticate, CustomerController.getProfile);
router.put("/profile", authenticate, CustomerController.updateProfile);
router.get("/wishlist", authenticate, CustomerController.getWishlist);
const ArtistController = require("../controllers/artist/artist.controller");

router.get("/coupons", authenticate, CustomerController.getCoupons);
router.get("/notifications", authenticate, CustomerController.getNotifications);
router.get("/addresses", authenticate, CustomerController.getAddresses);
router.post("/addresses", authenticate, CustomerController.addAddress);
router.put("/addresses/:id", authenticate, CustomerController.updateAddress);
router.patch("/addresses/:id/default", authenticate, CustomerController.setDefaultAddress);
router.delete("/addresses/:id", authenticate, CustomerController.deleteAddress);

const ReviewController = require("../controllers/review/review.controller");
router.get("/reviews", authenticate, CustomerController.getReviews);
router.post("/review", authenticate, ReviewController.createReview);
router.post("/support/ticket", authenticate, CustomerController.createSupportTicket);
router.get("/support/tickets", authenticate, CustomerController.getSupportTickets);
router.get("/support/tickets/:id", authenticate, CustomerController.getSupportTicketDetails);
router.post("/support/tickets/:id/reply", authenticate, CustomerController.replySupportTicket);
router.put("/support/tickets/:id/close", authenticate, CustomerController.closeSupportTicket);

// Customer-facing Service Catalog routes
router.get("/services", authenticate, ArtistController.getCustomerServices);
router.get("/service/:id", authenticate, ArtistController.getCustomerServiceDetail);

module.exports = router;
