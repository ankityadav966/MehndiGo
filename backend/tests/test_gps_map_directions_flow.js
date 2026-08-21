"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const TrackingController = require("../controllers/tracking/tracking.controller");

describe("GPS MAP & DIRECTIONS SUITE: CUSTOMER & ARTIST REAL-TIME NAVIGATION", () => {
  let artistUser, artistProfile;
  let customerUser;
  let serviceItem;
  let booking;

  // Real Jaipur sample coordinates
  const ARTIST_LAT = 26.9000;
  const ARTIST_LNG = 75.7500;
  const CUST_LAT = 26.9124;
  const CUST_LNG = 75.7873;
  const CUST_ADDRESS = "Flat 402, Royal Palms, C-Scheme, Jaipur";

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Create Artist User & Profile with registered location
    artistUser = await db.User.create({
      name: "Ritu Verma (Mehndi Specialist)",
      email: "ritu@test.com",
      phone: "9876543210",
      phone_number: "9876543210",
      role: "ARTIST",
      is_verified: true,
      profile_image: "https://images.unsplash.com/photo-artist.jpg"
    });

    artistProfile = await db.ArtistProfile.create({
      user_id: artistUser.id,
      bio: "Expert Rajasthani & Bridal Henna Artist",
      experience_years: 6,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur",
      location: "Vaishali Nagar, Jaipur",
      latitude: ARTIST_LAT,
      longitude: ARTIST_LNG
    });

    // 2. Create Customer User
    customerUser = await db.User.create({
      name: "Priyanka Sharma",
      email: "priyanka@test.com",
      phone: "9123456789",
      phone_number: "9123456789",
      role: "CUSTOMER",
      is_verified: true
    });

    // 3. Create Service
    serviceItem = await db.Service.create({
      artist_id: artistProfile.id,
      specialization_name: "Bridal Full Hand Henna",
      category: "Bridal",
      minimum_price: 5500,
      duration_minutes: 180,
      is_active: true
    });

    // 4. Create Active Booking with Customer Location
    booking = await db.Booking.create({
      booking_code: "BK-GPS-1001",
      user_id: customerUser.id,
      artist_id: artistProfile.id,
      service_id: serviceItem.id,
      total_price: 5500,
      final_amount: 5500,
      advance_paid: 550,
      remaining_amount: 4950,
      booking_status: "CONFIRMED",
      detailed_status: "ARTIST_ON_THE_WAY",
      payment_status: "PARTIAL",
      latitude: CUST_LAT,
      longitude: CUST_LNG,
      address: CUST_ADDRESS,
      landmark: "Near Central Park",
      booking_date: "2026-08-25",
      booking_time: "11:00 AM",
      checkin_otp: "4821",
      checkout_otp: "7193"
    });
  });

  it("1. Customer -> Artist Road Directions: getDirectionsRoute calculates real polyline & ETA", async () => {
    const mockReq = {
      query: {
        originLat: CUST_LAT,
        originLng: CUST_LNG,
        destLat: ARTIST_LAT,
        destLng: ARTIST_LNG
      }
    };

    let responseData = null;
    let statusCode = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        responseData = payload;
        return this;
      }
    };

    await TrackingController.getDirectionsRoute(mockReq, mockRes);

    assert.equal(statusCode, 200, "Route API must return HTTP 200");
    assert.equal(responseData.success, true, "Response success must be true");
    assert.ok(responseData.data, "Response data must exist");

    const { coordinates, distanceKm, durationMins, distanceText, durationText } = responseData.data;

    assert.ok(Array.isArray(coordinates), "Coordinates must be an array of waypoints");
    assert.ok(coordinates.length >= 2, "Coordinates must contain at least origin and destination points");
    assert.ok(distanceKm > 0, "Distance in km must be greater than 0");
    assert.ok(durationMins > 0, "Duration in minutes must be greater than 0");
    assert.ok(distanceText.includes("km"), "Distance text must format in km");
    assert.ok(durationText.includes("mins"), "Duration text must format in mins");

    // Origin of polyline must match Customer coordinates
    const startPoint = coordinates[0];
    assert.ok(Math.abs(startPoint[0] - CUST_LAT) < 0.05, "Start point latitude must match customer GPS");
    assert.ok(Math.abs(startPoint[1] - CUST_LNG) < 0.05, "Start point longitude must match customer GPS");

    // Destination of polyline must match Artist coordinates
    const endPoint = coordinates[coordinates.length - 1];
    assert.ok(Math.abs(endPoint[0] - ARTIST_LAT) < 0.05, "End point latitude must match artist location");
    assert.ok(Math.abs(endPoint[1] - ARTIST_LNG) < 0.05, "End point longitude must match artist location");
  });

  it("2. Artist -> Customer Road Directions: getDirectionsRoute calculates navigation route from Artist to Customer", async () => {
    const mockReq = {
      query: {
        originLat: ARTIST_LAT,
        originLng: ARTIST_LNG,
        destLat: CUST_LAT,
        destLng: CUST_LNG
      }
    };

    let responseData = null;
    let statusCode = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        responseData = payload;
        return this;
      }
    };

    await TrackingController.getDirectionsRoute(mockReq, mockRes);

    assert.equal(statusCode, 200, "Route API must return HTTP 200");
    assert.equal(responseData.success, true, "Response success must be true");

    const { coordinates, distanceKm, durationMins } = responseData.data;

    assert.ok(Array.isArray(coordinates), "Coordinates must be an array");
    assert.ok(coordinates.length >= 2, "Coordinates must have waypoints");
    assert.ok(distanceKm > 0, "Distance must be positive");
    assert.ok(durationMins > 0, "Duration must be positive");

    const startPoint = coordinates[0];
    assert.ok(Math.abs(startPoint[0] - ARTIST_LAT) < 0.05, "Start point must be Artist GPS");
    const endPoint = coordinates[coordinates.length - 1];
    assert.ok(Math.abs(endPoint[0] - CUST_LAT) < 0.05, "End point must be Customer destination");
  });

  it("3. Live Location Query: getArtistLocation returns synchronized artist and customer booking location", async () => {
    const mockReq = {
      params: { bookingId: booking.id },
      user: { id: customerUser.id, role: "CUSTOMER" }
    };

    let responseData = null;
    let statusCode = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        responseData = payload;
        return this;
      }
    };

    await TrackingController.getArtistLocation(mockReq, mockRes);

    assert.equal(statusCode, 200, "getArtistLocation must return HTTP 200");
    assert.equal(responseData.success, true, "success must be true");

    const loc = responseData.data;
    assert.equal(loc.bookingId, booking.id, "bookingId must match");
    assert.equal(loc.artistId, artistProfile.id, "artistId must match");
    assert.equal(loc.artistName, "Ritu Verma (Mehndi Specialist)", "artistName must match");
    assert.equal(loc.customerAddress, CUST_ADDRESS, "customerAddress must match booking address");
    assert.equal(Number(loc.latitude), ARTIST_LAT, "Artist latitude must match profile/live latitude");
    assert.equal(Number(loc.longitude), ARTIST_LNG, "Artist longitude must match profile/live longitude");
    assert.equal(Number(loc.customerLatitude), CUST_LAT, "Customer latitude must match booking latitude");
    assert.equal(Number(loc.customerLongitude), CUST_LNG, "Customer longitude must match booking longitude");
    assert.ok(loc.distanceKm > 0, "distanceKm must be computed");
    assert.ok(loc.etaMins > 0, "etaMins must be computed");
    assert.ok(loc.trackingStatus.includes("Artist is on the way") || loc.trackingStatus.includes("Artist location shared"), "trackingStatus must be active");
  });

  it("4. Live Location Update: Artist moving GPS updates location and recalculates distance", async () => {
    // Moving GPS coordinate closer to customer
    const MOVING_LAT = 26.9080;
    const MOVING_LNG = 75.7750;

    const mockReq = {
      body: {
        bookingId: booking.id,
        latitude: MOVING_LAT,
        longitude: MOVING_LNG,
        heading: 45,
        speed: 25
      },
      user: { id: artistUser.id, role: "ARTIST" }
    };

    let updateRes = null;
    let updateCode = null;

    const mockRes = {
      status(code) {
        updateCode = code;
        return this;
      },
      json(payload) {
        updateRes = payload;
        return this;
      }
    };

    await TrackingController.updateLocation(mockReq, mockRes);

    assert.equal(updateCode, 200, "updateLocation must return HTTP 200");
    assert.equal(updateRes.success, true, "Update location success must be true");
    assert.equal(updateRes.data.latitude, MOVING_LAT, "Updated latitude must match");
    assert.equal(updateRes.data.longitude, MOVING_LNG, "Updated longitude must match");
  });

  it("5. Validation & Edge Cases: Missing coordinates return HTTP 400 with helpful error", async () => {
    const mockReq = {
      query: { originLat: "invalid", originLng: CUST_LNG }
    };

    let errRes = null;
    let errCode = null;

    const mockRes = {
      status(code) {
        errCode = code;
        return this;
      },
      json(payload) {
        errRes = payload;
        return this;
      }
    };

    await TrackingController.getDirectionsRoute(mockReq, mockRes);

    assert.equal(errCode, 400, "Invalid coords must return HTTP 400");
    assert.equal(errRes.success, false, "Success must be false for invalid request");
  });
});
