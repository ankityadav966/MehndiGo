require("dotenv").config();
const db = require("../models");

async function runTest() {
  try {
    console.log("Starting PostgreSQL Live Tracking Verification...");
    
    // 1. Sync database (creates Locations table if not exists)
    await db.Location.sync();
    console.log("[Test] Location table synchronized successfully.");

    // 2. Find a booking to run the test against
    const booking = await db.Booking.findOne({
      order: [["createdAt", "DESC"]]
    });

    if (!booking) {
      console.warn("[Test] No bookings found in the database. Cannot complete tracking test.");
      process.exit(1);
    }

    const bookingId = booking.id;
    const artistId = booking.artist_id;
    const userId = booking.user_id;

    console.log(`[Test] Selected Booking ID: ${bookingId}, Artist ID: ${artistId}, Customer User ID: ${userId}`);

    // 3. Clean up any existing location for this booking
    await db.Location.destroy({ where: { booking_id: bookingId } });
    console.log("[Test] Cleaned up existing location record.");

    // 4. Update location (upsert)
    const testLocation = {
      booking_id: bookingId,
      artist_id: artistId,
      latitude: 26.9124,
      longitude: 75.7873,
      heading: 45.5,
      speed: 15.2
    };

    console.log("[Test] Upserting location coordinates...");
    await db.Location.upsert(testLocation);
    console.log("[Test] Location upserted successfully.");

    // 5. Query location from database
    const saved = await db.Location.findOne({
      where: { booking_id: bookingId }
    });

    if (!saved) {
      throw new Error("[Test Failed] Could not find saved location in PostgreSQL!");
    }

    console.log("[Test Success] Location verified in PostgreSQL database:", {
      booking_id: saved.booking_id,
      artist_id: saved.artist_id,
      latitude: parseFloat(saved.latitude),
      longitude: parseFloat(saved.longitude),
      heading: saved.heading,
      speed: saved.speed,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt
    });

    process.exit(0);
  } catch (err) {
    console.error("[Test Failed] An error occurred during verification:", err.message);
    process.exit(1);
  }
}

runTest();
