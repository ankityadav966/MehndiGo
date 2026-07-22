require("dotenv").config();
const { client: redisClient, connectRedis } = require("../config/redis");

async function runTest() {
  try {
    console.log("Starting Redis Live Tracking Verification...");
    
    // 1. Connect to Redis
    await connectRedis();

    const bookingId = 153; // Test Booking ID
    const redisKey = `artist:location:${bookingId}`;

    // 2. Clean up any existing location in Redis
    await redisClient.del(redisKey);
    console.log("[Test] Cleaned up existing Redis key.");

    // 3. Update location in Redis
    const testLocation = {
      bookingId: bookingId.toString(),
      artistId: "12",
      latitude: "26.9201",
      longitude: "75.7891",
      heading: "90",
      speed: "12.5",
      updatedAt: new Date().toISOString()
    };

    console.log("[Test] Writing location hash to Redis...");
    await redisClient.hSet(redisKey, testLocation);
    await redisClient.expire(redisKey, 7200);
    console.log("[Test] Location written and expired correctly.");

    // 4. Query location from Redis
    const saved = await redisClient.hGetAll(redisKey);

    if (!saved || Object.keys(saved).length === 0) {
      throw new Error("[Test Failed] Could not find saved location in Redis!");
    }

    console.log("[Test Success] Location verified in Redis database:", {
      bookingId: parseInt(saved.bookingId),
      artistId: parseInt(saved.artistId),
      latitude: parseFloat(saved.latitude),
      longitude: parseFloat(saved.longitude),
      heading: parseFloat(saved.heading),
      speed: parseFloat(saved.speed),
      updatedAt: saved.updatedAt
    });

    await redisClient.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[Test Failed] An error occurred during Redis verification:", err.message);
    process.exit(1);
  }
}

runTest();
