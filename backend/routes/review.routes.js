const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/review/review.controller");
const { authenticate } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

router.get("/", authenticate, ReviewController.getReviews);
router.get("/:id", authenticate, ReviewController.getReviewById);
router.post("/", authenticate, ReviewController.createReview);
router.post("/upload", authenticate, upload.single("file"), ReviewController.uploadReviewMedia);
router.put("/:id", authenticate, ReviewController.updateReview);
router.delete("/:id", authenticate, ReviewController.deleteReview);
router.post("/reply", authenticate, ReviewController.addReply);
router.post("/report", authenticate, ReviewController.reportReview);
router.post("/helpful", authenticate, ReviewController.submitHelpfulVote);
router.delete("/helpful", authenticate, ReviewController.removeHelpfulVote);

module.exports = router;
