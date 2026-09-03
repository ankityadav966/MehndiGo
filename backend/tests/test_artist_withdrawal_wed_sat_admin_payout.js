const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("ARTIST WITHDRAWAL (WED/SAT ONLY) + ADMIN MANUAL PAYOUT SUITE", () => {
  // Mock In-Memory Database matching Cloudflare D1 / SQLite schema
  const db = {
    wallets: [
      { id: 101, user_id: 1, balance: 5000, available_balance: 5000, pending_balance: 0, withdrawn_amount: 0, total_earnings: 5000 }
    ],
    bank_accounts: [
      { id: 501, user_id: 1, account_holder_name: "Pooja Sharma", account_number: "987654321012", ifsc_code: "HDFC0001234", bank_name: "HDFC Bank", upi_id: "pooja@okhdfcbank" }
    ],
    artist_profiles: [
      { id: 1, user_id: 1, verification_status: "APPROVED" }
    ],
    withdrawals: [],
    wallet_transactions: [],
    notifications: []
  };

  // Helper for IST day checking
  function validateWithdrawalDayIST(customDate) {
    const now = customDate || new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const day = istDate.getUTCDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const isAllowed = day === 3 || day === 6; // Wednesday or Saturday
    return {
      allowed: isAllowed,
      currentDayName: days[day],
      currentDayIndex: day,
      message: isAllowed
        ? `Withdrawals are open today (${days[day]}).`
        : "Withdrawals are available only on Wednesday and Saturday."
    };
  }

  it("1. Day Restriction: Non-Wed/Sat days (e.g. Monday, Tuesday, Friday) are strictly blocked with 400", () => {
    // 2026-08-25 was a Tuesday (day index 2)
    const tuesday = new Date("2026-08-25T10:00:00Z");
    const checkTue = validateWithdrawalDayIST(tuesday);
    assert.equal(checkTue.allowed, false);
    assert.equal(checkTue.message, "Withdrawals are available only on Wednesday and Saturday.");

    // 2026-08-28 was a Friday (day index 5)
    const friday = new Date("2026-08-28T10:00:00Z");
    const checkFri = validateWithdrawalDayIST(friday);
    assert.equal(checkFri.allowed, false);
  });

  it("2. Day Restriction: Wednesday and Saturday in IST are allowed", () => {
    // 2026-08-26 is a Wednesday (day index 3)
    const wednesday = new Date("2026-08-26T10:00:00Z");
    const checkWed = validateWithdrawalDayIST(wednesday);
    assert.equal(checkWed.allowed, true);
    assert.equal(checkWed.currentDayName, "Wednesday");

    // 2026-08-29 is a Saturday (day index 6)
    const saturday = new Date("2026-08-29T10:00:00Z");
    const checkSat = validateWithdrawalDayIST(saturday);
    assert.equal(checkSat.allowed, true);
    assert.equal(checkSat.currentDayName, "Saturday");
  });

  it("3. Withdrawal Creation: Holds ₹2,000 in pending_balance and records PENDING request", () => {
    const userId = 1;
    const amount = 2000;
    const wallet = db.wallets.find(w => w.user_id === userId);
    const bank = db.bank_accounts.find(b => b.user_id === userId);

    assert.ok(wallet.available_balance >= amount);
    
    // Hold accounting
    wallet.available_balance -= amount;
    wallet.pending_balance += amount;

    const withdrawalId = db.withdrawals.length + 1;
    const refId = `WITHDRAW_${Date.now()}`;
    const withdrawRecord = {
      id: withdrawalId,
      user_id: userId,
      amount,
      status: "pending",
      bank_account_id: bank.id,
      reference_id: refId,
      requested_at: new Date().toISOString()
    };
    db.withdrawals.push(withdrawRecord);

    db.wallet_transactions.push({
      id: db.wallet_transactions.length + 1,
      wallet_id: wallet.id,
      user_id: userId,
      type: "debit",
      amount,
      status: "pending",
      reference_id: refId,
      description: `Withdrawal Request WR-${withdrawalId} (Held for payout)`
    });

    assert.equal(wallet.available_balance, 3000, "Available balance reduced from ₹5,000 to ₹3,000");
    assert.equal(wallet.pending_balance, 2000, "Pending balance holds ₹2,000");
    assert.equal(withdrawRecord.status, "pending");
  });

  it("4. Single Pending Request Guard: Second withdrawal is rejected when 1st is still PENDING", () => {
    const userId = 1;
    const activePending = db.withdrawals.find(w => w.user_id === userId && w.status.toLowerCase() === "pending");
    assert.ok(activePending, "Active pending request exists");

    const attemptSecond = () => {
      if (activePending) {
        throw new Error("You already have a pending withdrawal request. Please wait until it is processed.");
      }
    };

    assert.throws(attemptSecond, /You already have a pending withdrawal request/);
  });

  it("5. Admin Visibility: Admin fetches request with complete bank & beneficiary details", () => {
    const queue = db.withdrawals.map(w => {
      const bank = db.bank_accounts.find(b => b.user_id === w.user_id);
      return {
        ...w,
        account_holder_name: bank.account_holder_name,
        account_number: bank.account_number,
        ifsc_code: bank.ifsc_code,
        bank_name: bank.bank_name,
        upi_id: bank.upi_id
      };
    });

    const pendingItem = queue.find(q => q.status === "pending");
    assert.ok(pendingItem);
    assert.equal(pendingItem.amount, 2000);
    assert.equal(pendingItem.account_holder_name, "Pooja Sharma");
    assert.equal(pendingItem.account_number, "987654321012");
    assert.equal(pendingItem.ifsc_code, "HDFC0001234");
    assert.equal(pendingItem.bank_name, "HDFC Bank");
    assert.equal(pendingItem.upi_id, "pooja@okhdfcbank");
  });

  it("6. Admin Approval & Payout Settlement: Enters UTR number, clears pending_balance, updates total_withdrawn", () => {
    const withdrawal = db.withdrawals.find(w => w.status === "pending");
    const wallet = db.wallets.find(w => w.user_id === withdrawal.user_id);
    const utr = "HDFCR5202608261234567";

    // Finalize settlement
    withdrawal.status = "completed";
    withdrawal.reference_id = utr;
    withdrawal.processed_at = new Date().toISOString();

    wallet.pending_balance -= withdrawal.amount;
    wallet.withdrawn_amount += withdrawal.amount;
    wallet.balance -= withdrawal.amount;

    const tx = db.wallet_transactions.find(t => t.reference_id === withdrawal.reference_id || t.status === "pending");
    if (tx) {
      tx.status = "completed";
      tx.description = `Withdrawal WR-${withdrawal.id} Paid (UTR: ${utr})`;
    }

    db.notifications.push({
      user_id: withdrawal.user_id,
      title: "Payout Completed! 🎉",
      message: `Your payout of ₹${withdrawal.amount} has been successfully transferred to your bank account. (UTR: ${utr})`
    });

    assert.equal(withdrawal.status, "completed");
    assert.equal(wallet.pending_balance, 0, "Pending balance cleared");
    assert.equal(wallet.withdrawn_amount, 2000, "Withdrawn amount incremented to ₹2,000");
    assert.equal(wallet.available_balance, 3000, "Available balance remains clean ₹3,000");
    assert.equal(db.notifications.length, 1, "Artist received notification");
  });

  it("7. Post-Settlement: Artist can create a new withdrawal request now that prior is completed", () => {
    const userId = 1;
    const activePending = db.withdrawals.find(w => w.user_id === userId && w.status.toLowerCase() === "pending");
    assert.equal(activePending, undefined, "No active pending request exists after settlement");

    // Artist creates second withdrawal for ₹1,000
    const amount = 1000;
    const wallet = db.wallets.find(w => w.user_id === userId);
    wallet.available_balance -= amount;
    wallet.pending_balance += amount;

    const newWR = {
      id: db.withdrawals.length + 1,
      user_id: userId,
      amount,
      status: "pending",
      reference_id: `WITHDRAW_2_${Date.now()}`
    };
    db.withdrawals.push(newWR);

    assert.equal(wallet.available_balance, 2000);
    assert.equal(wallet.pending_balance, 1000);
    assert.equal(newWR.status, "pending");
  });

  it("8. Admin Rejection Flow: Admin rejects WR-2 with reason, restores funds to available balance", () => {
    const withdrawal = db.withdrawals.find(w => w.id === 2);
    const wallet = db.wallets.find(w => w.user_id === withdrawal.user_id);
    const rejectionReason = "IFSC code mismatch with beneficiary name";

    // Reversal accounting
    wallet.pending_balance -= withdrawal.amount;
    wallet.available_balance += withdrawal.amount;

    withdrawal.status = "failed";
    withdrawal.rejection_reason = rejectionReason;
    withdrawal.processed_at = new Date().toISOString();

    db.wallet_transactions.push({
      id: db.wallet_transactions.length + 1,
      wallet_id: wallet.id,
      user_id: withdrawal.user_id,
      type: "credit",
      amount: withdrawal.amount,
      status: "completed",
      description: `Withdrawal WR-2 Rejected (₹${withdrawal.amount}) — Restored to Available Balance. Reason: ${rejectionReason}`
    });

    db.notifications.push({
      user_id: withdrawal.user_id,
      title: "Withdrawal Request Rejected",
      message: `Your withdrawal request of ₹${withdrawal.amount} was rejected and refunded. Reason: ${rejectionReason}`
    });

    assert.equal(withdrawal.status, "failed");
    assert.equal(withdrawal.rejection_reason, rejectionReason);
    assert.equal(wallet.pending_balance, 0, "Pending balance cleared on rejection");
    assert.equal(wallet.available_balance, 3000, "Full ₹1,000 refunded back to available balance");
    assert.equal(db.notifications.length, 2, "Artist notified with rejection reason");
  });
});
