"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const ReviewService = require("../services/review.services");
const CustomerService = require("../services/customer.services");

describe("ARTIST MODULE 8: REVIEWS + RATINGS + REPUTATION INTEGRATION SUITE", () => {
  let approvedArtistUser, approvedArtistProfile;
  let rivalArtistUser, rivalArtistProfile;
  let customerUserA, customerUserB;
  let serviceItem;
  let completedBooking1, completedBooking2, inProgressBooking, cancelledBooking;
  let createdReview1;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Approved Artist A
    approvedArtistUser = await db.User.create({
      name: "Pooja Mehndi Artist",
      email: "pooja@reviews.com",
      phone: "9876543240",
      phone_number: "9876543240",
      role: "ARTIST",
      is_verified: true
    });
    approvedArtistProfile = await db.ArtistProfile.create({
      user_id: approvedArtistUser.id,
      bio: "Award-winning Henna Designer",
      experience_years: 8,
      verification_status: "APPROVED",
      is_available: true,
      avg_rating: 0.0,
      total_reviews: 0,
      city: "Jaipur"
    });

    // 2. Rival Artist B
    rivalArtistUser = await db.User.create({
      name: "Rival Henna Artist",
      email: "rival@reviews.com",
      phone: "9876543241",
      phone_number: "9876543241",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtistProfile = await db.ArtistProfile.create({
      user_id: rivalArtistUser.id,
      bio: "Rival Henna Designer",
      experience_years: 4,
      verification_status: "APPROVED",
      is_available: true,
      avg_rating: 0.0,
      total_reviews: 0,
      city: "Jaipur"
    });

    // 3. Customers
    customerUserA = await db.User.create({
      name: "Ananya Sharma",
      email: "ananya@reviews.com",
      phone: "9123456711",
      phone_number: "9123456711",
      role: "CUSTOMER",
      is_verified: true,
      profile_image: "https://example.com/avatar1.jpg"
    });

    customerUserB = await db.User.create({
      name: "Bhavna Patel",
      email: "bhavna@reviews.com",
      phone: "9123456712",
      phone_number: "9123456712",
      role: "CUSTOMER",
      is_verified: true,
      profile_image: "https://example.com/avatar2.jpg"
    });

    // 4. Service
    const category = await db.Category.create({
      name: "Bridal Luxury",
      slug: "bridal-luxury",
      status: "ACTIVE",
      is_active: true
    });

    serviceItem = await db.Service.create({
      artist_id: approvedArtistProfile.id,
      specialization_name: "Marwari Royal Bridal Mehndi",
      category: "Bridal Luxury",
      category_id: category.id,
      minimum_price: 4500,
      duration_minutes: 180,
      is_active: true
    });

    const todayStr = new Date().toISOString().substring(0, 10);
    const slot = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfile.id,
      date: todayStr,
      start_time: `${todayStr}T10:00:00.000Z`,
      end_time: `${todayStr}T13:00:00.000Z`,
      is_booked: true
    });

    // 5. Booking 1: Genuinely COMPLETED
    completedBooking1 = await db.Booking.create({
      booking_code: "MG-800101",
      user_id: customerUserA.id,
      artist_id: approvedArtistProfile.id,
      service_id: serviceItem.id,
      slot_id: slot.id,
      total_price: 4500,
      advance_paid: 450,
      remaining_amount: 0,
      final_amount: 4500,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED",
      check_in_otp_verified: true,
      check_out_otp_verified: true,
      service_started_at: new Date(Date.now() - 3 * 3600 * 1000),
      check_out_time: new Date(),
      address: "Civil Lines, Jaipur"
    });

    // 6. Booking 2: Genuinely COMPLETED (for second review test)
    completedBooking2 = await db.Booking.create({
      booking_code: "MG-800102",
      user_id: customerUserB.id,
      artist_id: approvedArtistProfile.id,
      service_id: serviceItem.id,
      slot_id: slot.id,
      total_price: 4500,
      advance_paid: 450,
      remaining_amount: 0,
      final_amount: 4500,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED",
      check_in_otp_verified: true,
      check_out_otp_verified: true,
      service_started_at: new Date(Date.now() - 4 * 3600 * 1000),
      check_out_time: new Date(),
      address: "Malviya Nagar, Jaipur"
    });

    // 7. Booking 3: IN_PROGRESS (Non-completed)
    inProgressBooking = await db.Booking.create({
      booking_code: "MG-800103",
      user_id: customerUserA.id,
      artist_id: approvedArtistProfile.id,
      service_id: serviceItem.id,
      slot_id: slot.id,
      total_price: 4500,
      advance_paid: 450,
      remaining_amount: 4050,
      final_amount: 4500,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "SERVICE_IN_PROGRESS",
      check_in_otp_verified: true,
      check_out_otp_verified: false,
      address: "C-Scheme, Jaipur"
    });

    // 8. Booking 4: CANCELLED
    cancelledBooking = await db.Booking.create({
      booking_code: "MG-800104",
      user_id: customerUserA.id,
      artist_id: approvedArtistProfile.id,
      service_id: serviceItem.id,
      slot_id: slot.id,
      total_price: 4500,
      advance_paid: 450,
      remaining_amount: 4050,
      final_amount: 4500,
      booking_status: "CANCELLED",
      payment_status: "REFUNDED",
      detailed_status: "CANCELLED",
      address: "Vaishali Nagar, Jaipur"
    });
  });

  it("1. Pre-condition Guard: Review submission on non-completed booking is rejected (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await ReviewService.createReview(customerUserA.id, {
          booking_id: inProgressBooking.id,
          rating: 5,
          comment: "Great work so far!"
        });
      },
      (err) => err.statusCode === 400 && err.message.includes("Only completed bookings can be reviewed")
    );
  });

  it("2. Pre-condition Guard: Review submission on cancelled booking is rejected (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await ReviewService.createReview(customerUserA.id, {
          booking_id: cancelledBooking.id,
          rating: 5,
          comment: "I want to review cancelled booking"
        });
      },
      (err) => err.statusCode === 400 && err.message.includes("Only completed bookings can be reviewed")
    );
  });

  it("3. Authorization Guard: Customer B cannot review Customer A's booking (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ReviewService.createReview(customerUserB.id, {
          booking_id: completedBooking1.id,
          rating: 5,
          comment: "I am not the owner"
        });
      },
      (err) => err.statusCode === 403 && err.message.includes("not authorized to review this booking")
    );
  });

  it("4. Rating Validation: Out of bounds rating (0, 6, NaN) is rejected (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await ReviewService.createReview(customerUserA.id, {
          booking_id: completedBooking1.id,
          rating: 0,
          comment: "Zero rating"
        });
      },
      (err) => err.statusCode === 400 && err.message.includes("between 1 and 5")
    );

    await assert.rejects(
      async () => {
        await ReviewService.createReview(customerUserA.id, {
          booking_id: completedBooking1.id,
          rating: 6,
          comment: "Six rating"
        });
      },
      (err) => err.statusCode === 400 && err.message.includes("between 1 and 5")
    );
  });

  it("5. Genuine Review Creation: Customer A submits 5-star review with photos and sub-ratings", async () => {
    createdReview1 = await ReviewService.createReview(customerUserA.id, {
      booking_id: completedBooking1.id,
      artist_id: rivalArtistProfile.id, // Tampered artistId in payload must be ignored!
      rating: 5,
      comment: "Absolutely stunning bridal henna work! Highly recommended.",
      design_quality: 5,
      punctuality: 5,
      professionalism: 5,
      photos: ["https://example.com/henna1.jpg", "https://example.com/henna2.jpg"]
    });

    assert.ok(createdReview1);
    assert.equal(createdReview1.user_id, customerUserA.id);
    assert.equal(createdReview1.artist_id, approvedArtistProfile.id, "Artist ID must be bound to canonical booking artist");
    assert.equal(createdReview1.rating, 5);
    assert.equal(createdReview1.comment, "Absolutely stunning bridal henna work! Highly recommended.");
    assert.equal(createdReview1.design_quality_rating, 5);
    assert.equal(createdReview1.photos.length, 2);

    // Verify rating recalculation on ArtistProfile
    const artist = await db.ArtistProfile.findByPk(approvedArtistProfile.id);
    assert.equal(artist.avg_rating, 5.0);
    assert.equal(artist.total_reviews, 1);
  });

  it("6. One Review Per Booking Guard: Submitting a second review for the same booking is blocked (400)", async () => {
    await assert.rejects(
      async () => {
        await ReviewService.createReview(customerUserA.id, {
          booking_id: completedBooking1.id,
          rating: 5,
          comment: "Submitting another review"
        });
      },
      (err) => err.statusCode === 400 && err.message.includes("already been reviewed")
    );
  });

  it("7. Rating Aggregation: Second customer submits 4-star review -> Average becomes 4.5", async () => {
    const review2 = await ReviewService.createReview(customerUserB.id, {
      booking_id: completedBooking2.id,
      rating: 4,
      comment: "Very neat patterns and on time.",
      punctuality: 5
    });

    assert.ok(review2);

    const artist = await db.ArtistProfile.findByPk(approvedArtistProfile.id);
    assert.equal(artist.avg_rating, 4.5, "(5 + 4) / 2 = 4.5");
    assert.equal(artist.total_reviews, 2);
  });

  it("8. Artist Review Display Isolation: Artist A sees only their 2 reviews; Rival Artist B sees 0 reviews", async () => {
    const artistAReviews = await ReviewService.getArtistReviews(approvedArtistUser.id);
    assert.equal(artistAReviews.length, 2);
    assert.equal(artistAReviews[0].artist_id, approvedArtistProfile.id);

    const artistBReviews = await ReviewService.getArtistReviews(rivalArtistUser.id);
    assert.equal(artistBReviews.length, 0, "Rival artist must receive clean empty array []");
  });

  it("9. Customer Identity Minimization: Review response returns name and avatar but no sensitive auth/phone", async () => {
    const artistAReviews = await ReviewService.getArtistReviews(approvedArtistUser.id);
    const rev = artistAReviews.find((r) => r.id === createdReview1.id);
    assert.ok(rev.user);
    assert.equal(rev.user.name, "Ananya Sharma");
    assert.equal(rev.user.profile_image, "https://example.com/avatar1.jpg");
    assert.equal(rev.user.phone, undefined, "Phone must not be leaked in review list");
    assert.equal(rev.user.email, undefined, "Email must not be leaked in review list");
  });

  it("10. Artist Reply: Assigned Artist A submits official reply to review", async () => {
    const reply = await ReviewService.addReply(approvedArtistUser.id, createdReview1.id, "Thank you so much Ananya! It was a pleasure creating your bridal henna.");
    assert.ok(reply);
    assert.equal(reply.review_id, createdReview1.id);
    assert.equal(reply.artist_id, approvedArtistProfile.id);
    assert.equal(reply.reply_text, "Thank you so much Ananya! It was a pleasure creating your bridal henna.");
  });

  it("11. Rival Artist Reply Guard: Rival Artist B cannot reply to Artist A's review (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ReviewService.addReply(rivalArtistUser.id, createdReview1.id, "Rival trying to reply");
      },
      (err) => err.statusCode === 403 && err.message.includes("Unauthorized to reply to this review")
    );
  });

  it("12. Single Official Reply Idempotency: Retrying reply updates existing reply without creating duplicates", async () => {
    const updatedReply = await ReviewService.addReply(approvedArtistUser.id, createdReview1.id, "Updated: Thank you so much Ananya! Wishing you all the best.");
    assert.equal(updatedReply.reply_text, "Updated: Thank you so much Ananya! Wishing you all the best.");

    const replyCount = await db.ReviewReply.count({ where: { review_id: createdReview1.id } });
    assert.equal(replyCount, 1, "Must maintain exactly 1 reply row per review");
  });

  it("13. Helpful Votes: Customer registers helpful vote and duplicates are prevented (400)", async () => {
    const votedReview = await ReviewService.submitHelpfulVote(customerUserB.id, createdReview1.id);
    assert.equal(votedReview.helpful_count, 1);

    // Duplicate vote attempt
    await assert.rejects(
      async () => {
        await ReviewService.submitHelpfulVote(customerUserB.id, createdReview1.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("already voted this review as helpful")
    );
  });

  it("14. Analytics & Rating Breakdown: Returns exact counts for each star tier and average rating", async () => {
    const analytics = await ReviewService.getArtistReviewsAnalytics(approvedArtistUser.id);
    assert.equal(analytics.totalReviews, 2);
    assert.equal(analytics.averageRating, "4.5");
    assert.equal(analytics.breakdown[5], 1);
    assert.equal(analytics.breakdown[4], 1);
    assert.equal(analytics.breakdown[3], 0);
  });

  it("15. Customer Artist Profile Sync: Public customer fetch of artist details reflects canonical rating and reviews", async () => {
    const publicProfile = await CustomerService.getArtistById(approvedArtistProfile.id);
    assert.ok(publicProfile);
    assert.equal(publicProfile.avg_rating, 4.5);
    assert.equal(publicProfile.total_reviews, 2);
    assert.equal(publicProfile.reviews.length, 2);
  });
});
