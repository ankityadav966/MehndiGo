const db = require("./models");

async function main() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    try {
      const desc = await queryInterface.describeTable("Users");
      if (!desc["ambassador_score"]) {
        await queryInterface.addColumn("Users", "ambassador_score", { type: db.Sequelize.INTEGER, defaultValue: 0, allowNull: false });
      }
    } catch(err){}
    console.log("ambassador_score column synchronized successfully!");

    console.log("Seeding growth parameters into SystemSettings...");
    const settings = [
      { key: "XP_USER_REFERRAL", value: "300" },
      { key: "XP_ARTIST_REFERRAL", value: "500" },
      { key: "XP_ARTIST_MILESTONE_PROFILE", value: "100" },
      { key: "XP_ARTIST_MILESTONE_BOOKING_1", value: "200" },
      { key: "XP_ARTIST_MILESTONE_BOOKING_10", value: "300" },
      { key: "XP_ARTIST_MILESTONE_BOOKING_25", value: "500" },
      { key: "XP_ARTIST_MILESTONE_BOOKING_50", value: "1000" },
      { key: "XP_ARTIST_MILESTONE_BOOKING_100", value: "2500" },
      { key: "POINTS_USER_REFERRAL", value: "1" },
      { key: "POINTS_ARTIST_VERIFIED", value: "3" },
      { key: "POINTS_ARTIST_ACTIVE", value: "5" },
      { key: "POINTS_ARTIST_HIGH_PERFORMANCE", value: "10" }
    ];

    for (const s of settings) {
      const [record, created] = await db.SystemSetting.findOrCreate({
        where: { key: s.key },
        defaults: s
      });
      if (!created && record.value !== s.value) {
        await record.update({ value: s.value });
      }
    }
    console.log("SystemSettings growth variables successfully seeded/updated!");

    process.exit(0);
  } catch (error) {
    console.error("Database sync failed:", error);
    process.exit(1);
  }
}

main();
