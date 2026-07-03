const db = require("../models");

async function main() {
  try {
    console.log("Starting Category model DB sync...");
    await db.Category.sync({ alter: true });
    console.log("DB sync complete. Categories table created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("DB sync failed:", error);
    process.exit(1);
  }
}

main();
