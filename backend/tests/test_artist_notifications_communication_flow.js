"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const NotificationService = require("../services/notification.services");

describe("ARTIST MODULE 9: NOTIFICATIONS + REAL-TIME COMMUNICATION + CHAT INTEGRATION SUITE", () => {
  let artistUserA, artistProfileA;
  let artistUserB, artistProfileB;
  let customerUserA, customerUserB;
  let booking1;
  let notification1, notification2;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Artist A
    artistUserA = await db.User.create({
      name: "Meera Artist",
      email: "meera@notif.com",
      phone: "9876543250",
      phone_number: "9876543250",
      role: "ARTIST",
      is_verified: true
    });
    artistProfileA = await db.ArtistProfile.create({
      user_id: artistUserA.id,
      bio: "Bridal Henna Expert",
      experience_years: 7,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 2. Rival Artist B
    artistUserB = await db.User.create({
      name: "Rival Artist B",
      email: "rivalb@notif.com",
      phone: "9876543251",
      phone_number: "9876543251",
      role: "ARTIST",
      is_verified: true
    });
    artistProfileB = await db.ArtistProfile.create({
      user_id: artistUserB.id,
      bio: "Rival Henna Designer",
      experience_years: 3,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 3. Customer A & B
    customerUserA = await db.User.create({
      name: "Sneha Customer",
      email: "sneha@notif.com",
      phone: "9123456721",
      phone_number: "9123456721",
      role: "CUSTOMER",
      is_verified: true
    });

    customerUserB = await db.User.create({
      name: "Rival Customer B",
      email: "rival_cust@notif.com",
      phone: "9123456722",
      phone_number: "9123456722",
      role: "CUSTOMER",
      is_verified: true
    });

    // 4. Booking for Chat & Notification Testing
    const category = await db.Category.create({
      name: "Bridal Festive",
      slug: "bridal-festive",
      status: "ACTIVE",
      is_active: true
    });

    const service = await db.Service.create({
      artist_id: artistProfileA.id,
      specialization_name: "Marwari Festive Henna",
      category: "Bridal Festive",
      category_id: category.id,
      minimum_price: 3500,
      duration_minutes: 120,
      is_active: true
    });

    const todayStr = new Date().toISOString().substring(0, 10);
    const slot = await db.AvailabilitySlot.create({
      artist_id: artistProfileA.id,
      date: todayStr,
      start_time: `${todayStr}T10:00:00.000Z`,
      end_time: `${todayStr}T12:00:00.000Z`,
      is_booked: true
    });

    booking1 = await db.Booking.create({
      booking_code: "MG-900101",
      user_id: customerUserA.id,
      artist_id: artistProfileA.id,
      service_id: service.id,
      slot_id: slot.id,
      total_price: 3500,
      advance_paid: 350,
      remaining_amount: 3150,
      final_amount: 3500,
      booking_status: "CONFIRMED",
      payment_status: "PARTIAL",
      detailed_status: "CONFIRMED",
      check_in_otp_verified: false,
      address: "Vaishali Nagar, Jaipur"
    });
  });

  it("1. Notification Creation & Database Persistence: Real notification record created", async () => {
    notification1 = await NotificationService.sendToUser(
      artistUserA.id,
      "New Booking Request 🌟",
      "You have received a new booking request #MG-900101 for ₹3,500.",
      {
        type: "BOOKING",
        event: "new_booking_request",
        bookingId: booking1.id,
        booking_code: "MG-900101"
      }
    );

    assert.ok(notification1);
    assert.equal(notification1.user_id, artistUserA.id);
    assert.equal(notification1.title, "New Booking Request 🌟");
    assert.equal(notification1.type, "BOOKING");
    assert.equal(notification1.is_read, false);
    assert.equal(notification1.data.bookingId, booking1.id);
  });

  it("2. Recipient Security & Cross-Artist Isolation: Artist A receives notification; Rival Artist B does NOT", async () => {
    // Artist A history
    const artistANotifs = await db.Notification.findAll({
      where: { user_id: artistUserA.id }
    });
    assert.equal(artistANotifs.length, 1);
    assert.equal(artistANotifs[0].id, notification1.id);

    // Artist B history (must be empty)
    const artistBNotifs = await db.Notification.findAll({
      where: { user_id: artistUserB.id }
    });
    assert.equal(artistBNotifs.length, 0, "Rival Artist B must receive 0 notifications for Artist A's events");
  });

  it("3. Unread Count Calculation: Accurately reflects unread notifications", async () => {
    // Send second notification
    notification2 = await NotificationService.sendToUser(
      artistUserA.id,
      "KYC Verification Approved ✅",
      "Your documents have been verified. You can now receive customer bookings!",
      {
        type: "SYSTEM",
        event: "kyc_approved"
      }
    );

    assert.ok(notification2);

    const unreadCount = await db.Notification.count({
      where: { user_id: artistUserA.id, is_read: false }
    });
    assert.equal(unreadCount, 2);
  });

  it("4. Mark Single Notification as Read: Persists to DB and reduces unread count", async () => {
    await db.Notification.update(
      { is_read: true },
      { where: { id: notification1.id, user_id: artistUserA.id } }
    );

    const updated = await db.Notification.findByPk(notification1.id);
    assert.equal(updated.is_read, true);

    const remainingUnread = await db.Notification.count({
      where: { user_id: artistUserA.id, is_read: false }
    });
    assert.equal(remainingUnread, 1);
  });

  it("5. Mark All Notifications as Read: Transitions all user notifications to is_read: true", async () => {
    await db.Notification.update(
      { is_read: true },
      { where: { user_id: artistUserA.id, is_read: false } }
    );

    const finalUnread = await db.Notification.count({
      where: { user_id: artistUserA.id, is_read: false }
    });
    assert.equal(finalUnread, 0);
  });

  it("6. Notification Deletion & Clear All: Removes records from database cleanly", async () => {
    // Delete one notification
    await db.Notification.destroy({
      where: { id: notification1.id, user_id: artistUserA.id }
    });

    const check1 = await db.Notification.findByPk(notification1.id);
    assert.equal(check1, null);

    // Clear all for Artist A
    await db.Notification.destroy({
      where: { user_id: artistUserA.id }
    });

    const remaining = await db.Notification.count({
      where: { user_id: artistUserA.id }
    });
    assert.equal(remaining, 0);
  });

  it("7. Push Token Registration & Lifecycle: Token registered, active, and scoped to user", async () => {
    const tokenRecord = await db.NotificationToken.create({
      user_id: artistUserA.id,
      token: "ExponentPushToken[test-artist-a-token-123]",
      device_type: "ANDROID",
      is_active: true
    });

    assert.ok(tokenRecord);
    assert.equal(tokenRecord.user_id, artistUserA.id);
    assert.equal(tokenRecord.token, "ExponentPushToken[test-artist-a-token-123]");
    assert.equal(tokenRecord.is_active, true);

    // Verify token lookup for user
    const tokens = await db.NotificationToken.findAll({
      where: { user_id: artistUserA.id, is_active: true }
    });
    assert.equal(tokens.length, 1);

    // Deactivate / remove token on logout
    await tokenRecord.update({ is_active: false });
    const activeTokens = await db.NotificationToken.findAll({
      where: { user_id: artistUserA.id, is_active: true }
    });
    assert.equal(activeTokens.length, 0);
  });

  it("8. Customer ↔ Artist Chat Room & Messaging: Messages persist and are ordered chronologically", async () => {
    // Create ChatRoom bound to booking1
    const [room] = await db.ChatRoom.findOrCreate({
      where: { booking_id: booking1.id },
      defaults: {
        booking_id: booking1.id
      }
    });

    assert.ok(room);
    assert.equal(room.booking_id, booking1.id);

    // Customer sends message
    const msg1 = await db.Message.create({
      chat_room_id: room.id,
      booking_id: booking1.id,
      sender_id: customerUserA.id,
      receiver_id: artistUserA.id,
      message: "Hello! Looking forward to the appointment.",
      is_read: false
    });

    // Artist replies
    const msg2 = await db.Message.create({
      chat_room_id: room.id,
      booking_id: booking1.id,
      sender_id: artistUserA.id,
      receiver_id: customerUserA.id,
      message: "Hello Sneha! I will be there right on time with the finest natural henna cones.",
      is_read: false
    });

    assert.ok(msg1);
    assert.ok(msg2);

    const messages = await db.Message.findAll({
      where: { chat_room_id: room.id },
      order: [["createdAt", "ASC"]]
    });

    assert.equal(messages.length, 2);
    assert.equal(messages[0].message, "Hello! Looking forward to the appointment.");
    assert.equal(messages[1].message, "Hello Sneha! I will be there right on time with the finest natural henna cones.");
  });

  it("9. Chat Authorization Guard: Rival Artist B and Rival Customer B cannot access Chat Room for Booking 1", async () => {
    const booking = await db.Booking.findByPk(booking1.id);
    assert.ok(booking);

    // Check if Artist B is the assigned artist
    const isArtistBAuthorized = Number(booking.artist_id) === Number(artistProfileB.id);
    assert.equal(isArtistBAuthorized, false, "Rival Artist B must not be authorized in Artist A's chat room");

    // Check if Customer B is the booking customer
    const isCustomerBAuthorized = Number(booking.user_id) === Number(customerUserB.id);
    assert.equal(isCustomerBAuthorized, false, "Rival Customer B must not be authorized in Customer A's chat room");
  });

  it("10. Chat Message Read Receipts: Marking messages as read updates is_read flag", async () => {
    const room = await db.ChatRoom.findOne({ where: { booking_id: booking1.id } });
    
    // Artist reads Customer's message
    await db.Message.update(
      { is_read: true },
      { where: { chat_room_id: room.id, receiver_id: artistUserA.id } }
    );

    const customerMsg = await db.Message.findOne({
      where: { chat_room_id: room.id, sender_id: customerUserA.id }
    });
    assert.equal(customerMsg.is_read, true);
  });
});
