const express = require("express");

const router = express.Router();

const AdminController = require("../../controller/admin.controller");
const { authorize } = require("../../middleware/role.middleware");
const { authenticate } = require("../../middleware/auth.middleware");

router.get("/users", authenticate, authorize("ADMIN"), AdminController.getAllUsers);
router.get("/artists", authenticate, authorize("ADMIN"), AdminController.getAllArtists);
router.get("/stats", authenticate, authorize("ADMIN"), AdminController.getStats);
router.get("/bookings", authenticate, authorize("ADMIN"), AdminController.getAllBookings);
router.get("/payments", authenticate, authorize("ADMIN"), AdminController.getAllPayments);
router.get("/notifications", authenticate, authorize("ADMIN"), AdminController.getAllNotifications);
router.post("/notifications", authenticate, authorize("ADMIN"), AdminController.sendSystemNotification);
router.get("/chats", authenticate, authorize("ADMIN"), AdminController.getAllMessages);

router.put("/artist/:id/verify", authenticate, authorize("ADMIN"), AdminController.verifyArtist);

// New routes for pending artists
router.get(
  "/pending-artists",
  authenticate,
  authorize("ADMIN"),
  AdminController.getPendingArtists,
);
router.patch(
  "/artist/:id/approve",
  authenticate,
  authorize("ADMIN"),
  AdminController.approveArtist,
);
router.patch(
  "/artist/:id/reject",
  authenticate,
  authorize("ADMIN"),
  AdminController.rejectArtist,
);

module.exports = router;
