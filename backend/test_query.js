const db = require("./models");

async function test() {
  try {
    console.log("Starting AvailabilitySlot DB query...");
    const slots = await db.AvailabilitySlot.findAll({
      where: { artist_id: 1 },
      order: [["start_time", "ASC"]]
    });
    console.log("Slots found:", slots.length);
    process.exit(0);
  } catch (error) {
    console.error("DB QUERY ERROR EXCEPTION:", error.message);
    process.exit(1);
  }
}

test();
