"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const BookingService = require("../services/booking.services");

describe("ARTIST MODULE 6: SERVICE IN PROGRESS + TIMER + LIVE SERVICE STATE INTEGRATION SUITE", () => {
  let approvedArtistUser, approvedArtistProfile;
  let rivalArtistUser, rivalArtistProfile;
  let unapprovedArtistUser, unapprovedArtistProfile;
  let customerUser, rivalCustomerUser;
  let artistServiceItem;
  let slot1, slot2;
  let booking1, booking2;
  let initialStartTime;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Approved Artist A
    approvedArtistUser = await db.User.create({
      name: "Radhika Master Artist",
      email: "radhika@progress.com",
      phone: "9876543220",
      phone_number: "9876543220",
      role: "ARTIST",
      is_verified: true
    });
    approvedArtistProfile = await db.ArtistProfile.create({
      user_id: approvedArtistUser.id,
      bio: "Master Bridal Artist",
      experience_years: 10,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 2. Rival Artist B
    rivalArtistUser = await db.User.create({
      name: "Rival Artist",
      email: "rival@progress.com",
      phone: "9876543221",
      phone_number: "9876543221",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtistProfile = await db.ArtistProfile.create({
      user_id: rivalArtistUser.id,
      bio: "Rival artist profile",
      experience_years: 2,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 3. Unapproved Artist C
    unapprovedArtistUser = await db.User.create({
      name: "Pending Artist",
      email: "pending@progress.com",
      phone: "9876543222",
      phone_number: "9876543222",
      role: "ARTIST",
      is_verified: true
    });
    unapprovedArtistProfile = await db.ArtistProfile.create({
      user_id: unapprovedArtistUser.id,
      bio: "Pending artist profile",
      experience_years: 1,
      verification_status: "PENDING",
      is_available: true,
      city: "Jaipur"
    });

    // 4. Customer Users
    customerUser = await db.User.create({
      name: "Pooja Customer",
      email: "pooja@progress.com",
      phone: "9123456790",
      phone_number: "9123456790",
      role: "CUSTOMER",
      is_verified: true
    });

    rivalCustomerUser = await db.User.create({
      name: "Rival Customer",
      email: "rival_cust@progress.com",
      phone: "9123456791",
      phone_number: "9123456791",
      role: "CUSTOMER",
      is_verified: true
    });

    // 5. Service & Slots
    const category = await db.Category.create({
      name: "Bridal Packages",
      slug: "bridal-packages",
      status: "ACTIVE",
      is_active: true
    });

    artistServiceItem = await db.Service.create({
      artist_id: approvedArtistProfile.id,
      specialization_name: "Deluxe Bridal Mehndi",
      category: "Bridal Packages",
      category_id: category.id,
      minimum_price: 4500,
      duration_minutes: 180,
      is_active: true
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().substring(0, 10);

    slot1 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfile.id,
      date: dateStr,
      start_time: `${dateStr}T10:00:00.000Z`,
      end_time: `${dateStr}T13:00:00.000Z`,
      is_booked: true
    });

    slot2 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfile.id,
      date: dateStr,
      start_time: `${dateStr}T14:00:00.000Z`,
      end_time: `${dateStr}T17:00:00.000Z`,
      is_booked: true
    });

    // 6. Confirmed Booking 1 (arrived at destination)
    booking1 = await db.Booking.create({
      booking_code: "MG-600101",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot1.id,
      total_price: 4500,
      advance_paid: 450,
      remaining_amount: 4050,
      final_amount: 4500,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "ARTIST_ARRIVED",
      check_in_otp: "543210",
      check_in_otp_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      check_in_otp_verified: false,
      arrival_verified_at: new Date(),
      address: "Civil Lines, Jaipur",
      latitude: 26.9124,
      longitude: 75.7873
    });

    // 7. Confirmed Booking 2 (still on the way)
    booking2 = await db.Booking.create({
      booking_code: "MG-600102",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot2.id,
      total_price: 4500,
      advance_paid: 450,
      remaining_amount: 4050,
      final_amount: 4500,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "ARTIST_ON_THE_WAY",
      check_in_otp: null,
      check_in_otp_verified: false,
      address: "Malviya Nagar, Jaipur",
      latitude: 26.8500,
      longitude: 75.8000
    });
  });

  it("1. Check-In Dependency: Service start is rejected if Check-In OTP is not verified (400)", async () => {
    // booking2 is still ARTIST_ON_THE_WAY without verified check-in
    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          booking2.id,
          approvedArtistUser.id,
          "ARTIST",
          "SERVICE_STARTED"
        );
      },
      (err) => err.statusCode === 400 && err.message.includes("Check-In OTP verification is required")
    );
  });

  it("2. Customer cannot start service directly (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          booking1.id,
          customerUser.id,
          "CUSTOMER",
          "SERVICE_STARTED"
        );
      },
      (err) => err.statusCode === 403 && err.message.includes("Customers cannot trigger artist-specific")
    );
  });

  it("3. Rival Artist B cannot start service for Artist A's booking (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          booking1.id,
          rivalArtistUser.id,
          "ARTIST",
          "SERVICE_STARTED"
        );
      },
      (err) => err.statusCode === 403 && err.message.includes("not the assigned artist")
    );
  });

  it("4. Unapproved Artist cannot start service (403 Forbidden)", async () => {
    // Temporarily reassign booking2 to unapproved artist profile
    await booking2.update({ artist_id: unapprovedArtistProfile.id });

    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          booking2.id,
          unapprovedArtistUser.id,
          "ARTIST",
          "SERVICE_STARTED"
        );
      },
      (err) => err.statusCode === 403 && err.message.includes("Only approved artists")
    );

    // Restore booking2
    await booking2.update({ artist_id: approvedArtistProfile.id });
  });

  it("5. Check-In OTP Verification: Valid OTP transitions booking to CUSTOMER_VERIFIED and sets service_started_at", async () => {
    const res = await BookingService.verifyCheckInOtp(booking1.id, "543210", approvedArtistUser.id);
    assert.equal(res.success, true);

    const refreshed = await db.Booking.findByPk(booking1.id);
    assert.equal(refreshed.booking_status, "CONFIRMED");
    assert.equal(refreshed.detailed_status, "CUSTOMER_VERIFIED");
    assert.equal(refreshed.check_in_otp_verified, true);
    assert.ok(refreshed.service_started_at);
    assert.ok(refreshed.check_in_time);

    initialStartTime = new Date(refreshed.service_started_at).getTime();
    assert.ok(initialStartTime > 0);
  });

  it("6. Start Timestamp Immutability: Subsequent startService calls do NOT overwrite initial service_started_at", async () => {
    // Wait a tiny buffer
    await new Promise((r) => setTimeout(r, 50));

    const reStart = await BookingService.updateBookingStatus(
      booking1.id,
      approvedArtistUser.id,
      "ARTIST",
      "SERVICE_STARTED"
    );

    const refreshed = await db.Booking.findByPk(booking1.id);
    const secondStartTime = new Date(refreshed.service_started_at).getTime();

    assert.equal(secondStartTime, initialStartTime, "service_started_at must remain strictly immutable");
    assert.equal(reStart.detailed_status, "CUSTOMER_VERIFIED");
  });

  it("7. Duplicate Start Idempotency: Repeated start requests return clean state without duplicate histories", async () => {
    const historyCountBefore = await db.BookingStatusHistory.count({
      where: { booking_id: booking1.id, status: "CUSTOMER_VERIFIED" }
    });

    await BookingService.updateBookingStatus(
      booking1.id,
      approvedArtistUser.id,
      "ARTIST",
      "SERVICE_IN_PROGRESS"
    );

    const historyCountAfter = await db.BookingStatusHistory.count({
      where: { booking_id: booking1.id, status: "CUSTOMER_VERIFIED" }
    });

    assert.equal(historyCountAfter, historyCountBefore, "Idempotent start must not append duplicate status histories");
  });

  it("8. Timer Calculation: Server-derived elapsed duration matches server_now - service_started_at", async () => {
    const details = await BookingService.getBookingDetails(booking1.id, approvedArtistUser.id, "ARTIST");
    assert.ok(details.service_started_at);

    const startMs = new Date(details.service_started_at).getTime();
    const nowMs = Date.now();
    const elapsedSecs = Math.floor((nowMs - startMs) / 1000);

    assert.ok(elapsedSecs >= 0 && elapsedSecs < 10, "Elapsed timer must compute accurately from backend start timestamp");
  });

  it("9. App Restart / Simulated Time Jump: Timer accurately reflects 35 minutes elapsed without reset to 0", async () => {
    // Simulate booking started 35 minutes ago
    const thirtyFiveMinsAgo = new Date(Date.now() - 35 * 60 * 1000);
    await booking1.update({
      service_started_at: thirtyFiveMinsAgo,
      check_in_time: thirtyFiveMinsAgo
    });

    const refreshed = await BookingService.getBookingDetails(booking1.id, approvedArtistUser.id, "ARTIST");
    const startMs = new Date(refreshed.service_started_at).getTime();
    const elapsedMinutes = Math.floor((Date.now() - startMs) / (60 * 1000));

    assert.ok(elapsedMinutes >= 34 && elapsedMinutes <= 36, "Elapsed duration must reflect ~35 minutes after restart");
  });

  it("10. Customer & Artist State Synchronization: Both users receive identical detailed_status and service_started_at", async () => {
    const artistView = await BookingService.getBookingDetails(booking1.id, approvedArtistUser.id, "ARTIST");
    const customerView = await BookingService.getBookingDetails(booking1.id, customerUser.id, "CUSTOMER");

    assert.equal(artistView.detailed_status, customerView.detailed_status);
    assert.equal(artistView.booking_status, customerView.booking_status);
    assert.equal(
      new Date(artistView.service_started_at).getTime(),
      new Date(customerView.service_started_at).getTime()
    );
  });

  it("11. Premature Completion Protection: Timer reaching duration does NOT auto-complete booking", async () => {
    // Simulate booking started 200 minutes ago (exceeding 180 min duration)
    const twoHundredMinsAgo = new Date(Date.now() - 200 * 60 * 1000);
    await booking1.update({
      service_started_at: twoHundredMinsAgo,
      check_in_time: twoHundredMinsAgo
    });

    const refreshed = await BookingService.getBookingDetails(booking1.id, approvedArtistUser.id, "ARTIST");
    assert.equal(refreshed.booking_status, "CONFIRMED");
    assert.equal(refreshed.detailed_status, "CUSTOMER_VERIFIED");
    assert.notEqual(refreshed.detailed_status, "COMPLETED", "Service must not automatically complete on timer expiration");
  });

  it("12. Duration Snapshot Immutability: Service duration is preserved from booking snapshot", async () => {
    const details = await BookingService.getBookingDetails(booking1.id, approvedArtistUser.id, "ARTIST");
    assert.equal(details.duration_minutes || details.service?.duration_minutes, 180);
  });

  it("13. Client fake timestamp in payload is ignored: Server timestamp remains canonical", async () => {
    const fakeFutureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Call updateBookingStatus with fake extraData
    await BookingService.updateBookingStatus(
      booking1.id,
      approvedArtistUser.id,
      "ARTIST",
      "SERVICE_STARTED",
      { service_started_at: fakeFutureTime, check_in_time: fakeFutureTime }
    );

    const refreshed = await db.Booking.findByPk(booking1.id);
    const startMs = new Date(refreshed.service_started_at).getTime();
    const fakeMs = new Date(fakeFutureTime).getTime();

    assert.notEqual(startMs, fakeMs, "Server must ignore client-submitted start timestamps");
  });

  it("14. Cancelled booking blocks service start (400 Bad Request)", async () => {
    const cancelledBooking = await db.Booking.create({
      booking_code: "MG-600999",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot1.id,
      total_price: 4500,
      advance_paid: 0,
      remaining_amount: 4500,
      booking_status: "CANCELLED",
      payment_status: "REFUNDED",
      detailed_status: "CANCELLED"
    });

    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          cancelledBooking.id,
          approvedArtistUser.id,
          "ARTIST",
          "SERVICE_STARTED"
        );
      },
      (err) => err.statusCode === 400 && err.message.includes("Cannot modify a cancelled booking")
    );
  });

  it("15. Completed booking cannot be restarted into SERVICE_STARTED (400 Bad Request)", async () => {
    const completedBooking = await db.Booking.create({
      booking_code: "MG-600888",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot1.id,
      total_price: 4500,
      advance_paid: 4500,
      remaining_amount: 0,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED"
    });

    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          completedBooking.id,
          approvedArtistUser.id,
          "ARTIST",
          "SERVICE_STARTED"
        );
      },
      (err) => err.statusCode === 400 && err.message.includes("Cannot modify an already completed booking")
    );
  });
});
