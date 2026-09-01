const assert = require("assert");
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const db = require("../models");
const WalletService = require("../services/wallet.services");

async function testWalletCashAndPayout() {
  console.log("=========================================");
  console.log("🧪 TESTING WALLET CASH ENTRIES & PAYOUT STATUS");
  console.log("=========================================\n");

  await db.sequelize.sync({ force: true });

  // 1. Create Artist User & Profile
  const artistUser = await db.User.create({
    name: "Priya Sharma",
    phone: "9876543210",
    email: "priya@artist.com",
    role: "ARTIST",
    is_verified: true
  });

  const artistProfile = await db.ArtistProfile.create({
    user_id: artistUser.id,
    bio: "Expert Bridal Mehndi Artist",
    experience_years: 5,
    city: "Jaipur",
    pincode: "302001",
    verification_status: "APPROVED",
    is_available: true
  });

  // 2. Create Customer User
  const customerUser = await db.User.create({
    name: "Sunita Verma",
    phone: "9123456789",
    email: "sunita@customer.com",
    role: "CUSTOMER",
    is_verified: true
  });

  const service = await db.Service.create({
    artist_id: artistProfile.id,
    specialization_name: "Bridal Mehndi",
    category: "Bridal Mehndi",
    description: "Bridal service",
    minimum_price: 1500,
    maximum_price: 5000,
    duration_minutes: 120,
    is_active: true
  });

  // 3. Create Cash Booking (Completed)
  const cashBooking1 = await db.Booking.create({
    booking_code: "MG-CASH-101",
    user_id: customerUser.id,
    artist_id: artistProfile.id,
    service_id: service.id,
    total_price: 2500,
    final_amount: 2500,
    advance_paid: 250,
    remaining_amount: 0,
    payment_mode: "CASH",
    payment_status: "PAID",
    booking_status: "COMPLETED",
    detailed_status: "COMPLETED"
  });

  const cashBooking2 = await db.Booking.create({
    booking_code: "MG-CASH-102",
    user_id: customerUser.id,
    artist_id: artistProfile.id,
    service_id: service.id,
    total_price: 1500,
    final_amount: 1500,
    advance_paid: 0,
    remaining_amount: 0,
    payment_mode: "CASH",
    payment_status: "PAID",
    booking_status: "COMPLETED",
    detailed_status: "COMPLETED"
  });

  // 4. Test getWalletSummary
  const summary = await WalletService.getWalletSummary(artistUser.id);
  console.log("Wallet Summary Output:", JSON.stringify(summary, null, 2));

  assert.ok(Array.isArray(summary.cash_entries), "cash_entries must be an array");
  assert.strictEqual(summary.cash_entries.length, 2, "Must return 2 completed cash bookings");
  assert.strictEqual(summary.cash_entries[0].booking_code, "MG-CASH-102");
  assert.strictEqual(summary.cash_entries[0].amount, 1500);
  assert.strictEqual(summary.cash_entries[1].booking_code, "MG-CASH-101");
  assert.strictEqual(summary.cash_entries[1].amount, 2250); // 2500 - 250 advance
  assert.strictEqual(summary.cash_earnings, 3750, "Total cash earnings = 2250 + 1500 = 3750");

  console.log("✅ getWalletSummary accurately populates cash_entries and cash_earnings!");

  // 5. Test getWithdrawalStatus
  const withdrawStatus = await WalletService.getWithdrawalStatus(artistUser.id);
  console.log("Withdrawal Status Output:", JSON.stringify(withdrawStatus, null, 2));

  assert.ok(withdrawStatus.day_info, "Must include day_info");
  assert.strictEqual(typeof withdrawStatus.is_withdrawal_open, "boolean");
  assert.strictEqual(withdrawStatus.has_pending_request, false);

  console.log("✅ getWithdrawalStatus successfully returns authoritative day and balance status!");

  console.log("\n🎉 ALL WALLET & PAYOUT TESTS PASSED PERFECTLY!");
}

testWalletCashAndPayout().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
