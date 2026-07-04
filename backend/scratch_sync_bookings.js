const db = require("./models");

async function main() {
  try {
    console.log("Synchronizing Bookings model to add review_skipped column...");
    await db.sequelize.query(`ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "review_skipped" BOOLEAN NOT NULL DEFAULT FALSE;`);
    console.log("review_skipped column synchronized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database sync failed:", error);
    process.exit(1);
  }
}

main();
