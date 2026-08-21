/**
 * Targeted Test Artist Data Cleanup Script
 * Safely removes test accounts created during verification:
 * - ananya.artist@mehndigo.in
 * - bhavna.artist@mehndigo.in
 * And all dependent records mapped strictly to their user IDs.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const db = require("../models");

async function cleanupTestArtists() {
  console.log("===============================================================");
  console.log("  MEHNDIGO — TARGETED TEST ARTIST ACCOUNT & KYC DATA CLEANUP");
  console.log("===============================================================\n");

  const testEmails = [
    "ananya.artist@mehndigo.in",
    "bhavna.artist@mehndigo.in"
  ];

  try {
    // 1. Check if database connection works
    await db.sequelize.authenticate();
    console.log("✅ Database connection established successfully.\n");

    // 2. Query target test users
    console.log("--- 1. Pre-Cleanup Inspection ---");
    const targetUsers = await db.User.findAll({
      where: {
        email: testEmails
      }
    });

    if (targetUsers.length === 0) {
      console.log("ℹ️  No records found for test emails in active database:");
      testEmails.forEach(e => console.log(`   - ${e}: NOT FOUND`));
      console.log("\nDatabase is already clean of test accounts.\n");
      return {
        removedUsers: 0,
        removedProfiles: 0,
        removedServices: 0,
        removedWallets: 0,
        details: []
      };
    }

    const testUserIds = targetUsers.map(u => u.id);
    console.log(`Found ${targetUsers.length} test user record(s):`);
    targetUsers.forEach(u => {
      console.log(`  - User ID: ${u.id} | Email: ${u.email} | Name: ${u.name} | Role: ${u.role}`);
    });

    // 3. Inspect related records before deletion
    const relatedProfiles = await db.ArtistProfile.findAll({
      where: { user_id: testUserIds }
    });
    console.log(`Found ${relatedProfiles.length} related ArtistProfile record(s).`);

    let relatedServicesCount = 0;
    if (db.Service) {
      const services = await db.Service.findAll({ where: { artist_id: testUserIds } });
      relatedServicesCount = services.length;
      console.log(`Found ${services.length} related Service record(s).`);
    }

    let relatedWalletsCount = 0;
    if (db.Wallet) {
      const wallets = await db.Wallet.findAll({ where: { user_id: testUserIds } });
      relatedWalletsCount = wallets.length;
      console.log(`Found ${wallets.length} related Wallet record(s).`);
    }

    let relatedTransactionsCount = 0;
    if (db.WalletTransaction) {
      const txs = await db.WalletTransaction.findAll({ where: { user_id: testUserIds } });
      relatedTransactionsCount = txs.length;
      console.log(`Found ${txs.length} related WalletTransaction record(s).`);
    }

    let relatedNotificationsCount = 0;
    if (db.Notification) {
      const notes = await db.Notification.findAll({ where: { user_id: testUserIds } });
      relatedNotificationsCount = notes.length;
      console.log(`Found ${notes.length} related Notification record(s).`);
    }

    // 4. Perform scoped, targeted deletion
    console.log("\n--- 2. Scoped Deletion Execution ---");

    if (db.WalletTransaction) {
      await db.WalletTransaction.destroy({ where: { user_id: testUserIds } });
      console.log("  ✅ Deleted related WalletTransaction records.");
    }

    if (db.Wallet) {
      await db.Wallet.destroy({ where: { user_id: testUserIds } });
      console.log("  ✅ Deleted related Wallet records.");
    }

    if (db.Notification) {
      await db.Notification.destroy({ where: { user_id: testUserIds } });
      console.log("  ✅ Deleted related Notification records.");
    }

    if (db.Service) {
      await db.Service.destroy({ where: { artist_id: testUserIds } });
      console.log("  ✅ Deleted related Service records.");
    }

    if (db.ArtistAvailability) {
      await db.ArtistAvailability.destroy({ where: { artist_id: testUserIds } });
      console.log("  ✅ Deleted related ArtistAvailability records.");
    }

    if (db.Portfolio) {
      await db.Portfolio.destroy({ where: { artist_id: testUserIds } });
      console.log("  ✅ Deleted related Portfolio records.");
    }

    await db.ArtistProfile.destroy({ where: { user_id: testUserIds } });
    console.log("  ✅ Deleted related ArtistProfile & test KYC records.");

    await db.User.destroy({ where: { id: testUserIds } });
    console.log("  ✅ Deleted target test User records.");

    // 5. Post-Cleanup Verification
    console.log("\n--- 3. Post-Cleanup Verification ---");
    const remainingUsers = await db.User.findAll({ where: { email: testEmails } });
    const remainingProfiles = await db.ArtistProfile.findAll({ where: { user_id: testUserIds } });

    console.log(`Remaining test users: ${remainingUsers.length} (Expected: 0)`);
    console.log(`Remaining test profiles: ${remainingProfiles.length} (Expected: 0)`);

    testEmails.forEach(e => {
      const exists = remainingUsers.some(u => u.email === e);
      console.log(`  - ${e}: ${exists ? "STILL EXISTS (ERROR)" : "NOT FOUND (CLEAN)"}`);
    });

    console.log("\n===============================================================");
    console.log("  CLEANUP COMPLETED SUCCESSFULLY");
    console.log("===============================================================\n");

    return {
      removedUsers: targetUsers.length,
      removedProfiles: relatedProfiles.length,
      removedServices: relatedServicesCount,
      removedWallets: relatedWalletsCount,
      details: targetUsers.map(u => ({ id: u.id, email: u.email }))
    };
  } catch (err) {
    console.error("Cleanup error:", err.message);
    // If DB is unreachable (e.g. Postgres local server not running because D1 is primary)
    console.log("Note: Database dialect or host info:", db.sequelize?.options?.dialect);
    return { error: err.message };
  }
}

if (require.main === module) {
  cleanupTestArtists().then(() => {
    process.exit(0);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = cleanupTestArtists;
