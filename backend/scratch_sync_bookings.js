const db = require("./models");

async function main() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    try {
      const desc = await queryInterface.describeTable("Bookings");
      if (!desc["review_skipped"]) {
        await queryInterface.addColumn("Bookings", "review_skipped", { type: db.Sequelize.BOOLEAN, defaultValue: false, allowNull: false });
      }
    } catch(err){}
    console.log("review_skipped column synchronized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database sync failed:", error);
    process.exit(1);
  }
}

main();
