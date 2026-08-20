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
const AdminService = require("../services/admin.services");

describe("ARTIST MODULE 13: DISPUTES + CANCELLATIONS + REFUNDS + INCIDENT RESOLUTION INTEGRATION SUITE", () => {
  let adminUser;
  let artistUserA, artistProfileA;
  let rivalArtistUserB, rivalArtistProfileB;
  let customerUserA, customerUserB;
  let service, slot1, slot2, slot3, slot4;
  let bookingMoreThan24h, bookingLessThan12h, bookingForArtistCancel, bookingCompleted;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Admin
    adminUser = await db.User.create({
      name: "Admin Officer",
      email: "admin@incident.com",
      phone: "9999999991",
      phone_number: "9999999991",
      role: "ADMIN",
      is_verified: true
    });

    // 2. Artist A
    artistUserA = await db.User.create({
      name: "Geeta Mehndi Artist",
      email: "geeta@incident.com",
      phone: "9876543290",
      phone_number: "9876543290",
      role: "ARTIST",
      is_verified: true
    });
    artistProfileA = await db.ArtistProfile.create({
      user_id: artistUserA.id,
      bio: "Bridal Specialist",
      experience_years: 6,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 3. Rival Artist B
    rivalArtistUserB = await db.User.create({
      name: "Rival Artist B",
      email: "rivalb@incident.com",
      phone: "9876543291",
      phone_number: "9876543291",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtistProfileB = await db.ArtistProfile.create({
      user_id: rivalArtistUserB.id,
      bio: "Rival Specialist",
      experience_years: 3,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 4. Customers A & B
    customerUserA = await db.User.create({
      name: "Swati Customer",
      email: "swati@incident.com",
      phone: "9123456751",
      phone_number: "9123456751",
      role: "CUSTOMER",
      is_verified: true
    });

    customerUserB = await db.User.create({
      name: "Rival Customer B",
      email: "rival_custb@incident.com",
      phone: "9123456752",
      phone_number: "9123456752",
      role: "CUSTOMER",
      is_verified: true
    });

    // 5. Service & Availability Slots
    const category = await db.Category.create({
      name: "Bridal Special",
      slug: "bridal-special",
      status: "ACTIVE",
      is_active: true
    });

    service = await db.Service.create({
      artist_id: artistProfileA.id,
      specialization_name: "Designer Bridal Henna",
      category: "Bridal Special",
      category_id: category.id,
      minimum_price: 3500,
      duration_minutes: 120,
      is_active: true
    });

    const now = Date.now();
    const futureDate48h = new Date(now + 48 * 3600 * 1000).toISOString();
    const futureDate6h = new Date(now + 6 * 3600 * 1000).toISOString();
    const futureDate72h = new Date(now + 72 * 3600 * 1000).toISOString();
    const pastDate = new Date(now - 24 * 3600 * 1000).toISOString();

    slot1 = await db.AvailabilitySlot.create({
      artist_id: artistProfileA.id,
      date: futureDate48h.substring(0, 10),
      start_time: futureDate48h,
      end_time: new Date(now + 50 * 3600 * 1000).toISOString(),
      is_booked: true
    });

    slot2 = await db.AvailabilitySlot.create({
      artist_id: artistProfileA.id,
      date: futureDate6h.substring(0, 10),
      start_time: futureDate6h,
      end_time: new Date(now + 8 * 3600 * 1000).toISOString(),
      is_booked: true
    });

    slot3 = await db.AvailabilitySlot.create({
      artist_id: artistProfileA.id,
      date: futureDate72h.substring(0, 10),
      start_time: futureDate72h,
      end_time: new Date(now + 74 * 3600 * 1000).toISOString(),
      is_booked: true
    });

    slot4 = await db.AvailabilitySlot.create({
      artist_id: artistProfileA.id,
      date: pastDate.substring(0, 10),
      start_time: pastDate,
      end_time: new Date(now - 22 * 3600 * 1000).toISOString(),
      is_booked: true
    });

    // 6. Bookings
    bookingMoreThan24h = await db.Booking.create({
      booking_code: "MG-130101",
      user_id: customerUserA.id,
      artist_id: artistProfileA.id,
      service_id: service.id,
      slot_id: slot1.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "CONFIRMED",
      payment_status: "PAID",
      detailed_status: "CONFIRMED",
      address: "Tonk Road, Jaipur"
    });

    bookingLessThan12h = await db.Booking.create({
      booking_code: "MG-130102",
      user_id: customerUserA.id,
      artist_id: artistProfileA.id,
      service_id: service.id,
      slot_id: slot2.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "CONFIRMED",
      payment_status: "PAID",
      detailed_status: "CONFIRMED",
      address: "Raja Park, Jaipur"
    });

    bookingForArtistCancel = await db.Booking.create({
      booking_code: "MG-130103",
      user_id: customerUserA.id,
      artist_id: artistProfileA.id,
      service_id: service.id,
      slot_id: slot3.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "CONFIRMED",
      payment_status: "PAID",
      detailed_status: "CONFIRMED",
      address: "Malviya Nagar, Jaipur"
    });

    bookingCompleted = await db.Booking.create({
      booking_code: "MG-130104",
      user_id: customerUserA.id,
      artist_id: artistProfileA.id,
      service_id: service.id,
      slot_id: slot4.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED",
      check_in_otp_verified: true,
      check_out_otp_verified: true,
      address: "Mansarovar, Jaipur"
    });
  });

  it("1. Customer Cancellation (>24h notice): 100% advance refund, slot released, status CANCELLED", async () => {
    const cancelled = await BookingService.cancelBookingWithPolicy(
      bookingMoreThan24h.id,
      customerUserA.id,
      "CUSTOMER",
      "Event date changed"
    );

    assert.ok(cancelled);
    assert.equal(cancelled.booking_status, "CANCELLED");
    assert.equal(cancelled.refund_amount, 350, "Full advance of ₹350 refunded");
    assert.equal(cancelled.cancellation_fee, 0);

    // Verify slot released
    const slot = await db.AvailabilitySlot.findByPk(slot1.id);
    assert.equal(slot.is_booked, false, "Availability slot released");

    // Verify Refund record
    const refund = await db.Refund.findOne({ where: { booking_id: bookingMoreThan24h.id } });
    assert.ok(refund);
    assert.equal(refund.amount, 350);
  });

  it("2. Cancellation Idempotency: Retrying cancellation on already cancelled booking returns clean state", async () => {
    const retried = await BookingService.cancelBookingWithPolicy(
      bookingMoreThan24h.id,
      customerUserA.id,
      "CUSTOMER",
      "Repeated cancel attempt"
    );

    assert.ok(retried);
    assert.equal(retried.booking_status, "CANCELLED");

    const refundCount = await db.Refund.count({ where: { booking_id: bookingMoreThan24h.id } });
    assert.equal(refundCount, 1, "Duplicate refund must NOT be created");
  });

  it("3. Customer Cancellation (<12h notice): 0% refund, 100% cancellation fee recorded", async () => {
    const cancelled = await BookingService.cancelBookingWithPolicy(
      bookingLessThan12h.id,
      customerUserA.id,
      "CUSTOMER",
      "Sudden cancellation"
    );

    assert.ok(cancelled);
    assert.equal(cancelled.booking_status, "CANCELLED");
    assert.equal(cancelled.refund_amount, 0, "0 refund for < 12h notice");
    assert.equal(cancelled.cancellation_fee, 350, "100% cancellation fee ₹350 retained");

    const slot = await db.AvailabilitySlot.findByPk(slot2.id);
    assert.equal(slot.is_booked, false);
  });

  it("4. Terminal State Protection: Cannot cancel an already COMPLETED booking (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.cancelBookingWithPolicy(
          bookingCompleted.id,
          customerUserA.id,
          "CUSTOMER",
          "Try to cancel completed"
        );
      },
      (err) => err.statusCode === 400 && err.message.includes("Cannot cancel an already completed booking")
    );
  });

  it("5. Authorization Guard: Rival Customer B cannot cancel Customer A's booking (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.cancelBookingWithPolicy(
          bookingForArtistCancel.id,
          customerUserB.id,
          "CUSTOMER",
          "Unauthorized cancel"
        );
      },
      (err) => err.statusCode === 403 || err.message.includes("Forbidden")
    );
  });

  it("6. Artist Cancellation: Assigned Artist cancels -> 100% refund to customer & slot released", async () => {
    const cancelled = await BookingService.cancelBookingWithPolicy(
      bookingForArtistCancel.id,
      artistUserA.id,
      "ARTIST",
      "Emergency personal leave"
    );

    assert.ok(cancelled);
    assert.equal(cancelled.booking_status, "CANCELLED");
    assert.equal(cancelled.refund_amount, 350, "Customer gets 100% refund when artist cancels");

    const slot = await db.AvailabilitySlot.findByPk(slot3.id);
    assert.equal(slot.is_booked, false);

    const refund = await db.Refund.findOne({ where: { booking_id: bookingForArtistCancel.id } });
    assert.ok(refund);
    assert.equal(refund.amount, 350);
  });

  it("7. Authorization Guard: Rival Artist B cannot cancel Artist A's assigned booking (403 Forbidden)", async () => {
    // Create new active booking for test
    const newBooking = await db.Booking.create({
      booking_code: "MG-130105",
      user_id: customerUserA.id,
      artist_id: artistProfileA.id,
      service_id: service.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "CONFIRMED",
      payment_status: "PAID",
      detailed_status: "CONFIRMED"
    });

    await assert.rejects(
      async () => {
        await BookingService.cancelBookingWithPolicy(
          newBooking.id,
          rivalArtistUserB.id,
          "ARTIST",
          "Rival attempt cancel"
        );
      },
      (err) => err.statusCode === 403 || err.message.includes("Forbidden")
    );
  });

  it("8. Support Ticket / Dispute Creation: User creates dispute ticket linked to booking", async () => {
    const ticket = await db.SupportTicket.create({
      user_id: customerUserA.id,
      booking_id: bookingCompleted.id,
      subject: "Quality Dispute for Booking #MG-130104",
      description: "Artist arrived 30 minutes late and finished hastily.",
      status: "OPEN",
      category: "Booking Dispute",
      priority: "HIGH"
    });

    assert.ok(ticket);
    assert.equal(ticket.user_id, customerUserA.id);
    assert.equal(ticket.booking_id, bookingCompleted.id);
    assert.equal(ticket.status, "OPEN");
  });

  it("9. Admin Support Investigation & Reply: Admin reviews ticket, updates status, and replies", async () => {
    const tickets = await AdminService.getSupportTickets({ category: "Booking Dispute" });
    assert.ok(tickets.length >= 1);
    const disputeTicket = tickets[0];

    const replied = await AdminService.replySupportTicket(
      disputeTicket.id,
      "We have reviewed your complaint and issued a formal notice to the artist. Thank you for your feedback.",
      "CLOSED",
      adminUser.id
    );

    assert.ok(replied);
    assert.equal(replied.status, "CLOSED");
    assert.ok(replied.replies.includes("formal notice"));
  });

  it("10. Zero Dummy Incident Data: All cancellations, refunds, and tickets derive from real DB rows", async () => {
    const allRefunds = await db.Refund.findAll();
    assert.ok(allRefunds.length >= 2);
    allRefunds.forEach((r) => {
      assert.ok(r.booking_id);
      assert.ok(r.amount > 0);
    });
  });
});
