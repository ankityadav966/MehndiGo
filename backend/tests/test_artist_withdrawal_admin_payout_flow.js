"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const WalletService = require("../services/wallet.services");
const AdminService = require("../services/admin.services");

describe("ARTIST MODULE 11: WITHDRAWALS + ADMIN APPROVAL + PAYOUT LIFECYCLE INTEGRATION SUITE", () => {
  let adminUser;
  let approvedArtistUserA, approvedArtistProfileA;
  let rivalArtistUserB, rivalArtistProfileB;
  let freshArtistUserC, freshArtistProfileC;
  let pendingArtistUserD, pendingArtistProfileD;
  let withdrawal1, withdrawal2;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Admin User
    adminUser = await db.User.create({
      name: "Super Admin",
      email: "admin@mehndigo.in",
      phone: "9999999999",
      phone_number: "9999999999",
      role: "ADMIN",
      is_verified: true
    });

    // 2. Approved Artist A (Has ₹10,000 available balance and verified bank details)
    approvedArtistUserA = await db.User.create({
      name: "Pooja Artist A",
      email: "pooja@withdraw.com",
      phone: "9876543270",
      phone_number: "9876543270",
      role: "ARTIST",
      is_verified: true
    });
    approvedArtistProfileA = await db.ArtistProfile.create({
      user_id: approvedArtistUserA.id,
      bio: "Bridal Henna Master",
      experience_years: 8,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });
    await db.BankAccount.create({
      user_id: approvedArtistUserA.id,
      account_holder_name: "Pooja Sharma",
      bank_name: "HDFC Bank",
      account_number: "50100234567890",
      ifsc_code: "HDFC0001234",
      upi_id: "pooja@okhdfcbank"
    });
    await db.Wallet.create({
      user_id: approvedArtistUserA.id,
      balance: 10000,
      pending_balance: 0,
      lifetime_earnings: 10000,
      total_withdrawals: 0
    });

    // 3. Rival Artist B
    rivalArtistUserB = await db.User.create({
      name: "Rival Artist B",
      email: "rivalb@withdraw.com",
      phone: "9876543271",
      phone_number: "9876543271",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtistProfileB = await db.ArtistProfile.create({
      user_id: rivalArtistUserB.id,
      bio: "Rival Artist",
      experience_years: 3,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });
    await db.BankAccount.create({
      user_id: rivalArtistUserB.id,
      account_holder_name: "Rival Artist",
      bank_name: "ICICI Bank",
      account_number: "000101567890",
      ifsc_code: "ICIC0000001",
      upi_id: "rival@okaxis"
    });
    await db.Wallet.create({
      user_id: rivalArtistUserB.id,
      balance: 5000,
      pending_balance: 0,
      lifetime_earnings: 5000,
      total_withdrawals: 0
    });

    // 4. Fresh Artist C (0 balance)
    freshArtistUserC = await db.User.create({
      name: "Fresh Artist C",
      email: "freshc@withdraw.com",
      phone: "9876543272",
      phone_number: "9876543272",
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
    await db.Wallet.create({
      user_id: freshArtistUserC.id,
      balance: 0,
      pending_balance: 0,
      lifetime_earnings: 0,
      total_withdrawals: 0
    });

    // 5. Unapproved / PENDING KYC Artist D (Has bank details but PENDING KYC)
    pendingArtistUserD = await db.User.create({
      name: "Pending Artist D",
      email: "pendingd@withdraw.com",
      phone: "9876543273",
      phone_number: "9876543273",
      role: "ARTIST",
      is_verified: false
    });
    pendingArtistProfileD = await db.ArtistProfile.create({
      user_id: pendingArtistUserD.id,
      bio: "Unapproved Artist",
      experience_years: 1,
      verification_status: "PENDING",
      is_available: false,
      city: "Jaipur"
    });
    await db.BankAccount.create({
      user_id: pendingArtistUserD.id,
      account_holder_name: "Pending Artist",
      bank_name: "SBI Bank",
      account_number: "20100234567890",
      ifsc_code: "SBIN0001234",
      upi_id: "pending@oksbi"
    });
    await db.Wallet.create({
      user_id: pendingArtistUserD.id,
      balance: 5000,
      pending_balance: 0,
      lifetime_earnings: 5000,
      total_withdrawals: 0
    });
  });

  it("1. Eligibility: Unapproved/Pending KYC artist cannot request withdrawal (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await WalletService.initiateWithdrawal(pendingArtistUserD.id, 500);
      },
      (err) => err.statusCode === 403 || err.message.includes("Only approved artists")
    );
  });

  it("2. Eligibility: Artist with missing bank/UPI details cannot request withdrawal (400 Bad Request)", async () => {
    // Artist C has no bank account record
    await assert.rejects(
      async () => {
        await WalletService.initiateWithdrawal(freshArtistUserC.id, 500);
      },
      (err) => err.statusCode === 400 && err.message.includes("bank account")
    );
  });

  it("3. Minimum Amount Rule: Requesting less than ₹100 is rejected (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await WalletService.initiateWithdrawal(approvedArtistUserA.id, 50);
      },
      (err) => err.statusCode === 400 && err.message.includes("Minimum withdrawal amount is ₹100")
    );
  });

  it("4. Available Balance Gate: Requesting more than available balance is rejected (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await WalletService.initiateWithdrawal(approvedArtistUserA.id, 15000);
      },
      (err) => err.statusCode === 400 && err.message.includes("enough available balance")
    );
  });

  it("5. Withdrawal Creation & Fund Reservation: Artist requests ₹4,000 -> Available ₹6,000, Pending ₹4,000", async () => {
    withdrawal1 = await WalletService.initiateWithdrawal(approvedArtistUserA.id, 4000);
    assert.ok(withdrawal1);
    assert.equal(withdrawal1.amount, 4000);
    assert.equal(withdrawal1.status, "PENDING");

    const wallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    assert.equal(wallet.balance, 6000, "₹10,000 - ₹4,000 = ₹6,000 available");
    assert.equal(wallet.pending_balance, 4000, "₹4,000 held in pending_balance");

    const tx = await db.WalletTransaction.findOne({
      where: { wallet_id: wallet.id, transaction_type: "WITHDRAWAL", status: "PENDING" }
    });
    assert.ok(tx);
    assert.equal(tx.amount, 4000);
  });

  it("6. Duplicate Withdrawal Guard: Concurrent withdrawal request while pending is blocked (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await WalletService.initiateWithdrawal(approvedArtistUserA.id, 2000);
      },
      (err) => err.statusCode === 400 && err.message.includes("already have a pending withdrawal request")
    );
  });

  it("7. Admin Visibility: Admin fetches withdrawal queue with artist & bank account details", async () => {
    const queue = await AdminService.getAllWithdrawals();
    assert.ok(queue.length >= 1);
    const item = queue.find((q) => q.id === withdrawal1.id);
    assert.ok(item);
    assert.equal(item.amount, 4000);
    assert.equal(item.status, "PENDING");
    assert.ok(item.bank_account);
    assert.equal(item.bank_account.bank_name, "HDFC Bank");
  });

  it("8. Admin Approval & Payout Settlement: Admin approves WR-1 -> Status COMPLETED, pending cleared, total_withdrawals +₹4,000", async () => {
    const approved = await AdminService.approveWithdrawal(withdrawal1.id);
    assert.ok(approved);
    assert.equal(approved.status, "COMPLETED");

    const wallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    assert.equal(wallet.balance, 6000, "Available balance remains ₹6,000");
    assert.equal(wallet.pending_balance, 0, "Pending balance cleared from ₹4,000 to 0");
    assert.equal(wallet.total_withdrawals, 4000, "Total withdrawals incremented to ₹4,000");

    const tx = await db.WalletTransaction.findOne({
      where: { wallet_id: wallet.id, transaction_type: "WITHDRAWAL", status: "SUCCESS" }
    });
    assert.ok(tx);
    assert.equal(tx.status, "SUCCESS");
  });

  it("9. Terminal State Protection: Cannot re-approve an already COMPLETED withdrawal (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await AdminService.approveWithdrawal(withdrawal1.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("already in 'COMPLETED' status")
    );
  });

  it("10. Admin Rejection Flow: Artist requests ₹2,000, Admin rejects with reason -> Funds safely restored to available balance", async () => {
    withdrawal2 = await WalletService.initiateWithdrawal(approvedArtistUserA.id, 2000);
    assert.ok(withdrawal2);

    let wallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    assert.equal(wallet.balance, 4000, "₹6,000 - ₹2,000 = ₹4,000");
    assert.equal(wallet.pending_balance, 2000);

    const rejected = await AdminService.rejectWithdrawal(withdrawal2.id, "Incorrect IFSC Code");
    assert.ok(rejected);
    assert.equal(rejected.status, "REJECTED");
    assert.equal(rejected.rejection_reason, "Incorrect IFSC Code");

    wallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    assert.equal(wallet.balance, 6000, "₹4,000 + ₹2,000 = ₹6,000 safely restored");
    assert.equal(wallet.pending_balance, 0, "Pending balance restored to 0");
  });

  it("11. Terminal State Protection: Cannot approve an already REJECTED withdrawal (400 Bad Request)", async () => {
    await assert.rejects(
      async () => {
        await AdminService.approveWithdrawal(withdrawal2.id);
      },
      (err) => err.statusCode === 400 && err.message.includes("already in 'REJECTED' status")
    );
  });

  it("12. Artist Cancellation Flow: Artist requests ₹1,000 and self-cancels -> Funds restored to available balance", async () => {
    const withdrawal3 = await WalletService.initiateWithdrawal(approvedArtistUserA.id, 1000);
    assert.ok(withdrawal3);

    let wallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    assert.equal(wallet.balance, 5000);
    assert.equal(wallet.pending_balance, 1000);

    const cancelled = await WalletService.cancelWithdrawal(approvedArtistUserA.id, withdrawal3.id);
    assert.ok(cancelled);
    assert.equal(cancelled.status, "CANCELLED");

    wallet = await db.Wallet.findOne({ where: { user_id: approvedArtistUserA.id } });
    assert.equal(wallet.balance, 6000, "Funds restored back to ₹6,000");
    assert.equal(wallet.pending_balance, 0);
  });

  it("13. Cross-Artist Isolation: Rival Artist B cannot cancel Artist A's withdrawal (403 Forbidden)", async () => {
    const withdrawal4 = await WalletService.initiateWithdrawal(approvedArtistUserA.id, 1000);
    assert.ok(withdrawal4);

    await assert.rejects(
      async () => {
        await WalletService.cancelWithdrawal(rivalArtistUserB.id, withdrawal4.id);
      },
      (err) => err.statusCode === 403 || err.message.includes("Unauthorized")
    );

    // Clean up
    await WalletService.cancelWithdrawal(approvedArtistUserA.id, withdrawal4.id);
  });

  it("14. Withdrawal History Isolation: Artist A sees only their requests; Rival Artist B sees 0", async () => {
    const historyA = await WalletService.getWithdrawHistory(approvedArtistUserA.id);
    assert.ok(historyA.length >= 2);

    const historyB = await WalletService.getWithdrawHistory(rivalArtistUserB.id);
    assert.equal(historyB.length, 0);
  });

  it("15. Zero Dummy Financial Data: Fresh Artist C has 0 available balance and empty history", async () => {
    const summaryC = await WalletService.getWalletSummary(freshArtistUserC.id);
    assert.equal(summaryC.balance, 0);
    assert.equal(summaryC.pending_balance, 0);
    assert.equal(summaryC.withdrawable_balance, 0);

    const historyC = await WalletService.getWithdrawHistory(freshArtistUserC.id);
    assert.equal(historyC.length, 0);
  });
});
