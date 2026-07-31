const db = require("../models");

async function initDatabase() {
  console.log("==========================================");
  console.log("MehndiGo Database Schema Sync & Initialization");
  console.log("==========================================");

  try {
    console.log("1. Testing connection to PostgreSQL...");
    await db.sequelize.authenticate();
    console.log("✅ PostgreSQL connected successfully!");

    console.log("2. Adding Razorpay columns to existing tables if missing...");
    const queries = [
      `ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS "razorpay_order_id" VARCHAR(255);`,
      `ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS "razorpay_payment_id" VARCHAR(255);`,
      `ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS "razorpay_signature" VARCHAR(255);`,
      
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "razorpay_order_id" VARCHAR(255);`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "razorpay_payment_id" VARCHAR(255);`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "razorpay_signature" VARCHAR(255);`,
      `ALTER TABLE "Transactions" ALTER COLUMN "cashfree_order_id" DROP NOT NULL;`,

      `ALTER TABLE "WalletTransactions" ADD COLUMN IF NOT EXISTS "razorpay_order_id" VARCHAR(255);`,
      `ALTER TABLE "WalletTransactions" ADD COLUMN IF NOT EXISTS "razorpay_payment_id" VARCHAR(255);`,
      `ALTER TABLE "WalletTransactions" ADD COLUMN IF NOT EXISTS "razorpay_signature" VARCHAR(255);`
    ];

    for (const q of queries) {
      await db.sequelize.query(q);
    }
    console.log("✅ Database table columns updated for Razorpay!");

    console.log("3. Synchronizing Sequelize models to database (mehndigo_db)...");
    await db.sequelize.sync({ alter: true });
    console.log("✅ All tables synchronized successfully!");

    const tables = await db.sequelize.getQueryInterface().showAllTables();
    console.log(`✅ Created/Verified ${tables.length} tables in mehndigo_db:`);
    console.log(tables.sort().join(", "));

    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

initDatabase();
