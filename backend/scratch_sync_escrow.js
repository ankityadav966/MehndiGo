const db = require("./models");

async function main() {
  try {
    console.log("Altering Wallets table to add new ledger columns...");
    await db.sequelize.query(`ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS "pending_balance" INTEGER NOT NULL DEFAULT 0;`);
    await db.sequelize.query(`ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS "lifetime_earnings" INTEGER NOT NULL DEFAULT 0;`);
    await db.sequelize.query(`ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS "total_commission_earned" INTEGER NOT NULL DEFAULT 0;`);
    await db.sequelize.query(`ALTER TABLE "Wallets" ADD COLUMN IF NOT EXISTS "total_withdrawals" INTEGER NOT NULL DEFAULT 0;`);
    console.log("Wallets table columns altered successfully!");

    console.log("Syncing new escrow, settlement and reminder models...");
    await db.EscrowRecord.sync({ alter: true });
    await db.SettlementHistory.sync({ alter: true });
    await db.ReminderLog.sync({ alter: true });
    console.log("New models synchronized successfully!");

    console.log("Seeding growth/escrow settings configurations...");
    const settings = [
      { key: "COMMISSION_PERCENTAGE", value: "10" },
      { key: "REMINDER_INTERVAL_HOURS", value: "1" }
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
    console.log("Escrow configurations successfully seeded!");
    process.exit(0);
  } catch (error) {
    console.error("Database sync failed:", error);
    process.exit(1);
  }
}

main();
