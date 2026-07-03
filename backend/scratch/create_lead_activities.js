const db = require("../models");

async function run() {
  const queryInterface = db.sequelize.getQueryInterface();
  try {
    console.log("Creating lead_activities table...");
    await queryInterface.createTable("lead_activities", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: db.Sequelize.INTEGER,
      },
      booking_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Bookings",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      activity_type: {
        type: db.Sequelize.STRING,
        allowNull: false
      },
      notes: {
        type: db.Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: db.Sequelize.DATE,
        defaultValue: db.Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: db.Sequelize.DATE,
        defaultValue: db.Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
    console.log("Created table successfully.");
  } catch (e) {
    console.log("Table error (probably already exists):", e.message);
  }
  process.exit(0);
}

run();
