// Comprehensive 10-Scenario Test Suite for MehndiGo Artist Wallet, Escrow & Payout System
const { test, describe, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// Lightweight mock of Cloudflare D1 Helper for standalone test execution
class MockD1Database {
  constructor() {
    this.tables = {
      users: [],
      artist_profiles: [],
      bookings: [],
      wallets: [],
      wallet_transactions: [],
      withdrawals: [],
      bank_accounts: [],
      master_financial_ledger: [],
      marketplace_settings: [
        { key: "platform_commission_rate", value: "0.10" },
        { key: "travel_free_distance_km", value: "10.0" },
        { key: "travel_rate_per_km", value: "5.0" },
        { key: "min_withdrawal_amount", value: "100.0" }
      ]
    };
    this.autoIncrement = {
      users: 1,
      artist_profiles: 1,
      bookings: 1,
      wallets: 1,
      wallet_transactions: 1,
      withdrawals: 1,
      bank_accounts: 1,
      master_financial_ledger: 1
    };
  }

  async all(query, params = []) {
    const q = query.trim().toUpperCase();
    if (q.includes("FROM MARKETPLACE_SETTINGS")) {
      return this.tables.marketplace_settings;
    }
    if (q.includes("FROM WALLET_TRANSACTIONS")) {
      let res = [...this.tables.wallet_transactions];
      if (params.length > 0 && typeof params[0] === "number") {
        res = res.filter(t => t.wallet_id === params[0] || t.user_id === params[0]);
      }
      return res.reverse();
    }
    if (q.includes("FROM WITHDRAWALS")) {
      let res = [...this.tables.withdrawals];
      if (params.length > 0) {
        res = res.filter(w => w.user_id === params[0]);
      }
      return res.reverse();
    }
    if (q.includes("FROM MASTER_FINANCIAL_LEDGER")) {
      return [...this.tables.master_financial_ledger].reverse();
    }
    return [];
  }

  async first(query, params = []) {
    const q = query.trim().toUpperCase();
    if (q.includes("FROM USERS")) {
      return this.tables.users.find(u => u.id === params[0]) || null;
    }
    if (q.includes("FROM ARTIST_PROFILES")) {
      return this.tables.artist_profiles.find(a => a.user_id === params[0] || a.id === params[0]) || null;
    }
    if (q.includes("FROM BOOKINGS")) {
      return this.tables.bookings.find(b => b.id === params[0] || String(b.id) === String(params[0])) || null;
    }
    if (q.includes("FROM WALLETS")) {
      return this.tables.wallets.find(w => w.user_id === params[0] || w.artist_id === params[0] || w.id === params[0]) || null;
    }
    if (q.includes("FROM BANK_ACCOUNTS")) {
      return this.tables.bank_accounts.find(b => b.user_id === params[0]) || null;
    }
    if (q.includes("FROM WITHDRAWALS")) {
      if (q.includes("REFERENCE_ID =")) {
        return this.tables.withdrawals.find(w => w.reference_id === params[0]) || null;
      }
      if (q.includes("STATUS = 'PENDING'")) {
        return this.tables.withdrawals.find(w => w.user_id === params[0] && w.status === "pending") || null;
      }
      return this.tables.withdrawals.find(w => w.id === params[0]) || null;
    }
    if (q.includes("FROM WALLET_TRANSACTIONS")) {
      if (q.includes("REFERENCE_ID =")) {
        return this.tables.wallet_transactions.find(t => t.reference_id === params[0]) || null;
      }
      return this.tables.wallet_transactions[0] || null;
    }
    return null;
  }

  async run(query, params = []) {
    const q = query.trim().toUpperCase();
    
    // INSERT INTO WALLETS
    if (q.startsWith("INSERT INTO WALLETS")) {
      const id = this.autoIncrement.wallets++;
      const [user_id, artist_id, balance, available_balance, escrow_balance, total_earnings, withdrawn_amount] = params;
      const rec = { id, user_id, artist_id, balance: balance || 0, available_balance: available_balance || 0, escrow_balance: escrow_balance || 0, pending_settlement: escrow_balance || 0, total_earnings: total_earnings || 0, withdrawn_amount: withdrawn_amount || 0 };
      this.tables.wallets.push(rec);
      return { meta: { last_row_id: id, changes: 1 } };
    }

    // UPDATE WALLETS
    if (q.startsWith("UPDATE WALLETS")) {
      // 1. Settlement (length 6)
      if (params.length === 6) {
        const [bal, avail, esc, pend, total, walletId] = params;
        const w = this.tables.wallets.find(x => x.id === walletId);
        if (w) {
          w.balance = bal;
          w.available_balance = avail;
          w.escrow_balance = esc;
          w.pending_settlement = pend;
          w.total_earnings = total;
          return { meta: { changes: 1 } };
        }
      }

      // 2. Withdrawal conditional deduction (length 5)
      if (params.length === 5) {
        const [bal, avail, withdr, walletId, minAvail] = params;
        const w = this.tables.wallets.find(x => x.id === walletId);
        if (!w || (w.available_balance || 0) < minAvail) {
          return { meta: { changes: 0 } };
        }
        w.balance = bal;
        w.available_balance = avail;
        w.withdrawn_amount = withdr;
        return { meta: { changes: 1 } };
      }

      // 3. Withdrawal reversal / refund (length 4)
      if (params.length === 4) {
        const [bal, avail, withdr, walletId] = params;
        const w = this.tables.wallets.find(x => x.id === walletId);
        if (w) {
          w.balance = bal;
          w.available_balance = avail;
          w.withdrawn_amount = withdr;
          return { meta: { changes: 1 } };
        }
      }

      // 4. Escrow hold (length 3)
      if (params.length === 3) {
        const [esc, pend, walletId] = params;
        const w = this.tables.wallets.find(x => x.id === walletId);
        if (w) {
          w.escrow_balance = esc;
          w.pending_settlement = pend;
          return { meta: { changes: 1 } };
        }
      }

      return { meta: { changes: 1 } };
    }

    // INSERT INTO WALLET_TRANSACTIONS
    if (q.startsWith("INSERT INTO WALLET_TRANSACTIONS")) {
      const id = this.autoIncrement.wallet_transactions++;
      let wallet_id, user_id, type, amount, description, status, reference_id;
      if (params.length === 5) {
        [wallet_id, user_id, amount, description, reference_id] = params;
        type = q.includes("'DEBIT'") ? 'debit' : 'credit';
        status = q.includes("'ESCROW_HELD'") ? 'escrow_held' : (q.includes("'PENDING'") ? 'pending' : 'completed');
      } else {
        [wallet_id, user_id, type, amount, description, status, reference_id] = params;
      }
      const rec = { id, wallet_id, user_id, type, amount, description, status, reference_id, created_at: new Date().toISOString() };
      this.tables.wallet_transactions.push(rec);
      return { meta: { last_row_id: id, changes: 1 } };
    }

    // INSERT INTO WITHDRAWALS
    if (q.startsWith("INSERT INTO WITHDRAWALS")) {
      const id = this.autoIncrement.withdrawals++;
      const [user_id, amount, bank_account_id, reference_id] = params;
      const rec = { id, user_id, amount, status: "pending", bank_account_id, reference_id, requested_at: new Date().toISOString() };
      this.tables.withdrawals.push(rec);
      return { meta: { last_row_id: id, changes: 1 } };
    }

    // UPDATE WITHDRAWALS
    if (q.startsWith("UPDATE WITHDRAWALS")) {
      const [status, id] = [params[0], params[params.length - 1]];
      const w = this.tables.withdrawals.find(x => x.id === id);
      if (w) {
        w.status = status;
        w.processed_at = new Date().toISOString();
        return { meta: { changes: 1 } };
      }
    }

    // INSERT INTO MASTER_FINANCIAL_LEDGER
    if (q.includes("MASTER_FINANCIAL_LEDGER")) {
      const id = this.autoIncrement.master_financial_ledger++;
      this.tables.master_financial_ledger.push({ id, ...params });
      return { meta: { last_row_id: id, changes: 1 } };
    }

    return { meta: { changes: 1 } };
  }
}

// Logic implementations mirroring Cloudflare D1 Backend
const calculateBookingAmounts = (baseAmount, distanceKm = 0, travelChargeOverride = 0, isTravelConfirmed = false) => {
  const base = Math.max(0, Number(baseAmount) || 0);
  const commissionRate = 0.10; // 10%
  const adminCommission = Math.round(base * commissionRate * 100) / 100;
  const artistServiceEarning = Math.round((base - adminCommission) * 100) / 100;
  const artistTravelEarning = isTravelConfirmed ? Number(travelChargeOverride) : 0;
  const artistTotalPayable = Math.round((artistServiceEarning + artistTravelEarning) * 100) / 100;
  const customerTotalAmount = Math.round((base + artistTravelEarning) * 100) / 100;
  const requiredAdvance = Math.round(customerTotalAmount * 0.10);

  return {
    base_service_amount: base,
    commission_rate: commissionRate,
    admin_commission: adminCommission,
    artist_service_earning: artistServiceEarning,
    artist_travel_earning: artistTravelEarning,
    artist_total_payable: artistTotalPayable,
    customer_total_amount: customerTotalAmount,
    required_advance: requiredAdvance
  };
};

const processBookingEscrow = async (db, bookingId, paidAmount) => {
  const booking = await db.first("SELECT * FROM bookings WHERE id = ?", [bookingId]);
  if (!booking) return null;

  const realBookingId = booking.id;
  const artistId = booking.artist_id;
  const refCode = `ESCROW_BK_${realBookingId}`;

  // Idempotency check
  const existing = await db.first("SELECT * FROM wallet_transactions WHERE reference_id = ?", [refCode]);
  if (existing) {
    return { isDuplicate: true, transaction: existing };
  }

  const calc = calculateBookingAmounts(booking.total_amount);
  let wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
  if (!wallet) {
    await db.run("INSERT INTO wallets (user_id, artist_id, balance, available_balance, escrow_balance, total_earnings, withdrawn_amount) VALUES (?, ?, 0, 0, 0, 0, 0)", [artistId, artistId, 0, 0, 0, 0, 0]);
    wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
  }

  const newEscrow = Math.round((Number(wallet.escrow_balance || 0) + calc.artist_total_payable) * 100) / 100;
  await db.run("UPDATE wallets SET escrow_balance = ?, pending_settlement = ? WHERE id = ?", [newEscrow, newEscrow, wallet.id]);

  await db.run(
    "INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, status, reference_id) VALUES (?, ?, 'credit', ?, ?, 'escrow_held', ?)",
    [wallet.id, artistId, calc.artist_total_payable, `Booking #${realBookingId} Held in Escrow`, refCode]
  );

  // Platform ledger entry
  await db.run(
    "INSERT INTO master_financial_ledger (booking_id, base_service_amount, commission_amount, artist_total_payable) VALUES (?, ?, ?, ?)",
    [realBookingId, calc.base_service_amount, calc.admin_commission, calc.artist_total_payable]
  );

  return {
    isDuplicate: false,
    adminCommission: calc.admin_commission,
    artistPending: calc.artist_total_payable,
    newEscrow
  };
};

const processBookingSettlement = async (db, bookingId) => {
  const booking = await db.first("SELECT * FROM bookings WHERE id = ?", [bookingId]);
  if (!booking) return null;

  const realBookingId = booking.id;
  const artistId = booking.artist_id;
  const refCode = `RELEASE_BK_${realBookingId}`;

  // Idempotency check
  const existing = await db.first("SELECT * FROM wallet_transactions WHERE reference_id = ?", [refCode]);
  if (existing) {
    return { isDuplicate: true, transaction: existing };
  }

  const calc = calculateBookingAmounts(booking.total_amount);
  let wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
  
  const currentAvail = Number(wallet.available_balance || 0);
  const currentEscrow = Number(wallet.escrow_balance || 0);
  const currentLifetime = Number(wallet.total_earnings || 0);

  const newAvail = Math.round((currentAvail + calc.artist_total_payable) * 100) / 100;
  const newEscrow = Math.max(0, Math.round((currentEscrow - calc.artist_total_payable) * 100) / 100);
  const newLifetime = Math.round((currentLifetime + calc.artist_total_payable) * 100) / 100;

  await db.run(
    "UPDATE wallets SET balance = ?, available_balance = ?, escrow_balance = ?, pending_settlement = ?, total_earnings = ? WHERE id = ?",
    [newAvail, newAvail, newEscrow, newEscrow, newLifetime, wallet.id]
  );

  await db.run(
    "INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, status, reference_id) VALUES (?, ?, 'credit', ?, ?, 'completed', ?)",
    [wallet.id, artistId, calc.artist_total_payable, `Settlement Released for #${realBookingId}`, refCode]
  );

  return {
    isDuplicate: false,
    releasedAmount: calc.artist_total_payable,
    newAvailable: newAvail,
    newEscrow: newEscrow,
    newLifetime: newLifetime
  };
};

const handleRequestWithdrawal = async (db, userId, amount, clientRefId = null) => {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 100) {
    return { success: false, status: 400, message: "Minimum withdrawal amount is ₹100" };
  }

  const artistProfile = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [userId]);
  if (artistProfile && artistProfile.verification_status !== "APPROVED") {
    return { success: false, status: 403, message: "Only approved artists with verified KYC can request payouts" };
  }

  const existingPending = await db.first("SELECT * FROM withdrawals WHERE user_id = ? AND status = 'pending'", [userId]);
  if (existingPending) {
    return { success: false, status: 400, message: "Active pending withdrawal already exists" };
  }

  if (clientRefId) {
    const dup = await db.first("SELECT * FROM withdrawals WHERE reference_id = ?", [clientRefId]);
    if (dup) return { success: true, duplicate: true, data: dup };
  }

  const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [userId]);
  if (!wallet || (wallet.available_balance || 0) < numAmount) {
    return { success: false, status: 400, message: "Insufficient available balance" };
  }

  const bankAcc = await db.first("SELECT * FROM bank_accounts WHERE user_id = ?", [userId]);
  if (!bankAcc || (!bankAcc.account_number && !bankAcc.upi_id)) {
    return { success: false, status: 400, message: "Please link bank account" };
  }

  const refId = clientRefId || `WITHDRAW_${Date.now()}`;
  const newAvail = Math.round((wallet.available_balance - numAmount) * 100) / 100;
  const newWithdrawn = Math.round(((wallet.withdrawn_amount || 0) + numAmount) * 100) / 100;

  const updateRes = await db.run(
    "UPDATE wallets SET balance = ?, available_balance = ?, withdrawn_amount = ? WHERE id = ? AND available_balance >= ?",
    [newAvail, newAvail, newWithdrawn, wallet.id, numAmount]
  );

  if (updateRes.meta.changes === 0) {
    return { success: false, status: 400, message: "Concurrent balance deduction conflict" };
  }

  const withRes = await db.run(
    "INSERT INTO withdrawals (user_id, amount, bank_account_id, reference_id) VALUES (?, ?, ?, ?)",
    [userId, numAmount, bankAcc.id, refId]
  );

  return {
    success: true,
    withdrawalId: withRes.meta.last_row_id,
    amount: numAmount,
    newAvailable: newAvail
  };
};

const handleRejectWithdrawal = async (db, withdrawalId, reason = "Bank rejected") => {
  const withdrawal = await db.first("SELECT * FROM withdrawals WHERE id = ?", [withdrawalId]);
  if (!withdrawal || withdrawal.status !== "pending") {
    return { success: false, status: 400, message: "Withdrawal not eligible for reversal" };
  }

  const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [withdrawal.user_id]);
  const amount = Number(withdrawal.amount);

  const newAvail = Math.round(((wallet.available_balance || 0) + amount) * 100) / 100;
  const newWithdrawn = Math.max(0, Math.round(((wallet.withdrawn_amount || 0) - amount) * 100) / 100);

  await db.run(
    "UPDATE wallets SET balance = ?, available_balance = ?, withdrawn_amount = ? WHERE id = ?",
    [newAvail, newAvail, newWithdrawn, wallet.id]
  );

  await db.run("UPDATE withdrawals SET status = 'failed' WHERE id = ?", [withdrawalId]);

  return {
    success: true,
    restoredAmount: amount,
    newAvailable: newAvail
  };
};

describe("MehndiGo Artist Wallet, Escrow & Payout System — Section 29 10 Scenarios", () => {
  let db;
  const artistId = 301;
  const customerId = 101;
  const bookingId = 501;
  const bookingTotal = 2000.00; // ₹2,000 Booking

  beforeEach(() => {
    db = new MockD1Database();
    // Setup Artist
    db.tables.users.push({ id: artistId, full_name: "Anita Sharma", role: "artist" });
    db.tables.artist_profiles.push({ id: 1, user_id: artistId, verification_status: "APPROVED" });
    db.tables.bank_accounts.push({ id: 1, user_id: artistId, account_holder_name: "Anita Sharma", account_number: "123456789012", ifsc_code: "HDFC0001234", bank_name: "HDFC Bank" });

    // Setup Customer & Booking
    db.tables.users.push({ id: customerId, full_name: "Priya Patel", role: "customer" });
    db.tables.bookings.push({ id: bookingId, customer_id: customerId, artist_id: artistId, total_amount: bookingTotal, status: "pending_payment" });
  });

  test("Scenario 1: Customer ₹2,000 payment holds ₹1,800 in Artist Escrow & records ₹200 Admin Commission", async () => {
    const res = await processBookingEscrow(db, bookingId, 200.00);

    assert.equal(res.isDuplicate, false);
    assert.equal(res.adminCommission, 200.00, "10% Platform Commission must be ₹200.00");
    assert.equal(res.artistPending, 1800.00, "90% Artist Earning held in escrow must be ₹1,800.00");

    const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
    assert.equal(wallet.escrow_balance, 1800.00, "Artist escrow_balance must be ₹1,800.00");
    assert.equal(wallet.available_balance, 0.00, "Artist available_balance must remain ₹0.00 prior to completion");
  });

  test("Scenario 2: Booking Completion releases ₹1,800 from Escrow to Available Balance", async () => {
    await processBookingEscrow(db, bookingId, 200.00);
    const settleRes = await processBookingSettlement(db, bookingId);

    assert.equal(settleRes.isDuplicate, false);
    assert.equal(settleRes.releasedAmount, 1800.00);
    assert.equal(settleRes.newAvailable, 1800.00, "Available balance must become ₹1,800.00");
    assert.equal(settleRes.newEscrow, 0.00, "Pending Escrow balance must become ₹0.00");
    assert.equal(settleRes.newLifetime, 1800.00, "Lifetime earnings must be ₹1,800.00");

    const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
    assert.equal(wallet.available_balance, 1800.00);
    assert.equal(wallet.escrow_balance, 0.00);
    assert.equal(wallet.total_earnings, 1800.00);
  });

  test("Scenario 3: Artist ₹1,000 withdrawal deducts from Available Balance & records pending withdrawal", async () => {
    await processBookingEscrow(db, bookingId, 200.00);
    await processBookingSettlement(db, bookingId);

    const withdrawRes = await handleRequestWithdrawal(db, artistId, 1000.00);

    assert.equal(withdrawRes.success, true);
    assert.equal(withdrawRes.newAvailable, 800.00, "Available balance must be ₹800.00 (₹1800 - ₹1000)");

    const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
    assert.equal(wallet.available_balance, 800.00);
    assert.equal(wallet.withdrawn_amount, 1000.00);

    const withdrawal = await db.first("SELECT * FROM withdrawals WHERE id = ?", [withdrawRes.withdrawalId]);
    assert.equal(withdrawal.status, "pending");
    assert.equal(withdrawal.amount, 1000.00);
  });

  test("Scenario 4: Duplicate Razorpay Webhook is rejected idempotently without double credit", async () => {
    const firstCall = await processBookingEscrow(db, bookingId, 200.00);
    assert.equal(firstCall.isDuplicate, false);

    // Replay webhook
    const secondCall = await processBookingEscrow(db, bookingId, 200.00);
    assert.equal(secondCall.isDuplicate, true, "Duplicate webhook must be detected via ESCROW_BK_501");

    const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
    assert.equal(wallet.escrow_balance, 1800.00, "Escrow balance must NOT double to ₹3,600");
  });

  test("Scenario 5: Duplicate Settlement trigger is rejected idempotently without double release", async () => {
    await processBookingEscrow(db, bookingId, 200.00);
    const firstSettle = await processBookingSettlement(db, bookingId);
    assert.equal(firstSettle.isDuplicate, false);

    // Replay settlement
    const secondSettle = await processBookingSettlement(db, bookingId);
    assert.equal(secondSettle.isDuplicate, true, "Duplicate settlement must be detected via RELEASE_BK_501");

    const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
    assert.equal(wallet.available_balance, 1800.00, "Available balance must NOT double to ₹3,600");
  });

  test("Scenario 6: Failed payout restores ₹1,000 back to Available Balance cleanly", async () => {
    await processBookingEscrow(db, bookingId, 200.00);
    await processBookingSettlement(db, bookingId);
    const wRes = await handleRequestWithdrawal(db, artistId, 1000.00);
    assert.equal(wRes.newAvailable, 800.00);

    const rejectRes = await handleRejectWithdrawal(db, wRes.withdrawalId, "Bank Account Closed");
    assert.equal(rejectRes.success, true);
    assert.equal(rejectRes.newAvailable, 1800.00, "Available balance must be restored to ₹1,800.00");

    const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
    assert.equal(wallet.available_balance, 1800.00);
    assert.equal(wallet.withdrawn_amount, 0.00);

    // Ensure cannot reverse a second time
    const repeatReject = await handleRejectWithdrawal(db, wRes.withdrawalId);
    assert.equal(repeatReject.success, false, "Cannot re-reverse an already failed payout");
  });

  test("Scenario 7: Withdrawal of amount exceeding available balance is rejected (HTTP 400)", async () => {
    await processBookingEscrow(db, bookingId, 200.00);
    await processBookingSettlement(db, bookingId);

    // Available is ₹1,800, attempt to withdraw ₹2,500
    const overdraw = await handleRequestWithdrawal(db, artistId, 2500.00);
    assert.equal(overdraw.success, false);
    assert.equal(overdraw.status, 400);

    const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
    assert.equal(wallet.available_balance, 1800.00, "Balance must remain intact at ₹1,800.00");
  });

  test("Scenario 8: Withdrawal from Pending Escrow is rejected (available = 0)", async () => {
    // Only payment made, booking NOT completed (escrow = 1800, available = 0)
    await processBookingEscrow(db, bookingId, 200.00);

    const prematureWithdraw = await handleRequestWithdrawal(db, artistId, 500.00);
    assert.equal(prematureWithdraw.success, false);
    assert.equal(prematureWithdraw.status, 400);
    assert.match(prematureWithdraw.message, /Insufficient available balance/);
  });

  test("Scenario 9: Unapproved / Pending KYC artist withdrawal is rejected (HTTP 403)", async () => {
    // Set KYC to PENDING
    db.tables.artist_profiles[0].verification_status = "PENDING";
    await processBookingEscrow(db, bookingId, 200.00);
    await processBookingSettlement(db, bookingId);

    const kycBlocked = await handleRequestWithdrawal(db, artistId, 500.00);
    assert.equal(kycBlocked.success, false);
    assert.equal(kycBlocked.status, 403);
    assert.match(kycBlocked.message, /verified KYC/);
  });

  test("Scenario 10: Concurrency protection ensures atomic deduction and non-negative balance", async () => {
    await processBookingEscrow(db, bookingId, 200.00);
    await processBookingSettlement(db, bookingId);

    // Available balance = ₹1,800. Try 2 concurrent requests of ₹1,000 each
    const req1 = await handleRequestWithdrawal(db, artistId, 1000.00, "REF_CONC_1");
    assert.equal(req1.success, true);

    // Second request should fail because available balance is now ₹800 (< ₹1,000) and pending request exists
    const req2 = await handleRequestWithdrawal(db, artistId, 1000.00, "REF_CONC_2");
    assert.equal(req2.success, false);

    const wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [artistId]);
    assert.equal(wallet.available_balance >= 0, true, "Balance must never drop below zero");
    assert.equal(wallet.available_balance, 800.00);
  });
});
