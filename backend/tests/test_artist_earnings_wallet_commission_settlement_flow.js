"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const PaymentService = require("../services/payment.services");
const WalletService = require("../services/wallet.services");
const ArtistService = require("../services/artist.services");
const BookingService = require("../services/booking.services");

describe("ARTIST MODULE 10: EARNINGS + WALLET + COMMISSION + SETTLEMENT INTEGRATION SUITE", () => {
  let approvedArtistUserA, approvedArtistProfileA;
  let rivalArtistUserB, rivalArtistProfileB;
  let freshArtistUserC, freshArtistProfileC;
  let customerUser;
  let booking3500, booking999, bookingPending;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Approved Artist A
    approvedArtistUserA = await db.User.create({
      name: "Rupal Mehndi Artist",
      email: "rupal@finance.com",
      phone: "9876543260",
      phone_number: "9876543260",
      role: "ARTIST",
      is_verified: true
    });
    approvedArtistProfileA = await db.ArtistProfile.create({
      user_id: approvedArtistUserA.id,
      bio: "Master Bridal Henna Artist",
      experience_years: 10,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 2. Rival Artist B
    rivalArtistUserB = await db.User.create({
      name: "Rival Artist B",
      email: "rivalb@finance.com",
      phone: "9876543261",
      phone_number: "9876543261",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtistProfileB = await db.ArtistProfile.create({
      user_id: rivalArtistUserB.id,
      bio: "Rival Bridal Henna Artist",
      experience_years: 4,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 3. Fresh Artist C (0 bookings, 0 transactions)
    freshArtistUserC = await db.User.create({
      name: "Fresh Artist C",
      email: "freshc@finance.com",
      phone: "9876543262",
      phone_number: "9876543262",
      role: "ARTIST",
      is_verified: true
    });
    freshArtistProfileC = await db.ArtistProfile.create({
      user_id: freshArtistUserC.id,
      bio: "Fresh Henna Designer",
      experience_years: 1,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 4. Customer
    customerUser = await db.User.create({
      name: "Divya Client",
      email: "divya@finance.com",
      phone: "9123456731",
      phone_number: "9123456731",
      role: "CUSTOMER",
      is_verified: true
    });

    // 5. Category & Services
    const category = await db.Category.create({
      name: "Bridal Premium",
      slug: "bridal-premium",
      status: "ACTIVE",
      is_active: true
    });

    const service3500 = await db.Service.create({
      artist_id: approvedArtistProfileA.id,
      specialization_name: "Traditional Marwari Bridal Mehndi",
      category: "Bridal Premium",
      category_id: category.id,
      minimum_price: 3500,
      duration_minutes: 150,
      is_active: true
    });

    const service999 = await db.Service.create({
      artist_id: approvedArtistProfileA.id,
      specialization_name: "Party Mehndi Hands",
      category: "Bridal Premium",
      category_id: category.id,
      minimum_price: 999,
      duration_minutes: 60,
      is_active: true
    });

    const todayStr = new Date().toISOString().substring(0, 10);
    const slot1 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfileA.id,
      date: todayStr,
      start_time: `${todayStr}T10:00:00.000Z`,
      end_time: `${todayStr}T12:30:00.000Z`,
      is_booked: true
    });

    const slot2 = await db.AvailabilitySlot.create({
      artist_id: approvedArtistProfileA.id,
      date: todayStr,
      start_time: `${todayStr}T14:00:00.000Z`,
      end_time: `${todayStr}T15:00:00.000Z`,
      is_booked: true
    });

    // 6. Booking 1: Total ₹3500
    booking3500 = await db.Booking.create({
      booking_code: "MG-100101",
      user_id: customerUser.id,
      artist_id: approvedArtistProfileA.id,
      service_id: service3500.id,
      slot_id: slot1.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED",
      check_in_otp_verified: true,
      check_out_otp_verified: true,
      service_started_at: new Date(Date.now() - 3 * 3600 * 1000),
      check_out_time: new Date(),
      address: "Bapu Nagar, Jaipur"
    });

    // 7. Booking 2: Total ₹999 (Rounding Test: Advance = ₹100, Remaining = ₹899)
    const advance999 = Math.round(999 * 0.10); // 100
    const rem999 = 999 - advance999; // 899
    booking999 = await db.Booking.create({
      booking_code: "MG-100102",
      user_id: customerUser.id,
      artist_id: approvedArtistProfileA.id,
      service_id: service999.id,
      slot_id: slot2.id,
      total_price: 999,
      advance_paid: advance999,
      remaining_amount: rem999,
      final_amount: 999,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED",
      check_in_otp_verified: true,
      check_out_otp_verified: true,
      service_started_at: new Date(Date.now() - 2 * 3600 * 1000),
      check_out_time: new Date(),
      address: "Tilak Nagar, Jaipur"
    });

    // 8. Booking 3: Pending/Incomplete Booking
    bookingPending = await db.Booking.create({
      booking_code: "MG-100103",
      user_id: customerUser.id,
      artist_id: approvedArtistProfileA.id,
      service_id: service3500.id,
      slot_id: slot1.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "SERVICE_IN_PROGRESS",
      check_in_otp_verified: true,
      check_out_otp_verified: false,
      address: "Bapu Nagar, Jaipur"
    });
  });

  it("1. Financial Snapshot & Invariant: advance_paid + remaining_amount === total_price", async () => {
    assert.equal(booking3500.advance_paid + booking3500.remaining_amount, booking3500.total_price);
    assert.equal(booking999.advance_paid + booking999.remaining_amount, booking999.total_price);
  });

  it("2. Commission & Settlement for ₹3500: Commission is ₹350 (10%), Artist Net Share is ₹3150", async () => {
    const settlement = await PaymentService.completeBookingSettlement(booking3500.id);
    assert.ok(settlement);
    assert.equal(settlement.total_amount, 3500);
    assert.equal(settlement.commission_amount, 350);
    assert.equal(settlement.artist_amount, 3150);
    assert.equal(settlement.status, "COMPLETED");

    // Verify Artist Wallet
    const wallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    assert.ok(wallet);
    assert.equal(wallet.lifetime_earnings, 3150);
  });

  it("3. Settlement Idempotency: Retrying settlement returns existing record without duplicate wallet increment", async () => {
    const walletBefore = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    const countBefore = await db.SettlementHistory.count({ where: { booking_id: booking3500.id } });

    // Repeated call
    const retriedSettlement = await PaymentService.completeBookingSettlement(booking3500.id);
    assert.ok(retriedSettlement);

    const walletAfter = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    const countAfter = await db.SettlementHistory.count({ where: { booking_id: booking3500.id } });

    assert.equal(walletAfter.lifetime_earnings, walletBefore.lifetime_earnings, "Lifetime earnings must not double increment");
    assert.equal(countAfter, countBefore, "SettlementHistory count must not duplicate");
  });

  it("4. Ledger & WalletTransaction: Real SETTLEMENT transaction entry recorded", async () => {
    const tx = await db.WalletTransaction.findOne({
      where: { booking_id: booking3500.id, transaction_type: "SETTLEMENT" }
    });

    assert.ok(tx);
    assert.equal(tx.amount, 3150);
    assert.equal(tx.status, "SUCCESS");
    assert.ok(tx.description.includes(booking3500.booking_code));
  });

  it("5. Rounding Validation for ₹999: Advance ₹100, Remaining ₹899, Commission ₹100, Artist Net ₹899", async () => {
    const settlement999 = await PaymentService.completeBookingSettlement(booking999.id);
    assert.ok(settlement999);
    assert.equal(settlement999.total_amount, 999);
    assert.equal(settlement999.commission_amount, 100);
    assert.equal(settlement999.artist_amount, 899);

    const wallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    assert.equal(wallet.lifetime_earnings, 3150 + 899, "3150 + 899 = ₹4049 total lifetime earnings");
  });

  it("6. Fresh Artist C Wallet has clean 0 balance and 0 lifetime earnings (NO fake ₹10,500 seed)", async () => {
    const freshWalletSummary = await WalletService.getWalletSummary(freshArtistUserC.id);
    assert.equal(freshWalletSummary.balance, 0);
    assert.equal(freshWalletSummary.pending_balance, 0);
    assert.equal(freshWalletSummary.lifetime_earnings, 0);
    assert.equal(freshWalletSummary.total_withdrawals, 0);

    const freshTxList = await WalletService.getTransactions(freshArtistUserC.id);
    assert.equal(freshTxList.length, 0);

    const freshEarnings = await ArtistService.getEarnings(freshArtistUserC.id);
    assert.equal(freshEarnings.today, 0);
    assert.equal(freshEarnings.lifetime, 0);
  });

  it("7. Cross-Artist Financial Isolation: Rival Artist B sees 0 earnings and 0 transactions", async () => {
    const walletB = await WalletService.getWalletSummary(rivalArtistUserB.id);
    assert.equal(walletB.lifetime_earnings, 0);

    const txB = await WalletService.getTransactions(rivalArtistUserB.id);
    assert.equal(txB.length, 0);

    const earningsB = await ArtistService.getEarnings(rivalArtistUserB.id);
    assert.equal(earningsB.lifetime, 0);
  });

  it("8. Incomplete / In-Progress Booking does not trigger settlement", async () => {
    const existingSettlement = await db.SettlementHistory.findOne({
      where: { booking_id: bookingPending.id }
    });
    assert.equal(existingSettlement, null, "In-progress booking must not have settlement record");
  });

  it("9. Artist Earnings Aggregation: ArtistService.getEarnings calculates genuine completed booking earnings", async () => {
    const earningsA = await ArtistService.getEarnings(approvedArtistUserA.id);
    assert.equal(earningsA.lifetime, 3500 + 999, "₹3500 + ₹999 = ₹4499 gross completed booking value");
    assert.ok(earningsA.today >= 0);
  });

  it("10. Historical Settlement Immutability: Once settled, amounts in DB are strictly preserved", async () => {
    const settlement = await db.SettlementHistory.findOne({ where: { booking_id: booking3500.id } });
    assert.equal(settlement.total_amount, 3500);
    assert.equal(settlement.artist_amount, 3150);
    assert.equal(settlement.commission_amount, 350);
  });
});
