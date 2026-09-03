"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";
process.env.ARRIVAL_RADIUS_METERS = "200";

const db = require("../models");
const BookingService = require("../services/booking.services");
const TrackingController = require("../controllers/tracking/tracking.controller");

describe("ARTIST MODULE 5: ON THE WAY + LIVE TRACKING + ARRIVED + CHECK-IN INTEGRATION SUITE", () => {
  let approvedArtistUser, approvedArtistProfile;
  let rivalArtistUser, rivalArtistProfile;
  let customerUser, rivalCustomerUser;
  let artistServiceItem;
  let slot1;
  let booking1;

  // Destination coordinates for customer: Jaipur Central (26.9124, 75.7873)
  const CUST_LAT = 26.9124;
  const CUST_LNG = 75.7873;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Approved Artist A
    approvedArtistUser = await db.User.create({
      name: "Pooja Mehndi Artist",
      email: "pooja@tracking.com",
      phone: "9876543210",
      phone_number: "9876543210",
      role: "ARTIST",
      is_verified: true
    });
    approvedArtistProfile = await db.ArtistProfile.create({
      user_id: approvedArtistUser.id,
      bio: "Master Bridal Mehndi Artist",
      experience_years: 8,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur",
      location: "Vaishali Nagar, Jaipur",
      latitude: 26.9000,
      longitude: 75.7500
    });

    // 2. Rival Artist B
    rivalArtistUser = await db.User.create({
      name: "Rival Henna Artist",
      email: "rival@tracking.com",
      phone: "9876543211",
      phone_number: "9876543211",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtistProfile = await db.ArtistProfile.create({
      user_id: rivalArtistUser.id,
      bio: "Rival artist profile",
      experience_years: 3,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 3. Customer Users
    customerUser = await db.User.create({
      name: "Sneha Client",
      email: "sneha@customer.com",
      phone: "9123456789",
      phone_number: "9123456789",
      role: "CUSTOMER",
      is_verified: true
    });

    rivalCustomerUser = await db.User.create({
      name: "Rival Client",
      email: "rival_cust@customer.com",
      phone: "9123456780",
      phone_number: "9123456780",
      role: "CUSTOMER",
      is_verified: true
    });

    // 4. Create Service & Slot
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

    // 5. Create Confirmed Booking with destination coordinates
    booking1 = await db.Booking.create({
      booking_code: "MG-500101",
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
      detailed_status: "ARTIST_ACCEPTED",
      address: "House 102, C-Scheme, Jaipur",
      landmark: "Near Statue Circle",
      latitude: CUST_LAT,
      longitude: CUST_LNG
    });
  });

  it("1. Pre-condition check: Check-In OTP verification fails before reaching ARTIST_ARRIVED status (400)", async () => {
    // Current status is ARTIST_ACCEPTED
    await assert.rejects(
      async () => {
        await BookingService.verifyCheckInOtp(booking1.id, "123456", approvedArtistUser.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("after the artist has arrived")
    );
  });

  it("2. Artist A transitions booking to ARTIST_ON_THE_WAY", async () => {
    const updated = await BookingService.updateBookingStatus(
      booking1.id,
      approvedArtistUser.id,
      "ARTIST",
      "ARTIST_ON_THE_WAY"
    );

    assert.equal(updated.booking_status, "CONFIRMED");
    assert.equal(updated.detailed_status, "ARTIST_ON_THE_WAY");
  });

  it("3. Idempotent ON_THE_WAY: Repeated calls return clean state without errors", async () => {
    const reUpdated = await BookingService.updateBookingStatus(
      booking1.id,
      approvedArtistUser.id,
      "ARTIST",
      "ARTIST_ON_THE_WAY"
    );
    assert.equal(reUpdated.detailed_status, "ARTIST_ON_THE_WAY");
  });

  it("4. Rival Artist B cannot transition Artist A's booking to ON_THE_WAY (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          booking1.id,
          rivalArtistUser.id,
          "ARTIST",
          "ARTIST_ON_THE_WAY"
        );
      },
      (err) => err.statusCode === 403 && err.message.includes("not the assigned artist")
    );
  });

  it("5. Check-In OTP verification still fails while ARTIST_ON_THE_WAY (400)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.verifyCheckInOtp(booking1.id, "123456", approvedArtistUser.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("after the artist has arrived")
    );
  });

  it("6. Approved Artist A updates live GPS location (far away from customer)", async () => {
    // 5 km away from destination
    const FAR_LAT = 26.8700;
    const FAR_LNG = 75.7500;

    let resJson = null;
    let resCode = null;
    const mockReq = {
      user: { id: approvedArtistUser.id, role: "ARTIST" },
      body: {
        bookingId: booking1.id,
        latitude: FAR_LAT,
        longitude: FAR_LNG,
        heading: 90,
        speed: 25
      }
    };
    const mockRes = {
      status: (code) => {
        resCode = code;
        return {
          json: (data) => { resJson = data; return data; }
        };
      }
    };

    await TrackingController.updateLocation(mockReq, mockRes);
    assert.equal(resCode, 200);
    assert.equal(resJson.success, true);
    assert.equal(resJson.data.latitude, FAR_LAT);
    assert.equal(resJson.data.longitude, FAR_LNG);
  });

  it("7. Rival Artist B cannot update location for Artist A's booking (403 Forbidden)", async () => {
    let resJson = null;
    let resCode = null;
    const mockReq = {
      user: { id: rivalArtistUser.id, role: "ARTIST" },
      body: {
        bookingId: booking1.id,
        latitude: 26.9000,
        longitude: 75.7600
      }
    };
    const mockRes = {
      status: (code) => {
        resCode = code;
        return {
          json: (data) => { resJson = data; return data; }
        };
      }
    };

    await TrackingController.updateLocation(mockReq, mockRes);
    assert.equal(resCode, 403);
    assert.equal(resJson.success, false);
  });

  it("8. Customer who owns booking can view live tracking location", async () => {
    let resJson = null;
    let resCode = null;
    const mockReq = {
      user: { id: customerUser.id, role: "CUSTOMER" },
      params: { bookingId: booking1.id }
    };
    const mockRes = {
      status: (code) => {
        resCode = code;
        return {
          json: (data) => { resJson = data; return data; }
        };
      }
    };

    await TrackingController.getArtistLocation(mockReq, mockRes);
    // If Redis is active in test it returns 200, or 404 if memory-only Redis is unset
    assert.ok(resCode === 200 || resCode === 404);
  });

  it("9. Rival Customer B cannot view live tracking location for Customer A's booking (403 Forbidden)", async () => {
    let resJson = null;
    let resCode = null;
    const mockReq = {
      user: { id: rivalCustomerUser.id, role: "CUSTOMER" },
      params: { bookingId: booking1.id }
    };
    const mockRes = {
      status: (code) => {
        resCode = code;
        return {
          json: (data) => { resJson = data; return data; }
        };
      }
    };

    await TrackingController.getArtistLocation(mockReq, mockRes);
    assert.equal(resCode, 403);
    assert.equal(resJson.success, false);
  });

  it("10. Geofence Enforcement: Artist A attempts ARRIVED while 5 km away (Rejects with distance error)", async () => {
    const FAR_LAT = 26.8700;
    const FAR_LNG = 75.7500;

    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          booking1.id,
          approvedArtistUser.id,
          "ARTIST",
          "ARTIST_ARRIVED",
          { latitude: FAR_LAT, longitude: FAR_LNG }
        );
      },
      (err) => err.statusCode === 400 && (err.message.includes("away from the customer location") || err.message.includes("not close enough"))
    );

    // Verify booking is still ARTIST_ON_THE_WAY
    const check = await db.Booking.findByPk(booking1.id);
    assert.equal(check.detailed_status, "ARTIST_ON_THE_WAY");
  });

  it("11. Arrival Geofence Success: Artist A reaches within 50 meters of destination (transitions to ARTIST_ARRIVED)", async () => {
    // 50 meters away from customer destination
    const NEAR_LAT = 26.9124 + 0.0003;
    const NEAR_LNG = 75.7873 + 0.0003;

    const arrived = await BookingService.updateBookingStatus(
      booking1.id,
      approvedArtistUser.id,
      "ARTIST",
      "ARTIST_ARRIVED",
      { latitude: NEAR_LAT, longitude: NEAR_LNG }
    );

    assert.equal(arrived.booking_status, "CONFIRMED");
    assert.equal(arrived.detailed_status, "ARTIST_ARRIVED");
    assert.ok(arrived.arrival_verified_at);

    // 6-digit Check-In OTP must be auto-generated
    assert.ok(arrived.check_in_otp);
    assert.equal(arrived.check_in_otp.length, 6);
    assert.equal(arrived.check_in_otp_verified, false);
  });

  it("12. Idempotent Arrival: Repeated ARRIVED request returns clean state without duplicate effects", async () => {
    const reArrived = await BookingService.updateBookingStatus(
      booking1.id,
      approvedArtistUser.id,
      "ARTIST",
      "ARTIST_ARRIVED",
      { latitude: CUST_LAT, longitude: CUST_LNG }
    );
    assert.equal(reArrived.detailed_status, "ARTIST_ARRIVED");
  });

  it("13. Check-In OTP Verification: Invalid OTP code is rejected (400)", async () => {
    await assert.rejects(
      async () => {
        await BookingService.verifyCheckInOtp(booking1.id, "000000", approvedArtistUser.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("Invalid or expired Check-In OTP")
    );
  });

  it("14. Check-In OTP Verification: Rival Artist B cannot verify OTP for Artist A's booking (403 Forbidden)", async () => {
    const refreshed = await db.Booking.findByPk(booking1.id);
    await assert.rejects(
      async () => {
        await BookingService.verifyCheckInOtp(booking1.id, refreshed.check_in_otp, rivalArtistUser.id);
      },
      (err) => err.statusCode === 403 && err.message.includes("Only the assigned artist")
    );
  });

  it("15. Check-In OTP Success: Valid OTP transitions booking to CUSTOMER_VERIFIED / SERVICE_IN_PROGRESS", async () => {
    const refreshed = await db.Booking.findByPk(booking1.id);
    const validOtp = refreshed.check_in_otp;

    const res = await BookingService.verifyCheckInOtp(booking1.id, validOtp, approvedArtistUser.id);
    assert.equal(res.success, true);

    const bookingAfter = await db.Booking.findByPk(booking1.id);
    assert.equal(bookingAfter.booking_status, "CONFIRMED");
    assert.equal(bookingAfter.detailed_status, "CUSTOMER_VERIFIED");
    assert.equal(bookingAfter.check_in_otp_verified, true);
    assert.ok(bookingAfter.service_started_at);
    assert.equal(bookingAfter.check_in_otp, null, "OTP must be consumed/cleared after verification");
  });

  it("16. OTP Single-Use: Reusing already verified OTP is rejected or idempotently acknowledged", async () => {
    const res = await BookingService.verifyCheckInOtp(booking1.id, "123456", approvedArtistUser.id);
    assert.equal(res.success, true, "Already verified booking returns idempotent true");
  });

  it("17. Cancelled booking blocks tracking updates and arrival transitions", async () => {
    const cancelledBooking = await db.Booking.create({
      booking_code: "MG-500999",
      user_id: customerUser.id,
      artist_id: approvedArtistProfile.id,
      service_id: artistServiceItem.id,
      slot_id: slot1.id,
      total_price: 3500,
      advance_paid: 0,
      remaining_amount: 3500,
      booking_status: "CANCELLED",
      payment_status: "REFUNDED",
      detailed_status: "CANCELLED",
      latitude: CUST_LAT,
      longitude: CUST_LNG
    });

    // Tracking update rejected on cancelled booking
    let resJson = null;
    let resCode = null;
    const mockReq = {
      user: { id: approvedArtistUser.id, role: "ARTIST" },
      body: {
        bookingId: cancelledBooking.id,
        latitude: CUST_LAT,
        longitude: CUST_LNG
      }
    };
    const mockRes = {
      status: (code) => {
        resCode = code;
        return {
          json: (data) => { resJson = data; return data; }
        };
      }
    };

    await TrackingController.updateLocation(mockReq, mockRes);
    assert.equal(resCode, 400);
    assert.ok(resJson.message.includes("already cancelled"));

    // Arrival rejected on cancelled booking
    await assert.rejects(
      async () => {
        await BookingService.updateBookingStatus(
          cancelledBooking.id,
          approvedArtistUser.id,
          "ARTIST",
          "ARTIST_ARRIVED",
          { latitude: CUST_LAT, longitude: CUST_LNG }
        );
      },
      (err) => err.statusCode === 400 && err.message.includes("Cannot modify a cancelled booking")
    );
  });

  it("18. Permanent State Lock: Re-generating Check-In OTP after verification is strictly rejected (400) and checkin_otp remains null", async () => {
    // 1. sendCheckInOtp rejected once verified
    await assert.rejects(
      async () => {
        await BookingService.sendCheckInOtp(booking1.id, customerUser.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("already been verified")
    );

    // 2. getBookingDetails returns null checkin_otp and checkin_otp_verified true
    const details = await BookingService.getBookingDetails(booking1.id);
    assert.equal(details.checkin_otp, null, "Check-in OTP must be null on verified booking");
    assert.equal(details.check_in_otp, null, "check_in_otp must be null on verified booking");
    assert.equal(details.checkin_otp_verified, 1);
    assert.equal(details.check_in_otp_verified, true);
    assert.ok(details.service_started_at);
  });
});
