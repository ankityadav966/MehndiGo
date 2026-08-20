const ReviewService = require("../../services/review.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

async function getReviews(req, res) {
  try {
    const response = await ReviewService.getReviews(req.query);
    return res.status(200).json(SuccessResponse("Reviews fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getReviewById(req, res) {
  try {
    const response = await ReviewService.getReviewById(req.params.id);
    return res.status(200).json(SuccessResponse("Review details fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function createReview(req, res) {
  try {
    const response = await ReviewService.createReview(req.user.id, req.body);
    return res.status(201).json(SuccessResponse("Review created successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateReview(req, res) {
  try {
    const response = await ReviewService.updateReview(req.params.id, req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Review updated successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function deleteReview(req, res) {
  try {
    await ReviewService.deleteReview(req.params.id, req.user.id);
    return res.status(200).json(SuccessResponse("Review deleted successfully", null));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function addReply(req, res) {
  try {
    const { review_id, reply_text } = req.body;
    const response = await ReviewService.addReply(req.user.id, review_id, reply_text);
    return res.status(201).json(SuccessResponse("Reply submitted successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function reportReview(req, res) {
  try {
    const { review_id, reason } = req.body;
    const response = await ReviewService.reportReview(req.user.id, review_id, reason);
    return res.status(201).json(SuccessResponse("Review reported successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function submitHelpfulVote(req, res) {
  try {
    const { review_id } = req.body;
    const response = await ReviewService.submitHelpfulVote(req.user.id, review_id);
    return res.status(200).json(SuccessResponse("Helpful vote registered", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function removeHelpfulVote(req, res) {
  try {
    const { review_id } = req.body;
    const response = await ReviewService.removeHelpfulVote(req.user.id, review_id);
    return res.status(200).json(SuccessResponse("Helpful vote removed", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getArtistReviews(req, res) {
  try {
    const response = await ReviewService.getArtistReviews(req.user.id);
    return res.status(200).json(SuccessResponse("Artist reviews fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getArtistReviewsAnalytics(req, res) {
  try {
    const response = await ReviewService.getArtistReviewsAnalytics(req.user.id);
    return res.status(200).json(SuccessResponse("Artist reviews analytics fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function uploadReviewMedia(req, res) {
  try {
    if (!req.file && (!req.files || req.files.length === 0)) {
      return res.status(400).json(ErrorResponse("No media file uploaded"));
    }

    const file = req.file || (Array.isArray(req.files) ? req.files[0] : null);
    const isVideo = file?.mimetype?.startsWith("video") || /\.(mp4|mov|3gp|mkv|webm)$/i.test(file?.originalname || "");
    const mediaUrl = file?.path;
    let thumbnailUrl = null;

    if (isVideo && mediaUrl && mediaUrl.includes("/video/upload/")) {
      thumbnailUrl = mediaUrl.replace("/video/upload/", "/video/upload/so_0,f_jpg/").replace(/\.(mp4|mov|3gp|mkv|webm)$/i, ".jpg");
    }

    return res.status(200).json(SuccessResponse("Review media uploaded successfully", {
      url: mediaUrl,
      thumbnail: thumbnailUrl,
      isVideo: !!isVideo,
      mimetype: file?.mimetype
    }));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getMyReviews(req, res) {
  try {
    const response = await ReviewService.getMyReviews(req.user.id);
    return res.status(200).json(SuccessResponse("My reviews fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getReviews,
  getMyReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  addReply,
  reportReview,
  submitHelpfulVote,
  removeHelpfulVote,
  getArtistReviews,
  getArtistReviewsAnalytics,
  uploadReviewMedia
};
