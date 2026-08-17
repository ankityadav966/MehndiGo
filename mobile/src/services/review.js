import apiRequest from "./api";

export async function fetchReviews(query = {}) {
  const queryStr = Object.keys(query)
    .map((k) => `${k}=${encodeURIComponent(query[k])}`)
    .join("&");
  const res = await apiRequest("GET", `/reviews?${queryStr}`, null, true);
  return res?.data || res;
}

export async function fetchReviewById(id) {
  const res = await apiRequest("GET", `/reviews/${id}`, null, true);
  return res?.data || res;
}

export async function uploadReviewMedia(fileUri, isVideo = false) {
  try {
    const { getNormalizedUrl } = require("./api");
    const { secureStorage } = require("../utils/storage");
    const FileSystem = require("expo-file-system/legacy");

    let cleanUri = fileUri;
    if (cleanUri.startsWith("/")) {
      cleanUri = `file://${cleanUri}`;
    }

    const endpoint = getNormalizedUrl("/reviews/upload");
    const token = await secureStorage.getAccessToken();

    const response = await FileSystem.uploadAsync(endpoint, cleanUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "media",
      mimeType: isVideo ? "video/mp4" : "image/jpeg",
      parameters: {
        type: isVideo ? "video" : "image",
        is_video: isVideo ? "true" : "false"
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Review media upload failed (${response.status}): ${response.body}`);
    }

    const responseData = JSON.parse(response.body);
    return responseData?.data || responseData;
  } catch (err) {
    console.error("[uploadReviewMedia] Error:", err);
    throw err;
  }
}

export async function createNewReview(reviewData) {
  const payload = {
    bookingId: reviewData.booking_id || reviewData.bookingId,
    booking_id: reviewData.booking_id || reviewData.bookingId,
    artistId: reviewData.artist_id || reviewData.artistId,
    artist_id: reviewData.artist_id || reviewData.artistId,
    rating: reviewData.rating,
    comment: reviewData.comment,
    design_quality: reviewData.design_quality,
    punctuality: reviewData.punctuality,
    professionalism: reviewData.professionalism,
    video_url: reviewData.video_url || null,
    video_thumbnail: reviewData.video_thumbnail || null,
    photos: reviewData.photos || []
  };
  const res = await apiRequest("POST", "/reviews", payload, true);
  return res?.data || res;
}

export async function updateReview(id, reviewData) {
  const res = await apiRequest("PUT", `/reviews/${id}`, reviewData, true);
  return res?.data || res;
}

export async function deleteReview(id) {
  const res = await apiRequest("DELETE", `/reviews/${id}`, null, true);
  return res?.data || res;
}

export async function submitArtistReply(reviewId, replyText) {
  const res = await apiRequest("POST", "/reviews/reply", { review_id: reviewId, reply_text: replyText }, true);
  return res?.data || res;
}

export async function reportReview(reviewId, reason) {
  const res = await apiRequest("POST", "/reviews/report", { review_id: reviewId, reason }, true);
  return res?.data || res;
}

export async function submitHelpfulVote(reviewId) {
  const res = await apiRequest("POST", "/reviews/helpful", { review_id: reviewId }, true);
  return res?.data || res;
}

export async function removeHelpfulVote(reviewId) {
  const res = await apiRequest("DELETE", "/reviews/helpful", { review_id: reviewId }, true);
  return res?.data || res;
}

export async function getArtistReviews() {
  const res = await apiRequest("GET", "/artist/reviews", null, true);
  return res?.data || res;
}

export async function getArtistReviewsAnalytics() {
  const res = await apiRequest("GET", "/artist/reviews/analytics", null, true);
  return res?.data || res;
}

export async function skipReview(bookingId) {
  const res = await apiRequest("PUT", "/booking/skip-review", { bookingId }, true);
  return res?.data || res;
}
