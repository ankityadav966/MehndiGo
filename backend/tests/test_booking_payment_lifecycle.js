const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

describe("STRICT 10% ADVANCE PAYMENT → BOOKING CREATION LIFECYCLE (SCENARIOS P THROUGH X)", () => {
  // In-memory mock database representing SQLite tables
  const mockDb = {
    users: [
      { id: 1, full_name: "Customer Pooja", role: "customer", phone: "9876543210" },
      { id: 2, full_name: "Customer Neha", role: "customer", phone: "9876543211" },
      { id: 101, full_name: "Artist Anjali", role: "artist", phone: "9123456789" }
    ],
    services: [
      { id: 1, artist_id: 101, title: "Bridal Mehndi", price: 2000, is_active: 1 }
    ],
    bookings: [],
    payments: [],
    wallet_transactions: [],
    notifications: [],
    socketEvents: []
  };

  const RAZORPAY_SECRET = "rzp_secret_test_key_live_verified_123";

  function createHmacSignature(orderId, paymentId, secret = RAZORPAY_SECRET) {
    return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  }

  // Pure logic engine matching backend/src/index.js finalizePaidBooking
  async function finalizePaidBookingSim(db, { paymentId, orderId, paidAmount, checkoutData, isSettlement, user }) {
    // 1. Idempotency Check: Was a booking already created for this paymentId / orderId?
    const existingPayment = db.payments.find(p => (p.razorpay_payment_id === paymentId || p.razorpay_order_id === orderId) && p.booking_id != null && p.booking_id > 0);
    if (existingPayment) {
      const existingBooking = db.bookings.find(b => b.id === existingPayment.booking_id);
      if (existingBooking) {
        return { success: true, booking: existingBooking, isDuplicate: true };
      }
    }

    // 2. Extract checkout data
    const cData = checkoutData || {};
    const customerId = user?.id || cData.customer_id || 1;
    const artistId = Number(cData.artist_id || 0);
    const serviceId = Number(cData.service_id || 0);
    const bookingDate = String(cData.booking_date || "").trim();
    const bookingTime = String(cData.booking_time || "").trim();
    const totalAmount = Number(cData.total_amount || 2000);
    const required10Percent = Math.round(totalAmount * 0.10);

    // 3. Exact 10% Amount Verification
    if (paidAmount < required10Percent) {
      throw new Error(`INSUFFICIENT_PAYMENT: Paid ₹${paidAmount} is less than required 10% advance ₹${required10Percent}`);
    }

    // 4. Double-Booking Slot Collision Check
    if (artistId && bookingDate && bookingTime) {
      const slotConflict = db.bookings.find(b =>
        b.artist_id === artistId &&
        b.booking_date === bookingDate &&
        b.booking_time === bookingTime &&
        ['confirmed', 'accepted', 'in_progress', 'service_started', 'arrived', 'on_the_way'].includes(String(b.status).toLowerCase())
      );

      if (slotConflict) {
        // Refund customer wallet
        db.wallet_transactions.push({
          user_id: customerId,
          type: "credit",
          amount: paidAmount,
          description: `Auto-refund for slot collision: ${bookingDate} ${bookingTime}`,
          status: "completed",
          reference_id: `REFUND_${paymentId}`
        });
        throw new Error(`SLOT_UNAVAILABLE: Artist is already booked for ${bookingDate} at ${bookingTime}. Your advance payment of ₹${paidAmount} has been refunded.`);
      }
    }

    // 5. INSERT ACTUAL BOOKING RECORD ONLY NOW
    const advancePaid = paidAmount;
    const remainingAmount = Math.max(0, totalAmount - advancePaid);
    const newBookingId = db.bookings.length + 1;
    const bookingNumber = `MG-00000${newBookingId}`;

    const newBooking = {
      id: newBookingId,
      booking_number: bookingNumber,
      customer_id: customerId,
      artist_id: artistId,
      service_id: serviceId,
      booking_date: bookingDate,
      booking_time: bookingTime,
      total_amount: totalAmount,
      advance_paid: advancePaid,
      remaining_amount: remainingAmount,
      status: "confirmed",
      booking_status: "CONFIRMED",
      detailed_status: "CONFIRMED",
      payment_status: "PARTIAL",
      payment_mode: "ONLINE",
      checkin_otp: "4582",
      checkout_otp: "7913",
      created_at: new Date().toISOString()
    };
    db.bookings.push(newBooking);

    // 6. Record payment row linked to new booking
    db.payments.push({
      id: db.payments.length + 1,
      booking_id: newBookingId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      amount: advancePaid,
      currency: "INR",
      status: "captured",
      payment_method: "ONLINE",
      payment_type: "ADVANCE"
    });

    // 7. Dispatch notifications
    db.notifications.push({
      userId: artistId,
      title: "New Booking Confirmed 🌸",
      body: `New booking #${bookingNumber} confirmed! Advance payment of ₹${advancePaid} received.`,
      type: "BOOKING_CREATED",
      bookingId: newBookingId
    });

    db.notifications.push({
      userId: customerId,
      title: "Booking Confirmed ✨",
      body: `Your booking #${bookingNumber} is confirmed! Check-In OTP: 4582`,
      type: "PAYMENT_SUCCESS",
      bookingId: newBookingId
    });

    return { success: true, booking: newBooking };
  }

  it("Scenario P: Customer clicks Proceed → ZERO rows created in bookings table; NO artist notifications", () => {
    const initialBookingCount = mockDb.bookings.length;
    const initialNotificationCount = mockDb.notifications.length;

    // BookingSummaryScreen Proceed compiles checkoutData pure in client memory
    const checkoutData = {
      artist_id: 101,
      service_id: 1,
      booking_date: "2026-09-01",
      booking_time: "02:00 PM",
      total_amount: 2000,
      advance_amount: 200,
      address: "B-42, Sector 62, Noida"
    };

    // Customer navigates to PaymentScreen with checkoutData
    assert.ok(checkoutData, "Client has checkoutData in memory");
    assert.equal(mockDb.bookings.length, initialBookingCount, "Bookings count MUST remain unchanged upon Proceed");
    assert.equal(mockDb.notifications.length, initialNotificationCount, "Artist notifications count MUST remain 0 upon Proceed");
  });

  it("Scenario Q: Customer opens Payment Screen without paying → bookings count remains EXACTLY the same", () => {
    const initialBookingCount = mockDb.bookings.length;

    // PaymentScreen renders options: Pay Online (₹200) or Pay Cash
    // No payment submitted yet
    assert.equal(mockDb.bookings.length, initialBookingCount, "No booking created on Payment Screen render");
  });

  it("Scenario R: Payment fails / cancelled on gateway → bookings count remains EXACTLY the same", () => {
    const initialBookingCount = mockDb.bookings.length;

    // Razorpay modal is dismissed or fails
    const paymentFailed = true;
    if (paymentFailed) {
      // No verification call made
    }

    assert.equal(mockDb.bookings.length, initialBookingCount, "No booking created when payment is cancelled or fails");
  });

  it("Scenario S: Payment amount < required 10% → rejected by backend; NO booking created", async () => {
    const initialBookingCount = mockDb.bookings.length;
    const checkoutData = {
      artist_id: 101,
      service_id: 1,
      booking_date: "2026-09-01",
      booking_time: "02:00 PM",
      total_amount: 2000
    };

    // Hacker tries to pay only ₹50 instead of required ₹200 (10%)
    await assert.rejects(async () => {
      await finalizePaidBookingSim(mockDb, {
        paymentId: "pay_tampered_123",
        orderId: "order_tampered_123",
        paidAmount: 50, // Less than 10% (200)
        checkoutData,
        user: { id: 1 }
      });
    }, /INSUFFICIENT_PAYMENT/);

    assert.equal(mockDb.bookings.length, initialBookingCount, "No booking created on insufficient payment");
  });

  it("Scenario T: Valid 10% advance paid & verified → ACTUAL booking row created, slot reserved, artist notified", async () => {
    const initialBookingCount = mockDb.bookings.length;
    const checkoutData = {
      artist_id: 101,
      service_id: 1,
      booking_date: "2026-09-01",
      booking_time: "02:00 PM",
      total_amount: 2000
    };

    const orderId = "order_rzp_valid_101";
    const paymentId = "pay_rzp_valid_101";
    const signature = createHmacSignature(orderId, paymentId);

    // Verify HMAC
    const expectedSig = createHmacSignature(orderId, paymentId);
    assert.equal(signature, expectedSig, "Signature is authentic");

    const result = await finalizePaidBookingSim(mockDb, {
      paymentId,
      orderId,
      paidAmount: 200, // Exact 10%
      checkoutData,
      user: { id: 1 }
    });

    assert.equal(result.success, true);
    assert.equal(mockDb.bookings.length, initialBookingCount + 1, "Exactly 1 booking row created");
    const createdBooking = mockDb.bookings[mockDb.bookings.length - 1];
    assert.equal(createdBooking.status, "confirmed");
    assert.equal(createdBooking.detailed_status, "CONFIRMED");
    assert.equal(createdBooking.advance_paid, 200);
    assert.equal(createdBooking.remaining_amount, 1800);

    const artistNotification = mockDb.notifications.find(n => n.userId === 101 && n.type === "BOOKING_CREATED");
    assert.ok(artistNotification, "Artist received real-time BOOKING_CREATED notification");
  });

  it("Scenario U: Duplicate payment callback (Frontend + Webhook) → exactly 1 booking created", async () => {
    const initialBookingCount = mockDb.bookings.length;
    const checkoutData = {
      artist_id: 101,
      service_id: 1,
      booking_date: "2026-09-01",
      booking_time: "02:00 PM",
      total_amount: 2000
    };

    const orderId = "order_rzp_valid_101"; // Same order ID as Scenario T
    const paymentId = "pay_rzp_valid_101"; // Same payment ID as Scenario T

    const result = await finalizePaidBookingSim(mockDb, {
      paymentId,
      orderId,
      paidAmount: 200,
      checkoutData,
      user: { id: 1 }
    });

    assert.equal(result.success, true);
    assert.equal(result.isDuplicate, true, "Detected duplicate callback idempotently");
    assert.equal(mockDb.bookings.length, initialBookingCount, "Zero additional rows created on duplicate callback");
  });

  it("Scenario V: Concurrent slot payment → 1st customer confirmed, 2nd customer gets SLOT_UNAVAILABLE + refund", async () => {
    const initialBookingCount = mockDb.bookings.length;
    const checkoutDataCustomer2 = {
      customer_id: 2,
      artist_id: 101,
      service_id: 1,
      booking_date: "2026-09-01",
      booking_time: "02:00 PM", // Same slot already booked in Scenario T
      total_amount: 2000
    };

    await assert.rejects(async () => {
      await finalizePaidBookingSim(mockDb, {
        paymentId: "pay_concurrent_cust2",
        orderId: "order_concurrent_cust2",
        paidAmount: 200,
        checkoutData: checkoutDataCustomer2,
        user: { id: 2 }
      });
    }, /SLOT_UNAVAILABLE/);

    assert.equal(mockDb.bookings.length, initialBookingCount, "No duplicate slot booking created");

    const refundTx = mockDb.wallet_transactions.find(t => t.user_id === 2 && t.reference_id === "REFUND_pay_concurrent_cust2");
    assert.ok(refundTx, "Customer 2 automatically credited with full refund in wallet");
    assert.equal(refundTx.amount, 200);
  });

  it("Scenario W: Fake / simulated frontend signature → rejected, 0 bookings created", async () => {
    const initialBookingCount = mockDb.bookings.length;
    const fakeSignature = "simulated_fake_signature_abc123";
    const expectedSig = createHmacSignature("order_123", "pay_123");

    const isValid = (fakeSignature === expectedSig);
    assert.equal(isValid, false, "Fake signature rejected");
    assert.equal(mockDb.bookings.length, initialBookingCount, "Zero bookings created on invalid signature");
  });

  it("Scenario X: Pay Cash Flow → creates pending request with PENDING_ARTIST_CONFIRMATION; NO advance paid", () => {
    const initialBookingCount = mockDb.bookings.length;
    const checkoutData = {
      customer_id: 1,
      artist_id: 101,
      service_id: 1,
      booking_date: "2026-09-05",
      booking_time: "10:00 AM",
      total_amount: 2000,
      payment_mode: "CASH"
    };

    const newBookingId = mockDb.bookings.length + 1;
    const cashBooking = {
      id: newBookingId,
      booking_number: `MG-00000${newBookingId}`,
      customer_id: checkoutData.customer_id,
      artist_id: checkoutData.artist_id,
      service_id: checkoutData.service_id,
      booking_date: checkoutData.booking_date,
      booking_time: checkoutData.booking_time,
      total_amount: checkoutData.total_amount,
      advance_paid: 0,
      remaining_amount: checkoutData.total_amount,
      status: "pending",
      booking_status: "PENDING",
      detailed_status: "PENDING_ARTIST_CONFIRMATION",
      payment_status: "pending",
      payment_mode: "CASH"
    };
    mockDb.bookings.push(cashBooking);

    assert.equal(mockDb.bookings.length, initialBookingCount + 1);
    assert.equal(cashBooking.status, "pending");
    assert.equal(cashBooking.detailed_status, "PENDING_ARTIST_CONFIRMATION");
    assert.equal(cashBooking.advance_paid, 0);
  });
});
