const mongoose = require("mongoose");

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mehndigo";
  console.log(`[MongoDB] Attempting to connect to: ${uri}`);
  try {
    await mongoose.connect(uri);
    console.log("[MongoDB] Connected successfully to database");
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err.message);
    // Do not crash the entire app if MongoDB is unavailable; allow retry/graceful failure
  }
}

module.exports = connectMongoDB;
