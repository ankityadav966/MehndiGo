const express = require("express");
const router = express.Router();
const AnalyticsController = require("../controllers/analytics/analytics.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const { apiCache } = require("../middleware/cache.middleware");

router.get("/dashboard", authenticate, authorize("ADMIN"), apiCache(60), AnalyticsController.getDashboard);
router.get("/revenue", authenticate, authorize("ADMIN"), apiCache(60), AnalyticsController.getRevenue);
router.get("/bookings", authenticate, authorize("ADMIN"), apiCache(60), AnalyticsController.getBookings);
router.get("/customers", authenticate, authorize("ADMIN"), AnalyticsController.getCustomers);
router.get("/artists", authenticate, authorize("ADMIN"), AnalyticsController.getArtists);
router.get("/export", authenticate, authorize("ADMIN"), AnalyticsController.exportCSV);

module.exports = router;
