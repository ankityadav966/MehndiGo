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
    professionalism: reviewData.professionalism
  };
  const res = await apiRequest("POST", "/customer/review", payload, true);
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
