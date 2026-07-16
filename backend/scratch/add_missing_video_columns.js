const db = require("../models");

async function addColumns() {
  try {
    console.log("Checking and adding missing video columns to artist_profiles...");
    
    await db.sequelize.query(`
      ALTER TABLE "artist_profiles" 
      ADD COLUMN IF NOT EXISTS "intro_video" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "portfolio_video" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "intro_video_thumbnail" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "portfolio_video_thumbnail" VARCHAR(255);
    `);
    
    console.log("SUCCESS: Missing video columns added to artist_profiles!");
    process.exit(0);
  } catch (err) {
    console.error("Failed to add columns:", err);
    process.exit(1);
  }
}

addColumns();
