require("dotenv").config();
const mongoose = require("mongoose");
const db = require("../models");
const connectMongoDB = require("../config/mongodb");
const Location = require("../models/mongo/location.model");
const trackingController = require("../controllers/tracking/tracking.controller");
const socketModule = require("../sockets/socket");

// Mock Socket.IO to spy on emits
let emittedEvents = [];
const mockIo = {
  to: (room) => {
    return {
      emit: (event, payload) => {
        emittedEvents.push({ room, event, payload });
      }
    };
  }
};

// Override socketModule.getIO to return our mock
socketModule.getIO = () => mockIo;

async function runE2ETests() {
  console.log("Starting Live Tracking E2E Integration Test...");

  // 1. Connect to both databases
  await connectMongoDB();
  
  // Wait a second for connection
  await new Promise(r => setTimeout(r, 1000));

  try {
    // 2. Setup Test Data in PostgreSQL
    console.log("\n[Test Data Setup] Finding or seeding test user, artist, and booking...");
    
    // Find or create test customer
    let customer = await db.User.findOne({ where: { phone: "9999999991" } });
    if (!customer) {
      customer = await db.User.create({
        name: "Test Customer",
        phone: "9999999991",
        email: "customer@test.com",
        role: "USER",
        is_verified: true
      });
    }

    // Find or create test artist user
    let artistUser = await db.User.findOne({ where: { phone: "9999999992" } });
    if (!artistUser) {
      artistUser = await db.User.create({
        name: "Test Artist User",
        phone: "9999999992",
        email: "artist@test.com",
        role: "ARTIST",
        is_verified: true
      });
    }

    // Find or create artist profile
    let artistProfile = await db.ArtistProfile.findOne({ where: { user_id: artistUser.id } });
    if (!artistProfile) {
      artistProfile = await db.ArtistProfile.create({
        user_id: artistUser.id,
        bio: "Test bio",
        experience_years: 5,
        verification_status: "APPROVED",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        location: "Jaipur"
      });
    }

    // Find or create test service
    let service = await db.Service.findOne({ where: { artist_id: artistProfile.id } });
    if (!service) {
      service = await db.Service.create({
        artist_id: artistProfile.id,
        specialization_name: "Bridal Mehndi",
        category: "Bridal",
        minimum_price: 1500,
        duration_minutes: 120
      });
    }

    // Find or create test booking in CONFIRMED/ACCEPTED state
    let booking = await db.Booking.findOne({ where: { user_id: customer.id, artist_id: artistProfile.id } });
    if (!booking) {
      booking = await db.Booking.create({
        booking_code: "BKTEST" + Date.now().toString().slice(-6),
        user_id: customer.id,
        artist_id: artistProfile.id,
        service_id: service.id,
        total_price: 1500,
        advance_paid: 500,
        remaining_amount: 1000,
        booking_status: "CONFIRMED",
        payment_status: "PAID",
        detailed_status: "ARTIST_ACCEPTED",
        travel_charges: 100,
        final_amount: 1600,
        address: "123, Test Street, Jaipur",
        latitude: 26.9124,
        longitude: 75.7873
      });
    } else {
      // Reset status to allow tracking updates
      booking.detailed_status = "ARTIST_ACCEPTED";
      booking.booking_status = "CONFIRMED";
      await booking.save();
    }

    console.log(`Test Booking Code: ${booking.booking_code} | ID: ${booking.id}`);
    console.log(`Customer User ID: ${customer.id}`);
    console.log(`Artist User ID: ${artistUser.id} | Profile ID: ${artistProfile.id}`);

    // Clear stale test data in MongoDB
    await Location.deleteMany({ bookingId: booking.id });

    // 3. Test Location Update API
    console.log("\n[Test 1] Testing Artist location update (updateLocation)...");
    
    const mockUpdateReq = {
      user: { id: artistUser.id, role: "ARTIST" },
      body: {
        bookingId: booking.id,
        latitude: 26.9205,
        longitude: 75.7981,
        heading: 180,
        speed: 12.5
      }
    };

    let updateStatus = null;
    let updateResponse = null;
    const mockUpdateRes = {
      status: (code) => {
        updateStatus = code;
        return {
          json: (data) => {
            updateResponse = data;
          }
        };
      }
    };

    emittedEvents = []; // reset event spies
    await trackingController.updateLocation(mockUpdateReq, mockUpdateRes);

    if (updateStatus !== 200 || !updateResponse.success) {
      throw new Error(`Failed to update artist location: ${JSON.stringify(updateResponse)}`);
    }
    console.log("✅ updateLocation returned HTTP 200 success!");

    // Verify MongoDB update
    const savedLoc = await Location.findOne({ bookingId: booking.id });
    if (!savedLoc || savedLoc.latitude !== 26.9205 || savedLoc.longitude !== 75.7981) {
      throw new Error("❌ Location not correctly saved in MongoDB!");
    }
    console.log("✅ Location verified in MongoDB:", savedLoc.latitude, savedLoc.longitude);

    // Verify Socket emission
    if (emittedEvents.length === 0) {
      throw new Error("❌ Socket.IO broadcast was not emitted!");
    }
    
    const socketEvent = emittedEvents[0];
    if (socketEvent.room !== customer.id.toString() || socketEvent.event !== "artistLocationUpdated") {
      throw new Error(`❌ Stale or wrong socket routing: ${JSON.stringify(socketEvent)}`);
    }
    console.log("✅ Socket event successfully verified and routed to Customer room:", socketEvent.room);
    console.log("Emitted Payload:", socketEvent.payload);

    // 4. Test Customer Fetch Location API
    console.log("\n[Test 2] Testing Customer retrieval of artist location (getArtistLocation)...");

    const mockGetReq = {
      user: { id: customer.id, role: "USER" },
      params: { bookingId: booking.id }
    };

    let getStatus = null;
    let getResponse = null;
    const mockGetRes = {
      status: (code) => {
        getStatus = code;
        return {
          json: (data) => {
            getResponse = data;
          }
        };
      }
    };

    await trackingController.getArtistLocation(mockGetReq, mockGetRes);

    if (getStatus !== 200 || !getResponse.success) {
      throw new Error(`Failed to retrieve location: ${JSON.stringify(getResponse)}`);
    }
    console.log("✅ getArtistLocation returned HTTP 200 success!");
    console.log("Retrieved Data:", getResponse.data);

    // 5. Test Access Security Violations
    console.log("\n[Test 3] Testing Security Bounds (Unauthorized customer access)...");
    
    const hackerUser = await db.User.create({
      name: "Hacker Customer",
      phone: "9999999993",
      role: "USER",
      is_verified: true
    });

    const mockHackReq = {
      user: { id: hackerUser.id, role: "USER" },
      params: { bookingId: booking.id }
    };

    let hackStatus = null;
    let hackResponse = null;
    const mockHackRes = {
      status: (code) => {
        hackStatus = code;
        return {
          json: (data) => {
            hackResponse = data;
          }
        };
      }
    };

    await trackingController.getArtistLocation(mockHackReq, mockHackRes);
    
    // Clean up hacker
    await hackerUser.destroy();

    if (hackStatus !== 403) {
      throw new Error(`Security Fail: hacker accessed tracking details! HTTP Code: ${hackStatus}`);
    }
    console.log("✅ Security check passed. Hacker rejected with HTTP 403 Forbidden!");

    // 6. Test Tracking Termination (Completed Bookings)
    console.log("\n[Test 4] Testing Tracking termination for completed bookings...");
    
    booking.booking_status = "COMPLETED";
    booking.detailed_status = "COMPLETED";
    await booking.save();

    let termStatus = null;
    let termResponse = null;
    const mockTermRes = {
      status: (code) => {
        termStatus = code;
        return {
          json: (data) => {
            termResponse = data;
          }
        };
      }
    };

    await trackingController.updateLocation(mockUpdateReq, mockTermRes);

    if (termStatus !== 400) {
      throw new Error(`Location updates accepted on completed bookings! HTTP Code: ${termStatus}`);
    }
    console.log("✅ Booking completion check passed. Artist update rejected with HTTP 400 Bad Request!");

    console.log("\n🎉 All Live Tracking integration tests passed successfully! 🚀");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ E2E Integration Test failed:", err.message);
    console.error(err);
    process.exit(1);
  }
}

runE2ETests();
