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
const ArtistService = require("../services/artist.services");

describe("ARTIST MODULE 4: BOOKINGS + BOOKING MANAGEMENT INTEGRATION SUITE", () => {
  let approvedArtistUser, approvedArtistProfile;
  let rivalArtistUser, rivalArtistProfile;
  let pendingArtistUser, pendingArtistProfile;
  let customerUser;
  let artistServiceItem;
  let slot1, slot2, slot3;
  let booking1, booking2;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Approved Artist A
    approvedArtistUser = await db.User.create({
      name: "Pooja Mehndi Artist",
      email: "pooja@artist.com",
      phone: "9876543210",
      phone_number: "9876543210",
      role: "ARTIST",
      is_verified: true
    });
    approvedArtistProfile = await db.ArtistProfile.create({
      user_id: approvedArtistUser.id,
      bio: "Master Bridal Mehndi Artist with 8 years experience",
      experience_years: 8,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur",
      location: "Vaishali Nagar, Jaipur",
      latitude: 26.9124,
      longitude: 75.7873
    });

    // 2. Rival Artist B
    rivalArtistUser = await db.User.create({
      name: "Rival Henna Designer",
      email: "rival@artist.com",
      phone: "9876543211",
      phone_number: "9876543211",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtistProfile = await db.ArtistProfile.create({
      user_id: rivalArtistUser.id,
      bio: "Rival artist",
      experience_years: 4,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur",
      latitude: 26.9200,
      longitude: 75.8000
    });

    // 3. Pending/Unapproved Artist C
    pendingArtistUser = await db.User.create({
      name: "Pending Artist",
      email: "pending@artist.com",
      phone: "9876543212",
      phone_number: "9876543212",
      role: "ARTIST",
      is_verified: false
    });
    pendingArtistProfile = await db.ArtistProfile.create({
      user_id: pendingArtistUser.id,
      bio: "Unapproved artist",
      experience_years: 1,
      verification_status: "PENDING",
      is_available: false,
      city: "Jaipur"
    });

    // 4. Customer User
    customerUser = await db.User.create({
      name: "Ananya Customer",
      email: "ananya@customer.com",
      phone: "9123456789",
      phone_number: "9123456789",
      role: "CUSTOMER",
      is_verified: true
    });

    // 5. Create Category & Service
    const category = await db.Category.create({
      name: "Bridal Mehndi",
      slug: "bridal-mehndi",
      status: "ACTIVE",
      is_active: true
    });

    artistServiceItem = await db.Service.create({
      artist_id: approvedArtistProfile.id,
      specialization_name: "Royal Marwari Bridal Mehndi",
      category: "Bridal Mehndi",
      category_id: category.id,
      minimum_price: 3500,
      duration_minutes: 180,
      description: "Full front and back arms bridal design",
      is_active: true
    });

    // 6. Create Availability Slots for Artist A
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().substring(0, 10);

    slot1 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfile.id,
      date: dateStr,
      start_time: `${dateStr}T10:00:00.000Z`,
      end_time: `${dateStr}T13:00:00.000Z`,
      is_booked: false
    });

    slot2 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfile.id,
      date: dateStr,
      start_time: `${dateStr}T14:00:00.000Z`,
      end_time: `${dateStr}T17:00:00.000Z`,
      is_booked: false
    });

    slot3 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfile.id,
      date: dateStr,
      start_time: `${dateStr}T18:00:00.000Z`,
      end_time: `${dateStr}T21:00:00.000Z`,
      is_booked: false
    });
  });

  it("1. Customer creates a confirmed booking for Artist A with verified advance payment", async () => {
    booking1 = await db.Booking.create({
      booking_code: "MG-400101",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot1.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "CONFIRMED",
      address: "Flat 402, Royal Palms, C-Scheme, Jaipur",
      landmark: "Near Central Park",
      latitude: 26.9110,
      longitude: 75.8010,
      notes: "Please arrive 15 minutes before the mehndi ceremony."
    });

    // Create initial status history
    await db.BookingStatusHistory.create({
      booking_id: booking1.id,
      status: "CONFIRMED",
      changed_by: customerUser.id,
      notes: "Booking confirmed after advance payment verification"
    });

    // Mark slot as booked
    await slot1.update({ is_booked: true });

    assert.ok(booking1.id);
    assert.equal(booking1.booking_code, "MG-400101");
    assert.equal(booking1.total_price, 3500);
    assert.equal(booking1.advance_paid, 350);
    assert.equal(booking1.remaining_amount, 3150);
  });

  it("2. Artist A fetches bookings and sees their genuine booking details", async () => {
    const list = await ArtistService.getArtistBookings(approvedArtistUser.id);
    assert.ok(Array.isArray(list));
    assert.equal(list.length, 1);

    const b = list[0];
    assert.equal(b.id, booking1.id);
    assert.equal(b.booking_code, "MG-400101");
    assert.equal(b.user.name, "Ananya Customer");
    assert.equal(b.user.phone, "9123456789");
    assert.equal(b.service.specialization_name, "Royal Marwari Bridal Mehndi");
    assert.equal(b.total_price, 3500);
    assert.equal(b.advance_paid, 350);
    assert.equal(b.remaining_amount, 3150);
  });

  it("3. Rival Artist B fetches bookings and receives clean empty array [] (Ownership Isolation)", async () => {
    const rivalList = await ArtistService.getArtistBookings(rivalArtistUser.id);
    assert.deepEqual(rivalList, [], "Rival artist must not receive bookings assigned to Artist A");
  });

  it("4. Rival Artist B cannot view Artist A's booking details via getBookingDetails (404/403)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.getBookingDetails(booking1.id, rivalArtistUser.id, "ARTIST");
      },
      (err) => err.statusCode === 404 || err.statusCode === 403
    );
  });

  it("5. Customer data privacy: Auth tokens, emails, and passwords are not leaked to artist", async () => {
    const details = await BookingService.getBookingDetails(booking1.id, approvedArtistUser.id, "ARTIST");
    assert.ok(details.user.name);
    assert.ok(details.user.phone);
    assert.equal(details.user.password, undefined, "User password must never be exposed");
    assert.equal(details.user.refresh_token, undefined, "User refresh token must never be exposed");
  });

  it("6. Pending/Unapproved Artist cannot accept or update bookings (403 Forbidden)", async () => {
    // Create a dummy booking pointing to pending artist
    const pendingBooking = await db.Booking.create({
      booking_code: "MG-400999",
      user_id: customerUser.id,
      artist_id: pendingArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot2.id,
      total_price: 2000,
      advance_paid: 200,
      remaining_amount: 1800,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "CONFIRMED"
    });

    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(pendingBooking.id, pendingArtistUser.id, "ARTIST", "ARTIST_ACCEPTED");
      },
      (err) => err.statusCode === 403 && err.message.includes("Only approved artists")
    );
  });

  it("7. Author Artist A accepts booking atomically (transitions to ARTIST_ACCEPTED)", async () => {
    const updated = await BookingService.updateBookingStatus(
      booking1.id,
      approvedArtistUser.id,
      "ARTIST",
      "ARTIST_ACCEPTED"
    );

    assert.equal(updated.booking_status, "CONFIRMED");
    assert.equal(updated.detailed_status, "ARTIST_ACCEPTED");

    // Verify slot remains booked
    const slotCheck = await db.AvailabilitySlot.findByPk(slot1.id);
    assert.equal(slotCheck.is_booked, true);

    // Verify history entry was recorded
    const history = await db.BookingStatusHistory.findAll({ where: { booking_id: booking1.id } });
    assert.ok(history.some(h => h.status === "ARTIST_ACCEPTED"));
  });

  it("8. Duplicate Accept Idempotency: Rapid retry returns clean state without duplicate history entries", async () => {
    const historyBefore = await db.BookingStatusHistory.count({ where: { booking_id: booking1.id } });
    
    const reAccept = await BookingService.updateBookingStatus(
      booking1.id,
      approvedArtistUser.id,
      "ARTIST",
      "ARTIST_ACCEPTED"
    );

    assert.equal(reAccept.detailed_status, "ARTIST_ACCEPTED");
    const historyAfter = await db.BookingStatusHistory.count({ where: { booking_id: booking1.id } });
    assert.equal(historyBefore, historyAfter, "Idempotent accept must not add duplicate history rows");
  });

  it("9. Rival Artist B cannot accept Artist A's booking (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          booking1.id,
          rivalArtistUser.id,
          "ARTIST",
          "ARTIST_ACCEPTED"
        );
      },
      (err) => err.statusCode === 403 && err.message.includes("not the assigned artist")
    );
  });

  it("10. Rival Artist B cannot reject Artist A's booking (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          booking1.id,
          rivalArtistUser.id,
          "ARTIST",
          "REJECTED",
          { cancelReason: "Hacked rejection" }
        );
      },
      (err) => err.statusCode === 403 && err.message.includes("not the assigned artist")
    );
  });

  it("11. Author Artist A rejects a new booking with custom rejection reason", async () => {
    booking2 = await db.Booking.create({
      booking_code: "MG-400102",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot2.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "CONFIRMED",
      address: "Civil Lines, Jaipur"
    });
    await slot2.update({ is_booked: true });

    const rejected = await BookingService.updateBookingStatus(
      booking2.id,
      approvedArtistUser.id,
      "ARTIST",
      "REJECTED",
      { cancelReason: "Family function on selected date" }
    );

    assert.equal(rejected.booking_status, "CANCELLED");
    assert.equal(rejected.detailed_status, "REJECTED");
    assert.equal(rejected.cancel_reason, "Family function on selected date");
    assert.equal(rejected.payment_status, "REFUNDED");
    assert.equal(rejected.refund_amount, 350);

    // Slot must be released back to available
    const slotCheck = await db.AvailabilitySlot.findByPk(slot2.id);
    assert.equal(slotCheck.is_booked, false);

    // Refund record must exist
    const refundRecord = await db.Refund.findOne({ where: { booking_id: booking2.id } });
    assert.ok(refundRecord);
    assert.equal(refundRecord.amount, 350);

    // Customer notification must contain the real reason
    const notif = await db.Notification.findOne({
      where: { user_id: customerUser.id, type: "BOOKING" },
      order: [["createdAt", "DESC"]]
    });
    assert.ok(notif);
    assert.ok(notif.message.includes("Family function on selected date"));
  });

  it("12. Cannot modify already cancelled or rejected booking (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          booking2.id,
          approvedArtistUser.id,
          "ARTIST",
          "ARTIST_ACCEPTED"
        );
      },
      (err) => err.statusCode === 400 && err.message.includes("Cannot modify a cancelled booking")
    );
  });

  it("13. Financial & Destination Snapshot Immutability", async () => {
    // Artist updates service base price from 3500 to 5000
    await artistServiceItem.update({ minimum_price: 5000 });

    // Existing booking details must preserve original 3500 price
    const bookingDetails = await BookingService.getBookingDetails(booking1.id, approvedArtistUser.id, "ARTIST");
    assert.equal(bookingDetails.total_price, 3500);
    assert.equal(bookingDetails.advance_paid, 350);
    assert.equal(bookingDetails.remaining_amount, 3150);
    assert.equal(bookingDetails.address, "Flat 402, Royal Palms, C-Scheme, Jaipur");
  });

  it("14. Unpaid draft bookings (pending payment) are excluded from artist actionable bookings", async () => {
    const unpaidDraft = await db.Booking.create({
      booking_code: "MG-400998",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot3.id,
      total_price: 3500,
      advance_paid: 0,
      remaining_amount: 3500,
      booking_status: "PENDING_PAYMENT",
      payment_status: "PENDING",
      detailed_status: "PENDING_PAYMENT"
    });

    const artistList = await ArtistService.getArtistBookings(approvedArtistUser.id);
    const ids = artistList.map(b => b.id);
    assert.ok(!ids.includes(unpaidDraft.id), "Unpaid draft bookings must NOT appear in artist booking list");
  });

  it("15. Customer cancellation updates artist view immediately", async () => {
    const booking3 = await db.Booking.create({
      booking_code: "MG-400103",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot3.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "CONFIRMED"
    });
    await slot3.update({ is_booked: true });

    // Customer cancels with reason
    await BookingService.cancelBookingWithPolicy(
      booking3.id,
      customerUser.id,
      "CUSTOMER",
      "Event cancelled by bride"
    );

    const artistDetails = await BookingService.getBookingDetails(booking3.id, approvedArtistUser.id, "ARTIST");
    assert.equal(artistDetails.booking_status, "CANCELLED");
    assert.equal(artistDetails.detailed_status, "CANCELLED");
    assert.equal(artistDetails.cancel_reason, "Event cancelled by bride");
  });

  it("16. Double booking prevention: Attempting to book an already booked slot is rejected with 409 Conflict", async () => {
    const secondCustomer = await db.User.create({
      name: "Second Customer",
      email: "second_cust@customer.com",
      phone: "9111222334",
      phone_number: "9111222334",
      role: "CUSTOMER",
      is_verified: true
    });

    await assert.rejects(
      async () => {
        await BookingService.createBooking(secondCustomer.id, {
          artistId: approvedArtistProfile.id,
          serviceId: artistServiceItem.id,
          slotId: slot1.id,
          address: "Mansarovar, Jaipur"
        });
      },
      (err) => err.statusCode === 409 && (err.message.includes("this slot was just booked") || err.message.includes("already booked"))
    );
  });

  it("17. Fresh artist with zero bookings returns clean [] without fake cards or static data", async () => {
    const freshArtistUser = await db.User.create({
      name: "Fresh Artist",
      email: "fresh@artist.com",
      phone: "9000111222",
      phone_number: "9000111222",
      role: "ARTIST",
      is_verified: true
    });
    await db.ArtistProfile.create({
      user_id: freshArtistUser.id,
      bio: "Brand new verified artist",
      experience_years: 0,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    const freshList = await ArtistService.getArtistBookings(freshArtistUser.id);
    assert.deepEqual(freshList, [], "Fresh artist must receive clean []");
  });
});
