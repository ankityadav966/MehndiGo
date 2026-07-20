const express = require("express");
const router = express.Router();
const ArtistController = require("../controllers/artist/artist.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.get("/dashboard", authenticate, ArtistController.getDashboard);
router.get("/bookings", authenticate, ArtistController.getBookings);
router.get("/earnings", authenticate, ArtistController.getEarnings);
router.get("/wallet", authenticate, ArtistController.getWallet);
router.get("/reviews", authenticate, ArtistController.getReviews);
router.get("/analytics", authenticate, ArtistController.getAnalytics);
router.get("/profile", authenticate, ArtistController.getProfile);
router.put("/profile", authenticate, ArtistController.updateProfile);
router.get("/notifications", authenticate, ArtistController.getNotifications);

// Leads Management
router.get("/leads", authenticate, ArtistController.getLeads);
router.get("/leads/filter", authenticate, ArtistController.filterLeads);
router.get("/leads/search", authenticate, ArtistController.searchLeads);
router.get("/leads/:id", authenticate, ArtistController.getLeadById);
router.put("/leads/accept", authenticate, ArtistController.acceptLead);
router.put("/leads/reject", authenticate, ArtistController.rejectLead);
router.put("/leads/view", authenticate, ArtistController.viewLead);

// Services Management
router.get("/services", authenticate, ArtistController.getServices);
router.get("/services/:id", authenticate, ArtistController.getServiceById);
router.post("/services", authenticate, ArtistController.createService);
router.put("/services/status", authenticate, ArtistController.updateServiceStatus);
router.put("/services/:id", authenticate, ArtistController.updateService);
router.delete("/services/:id", authenticate, ArtistController.deleteService);
router.post("/services/media", authenticate, ArtistController.postServiceMedia);
router.delete("/services/media", authenticate, ArtistController.deleteServiceMedia);

const ReviewController = require("../controllers/review/review.controller");

// Reviews & Ratings
router.get("/reviews", authenticate, ReviewController.getArtistReviews);
router.get("/reviews/analytics", authenticate, ReviewController.getArtistReviewsAnalytics);

// Artist Live Tracking Location Update
const TrackingController = require("../controllers/tracking/tracking.controller");
router.post("/location/update", authenticate, TrackingController.updateLocation);

module.exports = router;
