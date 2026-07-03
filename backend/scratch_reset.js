const db = require("./models");

async function reset() {
  try {
    console.log("Dropping all tables on remote database...");
    await db.sequelize.getQueryInterface().dropAllTables();
    console.log("All tables dropped successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to drop tables:", error);
    process.exit(1);
  }
}

reset();
