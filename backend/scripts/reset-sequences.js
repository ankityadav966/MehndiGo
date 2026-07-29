const db = require("../models");

async function fixSequences() {
  console.log("==========================================");
  console.log("Fixing PostgreSQL Primary Key Sequences");
  console.log("==========================================");

  const tables = [
    { table: '"Users"', pk: 'id' },
    { table: 'artist_profiles', pk: 'id' },
    { table: '"Bookings"', pk: 'id' },
    { table: '"Services"', pk: 'id' },
    { table: '"Portfolios"', pk: 'id' },
    { table: '"Reviews"', pk: 'id' },
    { table: '"Otps"', pk: 'id' },
    { table: '"AvailabilitySlots"', pk: 'id' },
    { table: '"Coupons"', pk: 'id' }
  ];

  for (const t of tables) {
    try {
      const sql = `SELECT setval(pg_get_serial_sequence('${t.table}', '${t.pk}'), COALESCE((SELECT MAX(${t.pk}) FROM ${t.table}), 1));`;
      await db.sequelize.query(sql);
      console.log(`✅ Sequence reset for ${t.table}`);
    } catch (e) {
      console.log(`⚠️ Sequence reset skipped for ${t.table}:`, e.message);
    }
  }

  console.log("All sequences updated successfully!");
  process.exit(0);
}

fixSequences();
