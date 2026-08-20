const db = require("../models");
const AppError = require("../utils/errors/app.error");

class ReviewService {
  async recalculateArtistRating(artistId) {
    const reviews = await db.Review.findAll({ where: { artist_id: artistId } });
    const count = reviews.length;
    const avg = count > 0 ? parseFloat((reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count).toFixed(1)) : 0.0;

    const artist = await db.ArtistProfile.findByPk(artistId);
    if (artist) {
      const updatePayload = {
        avg_rating: avg,
        total_reviews: count
      };
      if (artist.rating !== undefined) {
        updatePayload.rating = avg;
      }
      await artist.update(updatePayload);
    }
  }

  async getReviews(filters = {}) {
    const where = {};
    if (filters.rating) {
      where.rating = Number(filters.rating);
    }
    if (filters.artist_id) {
      where.artist_id = Number(filters.artist_id);
    }

    let order = [["createdAt", "DESC"]];
    if (filters.sort === "highest_rating") {
      order = [["rating", "DESC"]];
    } else if (filters.sort === "lowest_rating") {
      order = [["rating", "ASC"]];
    } else if (filters.sort === "most_helpful") {
      order = [["helpful_count", "DESC"]];
    } else if (filters.sort === "oldest") {
      order = [["createdAt", "ASC"]];
    }

    return await db.Review.findAll({
      where,
      order,
      include: [
        { model: db.User, as: "user", attributes: ["name", "profile_image"] },
        { model: db.ReviewReply, as: "replies" }
      ]
    });
  }

  async getReviewById(id) {
    const review = await db.Review.findByPk(id, {
      include: [
        { model: db.User, as: "user", attributes: ["name"] },
        { model: db.ReviewReply, as: "replies" }
      ]
    });
    if (!review) throw new AppError("Review not found", 404);
    return review;
  }

  async createReview(userId, data) {
    const { booking_id, rating, comment, design_quality, punctuality, professionalism, video_url, video_thumbnail, photos } = data;

    // Validate rating range
    const numRating = Number(rating);
    if (!rating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new AppError("Rating must be a valid number between 1 and 5.", 400);
    }

    // Validate booking
    const booking = await db.Booking.findByPk(booking_id);
    if (!booking) throw new AppError("Booking not found", 404);

    // Validate user identity: only customer who booked can review
    if (Number(booking.user_id) !== Number(userId)) {
      throw new AppError("You are not authorized to review this booking.", 403);
    }

    const isCompleted = ["COMPLETED", "COMPLETED_CLOSED"].includes(booking.booking_status) ||
                        ["COMPLETED", "COMPLETED_CLOSED"].includes(booking.detailed_status);
    if (!isCompleted) {
      throw new AppError("Only completed bookings can be reviewed.", 400);
    }

    // Check duplicate
    const existing = await db.Review.findOne({ where: { booking_id } });
    if (existing) throw new AppError("This booking has already been reviewed.", 400);

    const parseSubRating = (val) => {
      if (val === undefined || val === null || val === "") return null;
      const n = Number(val);
      return (!isNaN(n) && n >= 1 && n <= 5) ? n : null;
    };

    const review = await db.Review.create({
      booking_id,
      user_id: userId,
      artist_id: booking.artist_id,
      rating: Math.round(numRating),
      comment: typeof comment === "string" ? comment.trim() : "",
      design_quality_rating: parseSubRating(design_quality),
      punctuality_rating: parseSubRating(punctuality),
      professionalism_rating: parseSubRating(professionalism),
      video_url: video_url || null,
      video_thumbnail: video_thumbnail || null,
      photos: Array.isArray(photos) ? photos : (photos ? [photos] : []),
      is_verified: true
    });

    await this.recalculateArtistRating(booking.artist_id);

    // Update booking status to COMPLETED_CLOSED
    await booking.update({ detailed_status: "COMPLETED_CLOSED" });

    // Send notifications
    try {
      // Notify Artist about review
      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        await db.Notification.create({
          user_id: artistProfile.user_id,
          title: "New Review Received! ⭐️",
          message: `Congratulations! A customer left a ${rating}-star review for booking #${booking.booking_code}.`,
          type: "REVIEW",
          data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
        });
      }

      // Notify Customer & Artist about Chat & Booking Closure
      await db.Notification.create({
        user_id: userId,
        title: "Booking Closed & Chat Session Terminated 🔒",
        message: `Your booking #${booking.booking_code} lifecycle is now fully closed. Chat history is preserved as read-only.`,
        type: "BOOKING",
        data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
      });

      if (artistProfile) {
        await db.Notification.create({
          user_id: artistProfile.user_id,
          title: "Booking Closed & Chat Session Terminated 🔒",
          message: `Booking #${booking.booking_code} lifecycle is now fully closed. Chat history is preserved as read-only.`,
          type: "BOOKING",
          data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
        });
      }
    } catch (notifErr) {
      console.error("[Review Notifications] Error creating closure notifications:", notifErr.message);
    }

    // Award review creation XP (+50 XP)
    try {
      const xpService = require("./xp.services");
      await xpService.awardXp(userId, 50, "Submitted a Review", review.id);
    } catch (e) {
      console.error("[Review XP] Error awarding review XP:", e.message);
    }

    return review;
  }

  async updateReview(id, userId, data) {
    const review = await db.Review.findByPk(id);
    if (!review) throw new AppError("Review not found", 404);
    if (Number(review.user_id) !== Number(userId)) throw new AppError("Unauthorized edit request", 403);

    // Validate 24 hours editing limit
    const ageMs = Date.now() - new Date(review.createdAt).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      throw new AppError("Reviews can only be modified within 24 hours of submission.", 400);
    }

    if (data.rating !== undefined) {
      const numRating = Number(data.rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        throw new AppError("Rating must be a valid number between 1 and 5.", 400);
      }
    }

    await review.update({
      rating: data.rating !== undefined ? Math.round(Number(data.rating)) : review.rating,
      comment: data.comment !== undefined ? (typeof data.comment === "string" ? data.comment.trim() : review.comment) : review.comment,
      design_quality_rating: data.design_quality !== undefined ? Number(data.design_quality) : review.design_quality_rating,
      punctuality_rating: data.punctuality !== undefined ? Number(data.punctuality) : review.punctuality_rating,
      professionalism_rating: data.professionalism !== undefined ? Number(data.professionalism) : review.professionalism_rating
    });

    await this.recalculateArtistRating(review.artist_id);
    return review;
  }

  async deleteReview(id, userId) {
    const review = await db.Review.findByPk(id);
    if (!review) throw new AppError("Review not found", 404);
    if (Number(review.user_id) !== Number(userId)) throw new AppError("Unauthorized delete request", 403);

    const ageMs = Date.now() - new Date(review.createdAt).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      throw new AppError("Reviews can only be deleted within 24 hours of submission.", 400);
    }

    const artistId = review.artist_id;
    await review.destroy();
    await this.recalculateArtistRating(artistId);
    return true;
  }

  async addReply(userId, reviewId, replyText) {
    if (!replyText || typeof replyText !== "string" || replyText.trim().length === 0) {
      throw new AppError("Reply text cannot be empty", 400);
    }
    const review = await db.Review.findByPk(reviewId);
    if (!review) throw new AppError("Review not found", 404);

    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist || review.artist_id !== artist.id) {
      throw new AppError("Unauthorized to reply to this review", 403);
    }

    const trimmed = replyText.trim();
    const existingReply = await db.ReviewReply.findOne({ where: { review_id: reviewId, artist_id: artist.id } });
    if (existingReply) {
      await existingReply.update({ reply_text: trimmed });
      return existingReply;
    }

    return await db.ReviewReply.create({
      review_id: reviewId,
      artist_id: artist.id,
      reply_text: trimmed
    });
  }

  async reportReview(userId, reviewId, reason) {
    const review = await db.Review.findByPk(reviewId);
    if (!review) throw new AppError("Review not found", 404);

    return await db.ReviewReport.create({
      review_id: reviewId,
      user_id: userId,
      reason
    });
  }

  async submitHelpfulVote(userId, reviewId) {
    const review = await db.Review.findByPk(reviewId);
    if (!review) throw new AppError("Review not found", 404);

    const existing = await db.HelpfulVote.findOne({ where: { review_id: reviewId, user_id: userId } });
    if (existing) throw new AppError("You have already voted this review as helpful", 400);

    await db.HelpfulVote.create({ review_id: reviewId, user_id: userId });
    await review.increment("helpful_count");
    return await review.reload();
  }

  async removeHelpfulVote(userId, reviewId) {
    const review = await db.Review.findByPk(reviewId);
    if (!review) throw new AppError("Review not found", 404);

    const vote = await db.HelpfulVote.findOne({ where: { review_id: reviewId, user_id: userId } });
    if (!vote) throw new AppError("Vote not found", 404);

    await vote.destroy();
    if (review.helpful_count > 0) {
      await review.decrement("helpful_count");
    }
    return await review.reload();
  }

  async getArtistReviews(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    return await db.Review.findAll({
      where: { artist_id: artist.id },
      include: [
        { model: db.User, as: "user", attributes: ["name", "profile_image"] },
        { model: db.ReviewReply, as: "replies" }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getArtistReviewsAnalytics(userId) {
    const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
    if (!artist) throw new AppError("Artist profile not found", 404);

    const reviews = await db.Review.findAll({ where: { artist_id: artist.id } });
    const total = reviews.length;
    const avg = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : "0.0";

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (counts[r.rating] !== undefined) counts[r.rating]++;
    });

    return {
      totalReviews: total,
      averageRating: avg,
      breakdown: counts
    };
  }

  async getMyReviews(userId) {
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }
    return await db.Review.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "profile_image", "phone", "gender"]
            }
          ]
        },
        {
          model: db.Booking,
          as: "booking",
          include: [
            {
              model: db.Service,
              as: "service",
              required: false
            }
          ]
        },
        {
          model: db.ReviewReply,
          as: "replies",
          required: false
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }
}

module.exports = new ReviewService();
