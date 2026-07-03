const db = require("../models");

async function syncAllSequences() {
  try {
    const tables = [
      "Users",
      "artist_profiles",
      "AvailabilitySlots",
      "Services",
      "Portfolios",
      "Bookings",
      "Reviews",
      "Coupons",
      "Addresses",
      "Banners",
      "ChatRooms",
      "Messages",
      "Notifications",
      "Wallets",
      "WalletTransactions",
      "Invoices",
      "BookingStatusHistories"
    ];

    console.log("Starting database serial sequence sync for PostgreSQL...");

    for (const table of tables) {
      try {
        // Find maximum ID
        const [maxIdResult] = await db.sequelize.query(`SELECT MAX(id) as max_id FROM "${table}"`);
        const maxId = maxIdResult[0]?.max_id;
        
        if (maxId) {
          console.log(`Table "${table}": Max ID is ${maxId}. Resetting sequence...`);
          await db.sequelize.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), ${maxId})`);
        } else {
          console.log(`Table "${table}": No records or no max ID. Resetting sequence to 1...`);
          await db.sequelize.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), 1, false)`);
        }
      } catch (tableErr) {
        console.warn(`Could not sync sequence for table "${table}":`, tableErr.message);
      }
    }

    console.log("PostgreSQL sequence sync completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("General sync error:", err);
    process.exit(1);
  }
}

syncAllSequences();
