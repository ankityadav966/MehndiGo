const db = require("../models");

async function run() {
  const queryInterface = db.sequelize.getQueryInterface();
  try {
    console.log("Checking and adding cover_image column to artist_profiles...");
    await queryInterface.addColumn("artist_profiles", "cover_image", {
      type: db.Sequelize.STRING,
      allowNull: true
    });
    console.log("Added cover_image successfully.");
  } catch (e) {
    console.log("cover_image column error (probably already exists):", e.message);
  }

  try {
    console.log("Checking and adding languages column to artist_profiles...");
    await queryInterface.addColumn("artist_profiles", "languages", {
      type: db.Sequelize.STRING,
      allowNull: true
    });
    console.log("Added languages successfully.");
  } catch (e) {
    console.log("languages column error (probably already exists):", e.message);
  }

  console.log("Done.");
  process.exit(0);
}

run();
