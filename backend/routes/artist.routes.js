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

// Services & Packages Management
router.get("/services", authenticate, ArtistController.getServices);
router.get("/services/:id", authenticate, ArtistController.getServiceById);
router.post("/services", authenticate, ArtistController.createService);
router.put("/services/status", authenticate, ArtistController.updateServiceStatus);
router.put("/services/:id", authenticate, ArtistController.updateService);
router.delete("/services/:id", authenticate, ArtistController.deleteService);
router.post("/services/media", authenticate, ArtistController.postServiceMedia);
router.delete("/services/media", authenticate, ArtistController.deleteServiceMedia);

// Standalone Package Management
router.post("/services/:serviceId/packages", authenticate, ArtistController.createPackage);
router.put("/packages/:id", authenticate, ArtistController.updatePackage);
router.delete("/packages/:id", authenticate, ArtistController.deletePackage);

// Availability, Working Schedule & Blocked Dates
router.get("/availability", authenticate, ArtistController.getAvailability);
router.put("/availability", authenticate, ArtistController.updateAvailability);
router.post("/availability/blocked-dates", authenticate, ArtistController.addBlockedDate);
router.delete("/availability/blocked-dates", authenticate, ArtistController.removeBlockedDate);

const upload = require("../middleware/upload.middleware");

// Portfolio Management
router.get("/portfolio", authenticate, ArtistController.getMyPortfolio);
router.get("/portfolio/upload-signature", authenticate, ArtistController.getUploadSignature);
router.get("/portfolio/:id", authenticate, ArtistController.getPortfolioById);
router.post("/portfolio", authenticate, upload.single("portfolio_image"), ArtistController.createPortfolio);
router.put("/portfolio/reorder", authenticate, ArtistController.reorderPortfolio);
router.put("/profile/cover", authenticate, ArtistController.setCoverImage);
router.put("/portfolio/:id", authenticate, ArtistController.updatePortfolio);
router.delete("/portfolio/:id", authenticate, ArtistController.deletePortfolio);
router.post("/portfolio/upload", authenticate, upload.array("media", 10), ArtistController.uploadPortfolioMedia);

const ReviewController = require("../controllers/review/review.controller");

// Reviews & Ratings
router.get("/reviews", authenticate, ReviewController.getArtistReviews);
router.get("/reviews/analytics", authenticate, ReviewController.getArtistReviewsAnalytics);

// Artist Live Tracking Location Update
const TrackingController = require("../controllers/tracking/tracking.controller");
router.post("/location/update", authenticate, TrackingController.updateLocation);

// Artist Support Tickets & Disputes
const CustomerController = require("../controllers/customer/customer.controller");
router.post("/support/ticket", authenticate, CustomerController.createSupportTicket);
router.get("/support/tickets", authenticate, CustomerController.getSupportTickets);
router.get("/support/tickets/:id", authenticate, CustomerController.getSupportTicketDetails);
router.post("/support/tickets/:id/reply", authenticate, CustomerController.replySupportTicket);
router.put("/support/tickets/:id/close", authenticate, CustomerController.closeSupportTicket);

module.exports = router;
