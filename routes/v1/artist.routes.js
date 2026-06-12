const express = require("express");

const router = express.Router();

const ArtistController = require("../../controller/artist.controller");

const { authenticate } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/role.middleware");
const upload = require("../../middleware/upload.middleware");
// artist routes
router.post(
  "/profile",

  authenticate,

  authorize("ARTIST"),

  upload.fields([
    {
      name: "aadhaar_front",

      maxCount: 1,
    },

    {
      name: "aadhaar_back",

      maxCount: 1,
    },

    {
      name: "selfie_image",

      maxCount: 1,
    },
  ]),

  ArtistController.createPortfolio,
);

router.get("/all", ArtistController.getArtists);
router.get("/:id", ArtistController.getArtistDetails);
// service routes
router.post("/service", authenticate, ArtistController.createService);
router.get("/services", authenticate, ArtistController.getMyServices);
router.put("/service/:id", authenticate, ArtistController.updateService);
router.delete("/service/:id", authenticate, ArtistController.deleteService);
// slot routes
router.post("/slot", authenticate, ArtistController.createSlot);
router.get("/slots", authenticate, ArtistController.getMySlots);
router.put("/slot/:id", authenticate, ArtistController.updateSlot);
router.delete("/slot/:id", authenticate, ArtistController.deleteSlot);
// portfolio routes
router.post("/portfolio", authenticate, ArtistController.createPortfolio);
router.get("/portfolio", authenticate, ArtistController.getMyPortfolio);
router.delete("/portfolio/:id", authenticate, ArtistController.deletePortfolio);
// booking routes
router.post("/booking", authenticate, ArtistController.createBooking);
router.get("/bookings", authenticate, ArtistController.getMyBookings);
router.get(
  "/artist-bookings",
  authenticate,
  ArtistController.getArtistBookings,
);
router.delete("/booking/:id", authenticate, ArtistController.cancelBooking);
// payment routes
router.post("/create-order", authenticate, ArtistController.createOrder);
router.post("/verify-payment", authenticate, ArtistController.verifyPayment);
// review routes
router.post("/review", authenticate, ArtistController.createReview);
router.get("/reviews/:artist_id", ArtistController.getArtistReviews);
// notification routes
router.get(
  "/notifications/artistdetails",
  authenticate,
  authorize("ARTIST"),
  ArtistController.getMyNotifications,
);
router.put(
  "/notification/:id/read",
  authenticate,
  authorize("ARTIST"),
  ArtistController.markAsRead,
);

module.exports = router;
