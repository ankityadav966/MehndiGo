const express = require("express");

const router = express.Router();

const AdminController = require("../../controller/admin.controller");
const { authorize } = require("../../middleware/role.middleware");
const { authenticate } = require("../../middleware/auth.middleware");

router.get("/users", AdminController.getAllUsers);

router.put("/artist/:id/verify", AdminController.verifyArtist);

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
