const db = require("./models");

async function main() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const safeAdd = async (table, col, spec) => {
      try {
        const desc = await queryInterface.describeTable(table);
        if (!desc[col]) {
          await queryInterface.addColumn(table, col, spec);
        }
      } catch (err) {}
    };

    await safeAdd("Wallets", "pending_balance", { type: db.Sequelize.INTEGER, defaultValue: 0, allowNull: false });
    await safeAdd("Wallets", "lifetime_earnings", { type: db.Sequelize.INTEGER, defaultValue: 0, allowNull: false });
    await safeAdd("Wallets", "total_commission_earned", { type: db.Sequelize.INTEGER, defaultValue: 0, allowNull: false });
    await safeAdd("Wallets", "total_withdrawals", { type: db.Sequelize.INTEGER, defaultValue: 0, allowNull: false });
    console.log("Wallets table columns altered successfully!");

    console.log("Syncing new escrow, settlement and reminder models...");
    if (db.EscrowRecord) await db.EscrowRecord.sync();
    if (db.SettlementHistory) await db.SettlementHistory.sync();
    if (db.ReminderLog) await db.ReminderLog.sync();
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
