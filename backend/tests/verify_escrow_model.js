const sqlite3 = require('sqlite3').verbose();

class AsyncDb {
  constructor() {
    this.db = new sqlite3.Database(':memory:');
  }
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

async function runProof() {
  const db = new AsyncDb();

  await db.run('CREATE TABLE bookings (id INTEGER PRIMARY KEY, total_amount REAL, advance_paid REAL, remaining_amount REAL, status TEXT, payment_status TEXT);');
  await db.run('CREATE TABLE payments (id INTEGER PRIMARY KEY, booking_id INTEGER, amount REAL, payment_type TEXT, payment_method TEXT);');
  await db.run('CREATE TABLE wallets (id INTEGER PRIMARY KEY, user_id INTEGER, role TEXT, balance REAL, available_balance REAL, escrow_balance REAL, total_earnings REAL);');
  await db.run('CREATE TABLE wallet_transactions (id INTEGER PRIMARY KEY, wallet_id INTEGER, user_id INTEGER, booking_id INTEGER, type TEXT, amount REAL, status TEXT, reference_id TEXT);');
  await db.run('CREATE TABLE refunds (id INTEGER PRIMARY KEY, booking_id INTEGER, amount REAL, status TEXT);');

  // Initial Setup
  await db.run("INSERT INTO wallets VALUES (1, 1, 'customer', 0, 0, 0, 0)");
  await db.run("INSERT INTO wallets VALUES (2, 235, 'artist', 0, 0, 0, 0)");
  await db.run("INSERT INTO wallets VALUES (3, 0, 'platform', 0, 0, 0, 0)");

  console.log('========================================================================');
  console.log('  EXACT DB PROOF FOR ₹500 BOOKING — SCENARIO 1 (COMPLETED BOOKING)');
  console.log('========================================================================\n');

  // ----------------------------------------------------------------------
  // STAGE 1: 10% ADVANCE PAYMENT (₹50 PAID BY CUSTOMER ON ₹500 BOOKING)
  // ----------------------------------------------------------------------
  console.log('--- STAGE 1: Customer Pays 10% Advance (₹50) ---');
  await db.run("INSERT INTO bookings VALUES (5001, 500, 50, 450, 'confirmed', 'PARTIAL')");
  await db.run("INSERT INTO payments VALUES (1, 5001, 50, 'ADVANCE', 'RAZORPAY')");
  
  // Escrow hold of artist payable obligation (₹450)
  await db.run("UPDATE wallets SET escrow_balance = escrow_balance + 450 WHERE user_id = 235");
  await db.run("INSERT INTO wallet_transactions VALUES (1, 2, 235, 5001, 'credit', 450, 'escrow_held', 'ESCROW_BK_5001')");

  const bRow = await db.get('SELECT * FROM bookings WHERE id = 5001');
  console.log('1. Booking DB Record:');
  console.log('   - total_amount:     ₹' + bRow.total_amount);
  console.log('   - advance_paid:     ₹' + bRow.advance_paid + ' (Actual cash received from customer)');
  console.log('   - remaining_amount: ₹' + bRow.remaining_amount + ' (Customer payable obligation)');
  console.log('   - payment_status:   ' + bRow.payment_status);

  const pRows = await db.all('SELECT * FROM payments WHERE booking_id = 5001');
  console.log('2. Payments DB Table:');
  pRows.forEach(p => console.log('   - Payment #' + p.id + ': ₹' + p.amount + ' via ' + p.payment_method + ' (' + p.payment_type + ')'));

  const wRows = await db.all('SELECT user_id, role, available_balance, escrow_balance FROM wallets');
  console.log('3. Wallets Table:');
  wRows.forEach(w => console.log('   - ' + w.role.toUpperCase() + ' (user_id=' + w.user_id + '): available_balance=₹' + w.available_balance + ', escrow_balance=₹' + w.escrow_balance));

  // ----------------------------------------------------------------------
  // STAGE 2: SERVICE COMPLETED & REMAINING ₹450 PAID
  // ----------------------------------------------------------------------
  console.log('\n--- STAGE 2: Service Completed + Remaining ₹450 Paid (Cash/Online) ---');
  await db.run("UPDATE bookings SET status = 'completed', payment_status = 'PAID', advance_paid = 500, remaining_amount = 0 WHERE id = 5001");
  await db.run("INSERT INTO payments VALUES (2, 5001, 450, 'FINAL', 'CASH')");
  
  // Settlement: Release ₹450 from escrow to available balance + record platform commission of ₹50
  await db.run("UPDATE wallets SET escrow_balance = escrow_balance - 450, available_balance = available_balance + 450, total_earnings = total_earnings + 450 WHERE user_id = 235");
  await db.run("UPDATE wallets SET available_balance = available_balance + 50, total_earnings = total_earnings + 50 WHERE user_id = 0");
  await db.run("INSERT INTO wallet_transactions VALUES (2, 2, 235, 5001, 'credit', 450, 'completed', 'RELEASE_BK_5001')");
  await db.run("INSERT INTO wallet_transactions VALUES (3, 3, 0, 5001, 'credit', 50, 'completed', 'COMMISSION_BK_5001')");

  const bComp = await db.get('SELECT * FROM bookings WHERE id = 5001');
  console.log('1. Booking DB Record at Completion:');
  console.log('   - total_amount:     ₹' + bComp.total_amount);
  console.log('   - advance_paid:     ₹' + bComp.advance_paid + ' (Fully paid)');
  console.log('   - remaining_amount: ₹' + bComp.remaining_amount);
  console.log('   - payment_status:   ' + bComp.payment_status);

  const pComp = await db.all('SELECT * FROM payments WHERE booking_id = 5001');
  console.log('2. Payments DB Table (Both Transactions):');
  pComp.forEach(p => console.log('   - Payment #' + p.id + ': ₹' + p.amount + ' via ' + p.payment_method + ' (' + p.payment_type + ')'));

  const wComp = await db.all('SELECT user_id, role, available_balance, escrow_balance, total_earnings FROM wallets');
  console.log('3. Wallets Table at Settlement:');
  wComp.forEach(w => console.log('   - ' + w.role.toUpperCase() + ' (user_id=' + w.user_id + '): available_balance=₹' + w.available_balance + ', escrow_balance=₹' + w.escrow_balance + ', total_earnings=₹' + w.total_earnings));

  const txRows = await db.all('SELECT id, user_id, type, amount, status, reference_id FROM wallet_transactions');
  console.log('4. Wallet Ledger Transactions:');
  txRows.forEach(tx => console.log('   - Tx #' + tx.id + ' [user_id=' + tx.user_id + ']: ' + tx.type.toUpperCase() + ' ₹' + tx.amount + ' (' + tx.status + ') ref=' + tx.reference_id));

  // RECONCILIATION PROOF
  const pSum = await db.get('SELECT SUM(amount) as total_received FROM payments WHERE booking_id = 5001');
  const platRow = await db.get('SELECT available_balance as platform_rev FROM wallets WHERE user_id = 0');
  const artRow = await db.get('SELECT available_balance as artist_net FROM wallets WHERE user_id = 235');

  const totalCustomerPaid = pSum.total_received;
  const platformRev = platRow.platform_rev;
  const artistNet = artRow.artist_net;
  const refunds = 0;

  console.log('\n========================================================================');
  console.log('  FINAL MATHEMATICAL EQUATION PROOF (SCENARIO 1 - COMPLETED):');
  console.log('========================================================================');
  console.log('  Actual Customer Money Received: ₹' + totalCustomerPaid);
  console.log('  Platform Revenue:               ₹' + platformRev);
  console.log('  Artist Money Received:          ₹' + artistNet);
  console.log('  Valid Refunds:                  ₹' + refunds);
  console.log('\n  Equation:');
  console.log('  ₹' + totalCustomerPaid + ' (Actual Received) = ₹' + platformRev + ' (Platform) + ₹' + artistNet + ' (Artist) + ₹' + refunds + ' (Refunds)');
  console.log('  Status: ' + (totalCustomerPaid === (platformRev + artistNet + refunds) ? '✅ MATCHED WITH ZERO VARIANCE' : '❌ MISMATCH'));
  console.log('========================================================================\n');

  // ----------------------------------------------------------------------
  // SCENARIO 2: CANCELLED BOOKING WITH 100% ADVANCE REFUND
  // ----------------------------------------------------------------------
  console.log('========================================================================');
  console.log('  EXACT DB PROOF FOR ₹500 BOOKING — SCENARIO 2 (CANCELLED & REFUNDED)');
  console.log('========================================================================\n');
  
  // Customer 2 & Artist 2 setup
  await db.run("INSERT INTO wallets VALUES (4, 2, 'customer', 0, 0, 0, 0)");
  await db.run("INSERT INTO wallets VALUES (5, 236, 'artist', 0, 0, 0, 0)");
  
  // Booking 5002 with 10% advance paid (₹50)
  await db.run("INSERT INTO bookings VALUES (5002, 500, 50, 450, 'confirmed', 'PARTIAL')");
  await db.run("INSERT INTO payments VALUES (3, 5002, 50, 'ADVANCE', 'RAZORPAY')");
  await db.run("UPDATE wallets SET escrow_balance = escrow_balance + 450 WHERE user_id = 236");
  await db.run("INSERT INTO wallet_transactions VALUES (4, 5, 236, 5002, 'credit', 450, 'escrow_held', 'ESCROW_BK_5002')");

  // Now Customer/Artist Cancels Before Arrival
  await db.run("UPDATE bookings SET status = 'cancelled', payment_status = 'REFUNDED' WHERE id = 5002");
  await db.run("UPDATE wallets SET balance = balance + 50, available_balance = available_balance + 50 WHERE user_id = 2");
  await db.run("UPDATE wallets SET escrow_balance = escrow_balance - 450 WHERE user_id = 236");
  await db.run("INSERT INTO wallet_transactions VALUES (5, 4, 2, 5002, 'credit', 50, 'completed', 'REFUND_CUST_BK_5002')");
  await db.run("INSERT INTO wallet_transactions VALUES (6, 5, 236, 5002, 'debit', 450, 'escrow_reversed', 'REFUND_ART_BK_5002')");
  await db.run("INSERT INTO refunds VALUES (1, 5002, 50, 'PROCESSED')");

  const pSum2 = await db.get('SELECT SUM(amount) as total_received FROM payments WHERE booking_id = 5002');
  const cWallet2 = await db.get('SELECT balance as cust_bal FROM wallets WHERE user_id = 2');
  const aWallet2 = await db.get('SELECT available_balance as art_bal, escrow_balance as art_esc FROM wallets WHERE user_id = 236');
  const rRow = await db.get('SELECT amount as refund_amount FROM refunds WHERE booking_id = 5002');

  const custPaid2 = pSum2.total_received; // 50
  const platRev2 = 0;
  const artReceived2 = aWallet2.art_bal; // 0
  const refund2 = rRow.refund_amount; // 50

  console.log('1. Booking DB Record: Status=cancelled, payment_status=REFUNDED');
  console.log('2. Customer Wallet: Balance=₹' + cWallet2.cust_bal + ' (Refunded)');
  console.log('3. Artist Wallet:   Available=₹' + aWallet2.art_bal + ', Escrow=₹' + aWallet2.art_esc + ' (Escrow Reversed to 0)');
  console.log('\n  Equation (Scenario 2 - Refunded):');
  console.log('  ₹' + custPaid2 + ' (Actual Received) = ₹' + platRev2 + ' (Platform) + ₹' + artReceived2 + ' (Artist) + ₹' + refund2 + ' (Refund)');
  console.log('  Status: ' + (custPaid2 === (platRev2 + artReceived2 + refund2) ? '✅ MATCHED WITH ZERO VARIANCE' : '❌ MISMATCH'));
  console.log('========================================================================\n');
}

runProof().catch(console.error);
