"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const AdminService = require("../services/admin.services");

describe("ARTIST MODULE 12: ADMIN OPERATIONS + ARTIST LIFECYCLE CONTROL INTEGRATION SUITE", () => {
  let adminUser;
  let artistUserA, artistProfileA;
  let artistUserB, artistProfileB;
  let customerUser;
  let review1;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // 1. Admin User
    adminUser = await db.User.create({
      name: "Platform Super Admin",
      email: "superadmin@mehndigo.in",
      phone: "9999999998",
      phone_number: "9999999998",
      role: "ADMIN",
      is_verified: true
    });

    // 2. Pending Artist A (For KYC Approval & Lifecycle testing)
    artistUserA = await db.User.create({
      name: "Komal Henna Artist",
      email: "komal@adminflow.com",
      phone: "9876543280",
      phone_number: "9876543280",
      role: "ARTIST",
      is_verified: false
    });
    artistProfileA = await db.ArtistProfile.create({
      user_id: artistUserA.id,
      bio: "Bridal Specialist",
      experience_years: 5,
      verification_status: "PENDING",
      is_available: false,
      aadhaar_number: "1234-5678-9012",
      city: "Jaipur"
    });

    // 3. Artist B (For Rejection & Suspension testing)
    artistUserB = await db.User.create({
      name: "Sonia Mehndi Designer",
      email: "sonia@adminflow.com",
      phone: "9876543281",
      phone_number: "9876543281",
      role: "ARTIST",
      is_verified: false
    });
    artistProfileB = await db.ArtistProfile.create({
      user_id: artistUserB.id,
      bio: "Modern Arabic Henna",
      experience_years: 3,
      verification_status: "PENDING",
      is_available: false,
      aadhaar_number: "9876-5432-1098",
      city: "Jaipur"
    });

    // 4. Customer User
    customerUser = await db.User.create({
      name: "Kavita Customer",
      email: "kavita@adminflow.com",
      phone: "9123456741",
      phone_number: "9123456741",
      role: "CUSTOMER",
      is_verified: true
    });

    // 5. Booking & Review for Moderation
    const category = await db.Category.create({
      name: "Festive Henna",
      slug: "festive-henna",
      status: "ACTIVE",
      is_active: true
    });

    const service = await db.Service.create({
      artist_id: artistProfileA.id,
      specialization_name: "Festive Arabic Mehndi",
      category: "Festive Henna",
      category_id: category.id,
      minimum_price: 2000,
      duration_minutes: 90,
      is_active: true
    });

    const todayStr = new Date().toISOString().substring(0, 10);
    const slot = await db.AvailabilitySlot.create({
      artist_id: artistProfileA.id,
      date: todayStr,
      start_time: `${todayStr}T10:00:00.000Z`,
      end_time: `${todayStr}T11:30:00.000Z`,
      is_booked: true
    });

    const booking = await db.Booking.create({
      booking_code: "MG-120101",
      user_id: customerUser.id,
      artist_id: artistProfileA.id,
      service_id: service.id,
      slot_id: slot.id,
      total_price: 2000,
      advance_paid: 200,
      remaining_amount: 1800,
      final_amount: 2000,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED",
      check_in_otp_verified: true,
      check_out_otp_verified: true,
      address: "C-Scheme, Jaipur"
    });

    review1 = await db.Review.create({
      user_id: customerUser.id,
      artist_id: artistProfileA.id,
      booking_id: booking.id,
      rating: 5,
      comment: "Exceptional design and quality henna!",
      is_verified: false
    });
  });

  it("1. Artist Master List: Dynamic database-backed list returned", async () => {
    const list = await AdminService.getAllArtists();
    assert.ok(list.length >= 2);
    const foundA = list.find((a) => a.id === artistProfileA.id);
    assert.ok(foundA);
    assert.equal(foundA.verification_status, "PENDING");
  });

  it("2. Pending KYC Queue: Returns only unapproved/pending artists with document details", async () => {
    const pendingList = await AdminService.getPendingArtists();
    assert.ok(pendingList.length >= 2);
    const pendingA = pendingList.find((p) => p.id === artistProfileA.id);
    assert.ok(pendingA);
    assert.equal(pendingA.verification_status, "PENDING");
    assert.equal(pendingA.aadhaar_number, "1234-5678-9012");
  });

  it("3. KYC Approval Flow & Audit Log: Admin approves Artist A -> Status APPROVED and AuditLog created", async () => {
    const approved = await AdminService.approveArtist(artistProfileA.id, adminUser.id);
    assert.equal(approved, true);

    const updatedA = await db.ArtistProfile.findByPk(artistProfileA.id);
    assert.equal(updatedA.verification_status, "APPROVED");
    assert.equal(updatedA.is_available, true);

    // Verify AuditLog entry
    const audit = await db.AuditLog.findOne({
      where: { admin_id: adminUser.id, action: "KYC_APPROVAL" }
    });
    assert.ok(audit);
    const details = JSON.parse(audit.details);
    assert.equal(details.artist_id, artistProfileA.id);
    assert.equal(details.new_status, "APPROVED");
  });

  it("4. KYC Rejection Flow & Audit Log: Admin rejects Artist B with reason -> Status REJECTED, reason persisted, AuditLog created", async () => {
    const rejectionReason = "Aadhaar photo is blurred. Please upload high-resolution copy.";
    const rejected = await AdminService.rejectArtist(artistProfileB.id, rejectionReason, adminUser.id);
    assert.equal(rejected, true);

    const updatedB = await db.ArtistProfile.findByPk(artistProfileB.id);
    assert.equal(updatedB.verification_status, "REJECTED");
    assert.equal(updatedB.rejection_reason, rejectionReason);

    const audit = await db.AuditLog.findOne({
      where: { admin_id: adminUser.id, action: "KYC_REJECTION" }
    });
    assert.ok(audit);
    const details = JSON.parse(audit.details);
    assert.equal(details.artist_id, artistProfileB.id);
    assert.equal(details.rejection_reason, rejectionReason);
  });

  it("5. Artist Suspension Flow: Admin suspends Artist A -> is_available: false, AuditLog created", async () => {
    const suspensionReason = "Policy violation reported by client.";
    const suspended = await AdminService.suspendArtist(artistProfileA.id, suspensionReason, adminUser.id);
    assert.equal(suspended, true);

    const updatedA = await db.ArtistProfile.findByPk(artistProfileA.id);
    assert.equal(updatedA.is_available, false);

    const audit = await db.AuditLog.findOne({
      where: { admin_id: adminUser.id, action: "ARTIST_SUSPENSION" }
    });
    assert.ok(audit);
    const details = JSON.parse(audit.details);
    assert.equal(details.artist_id, artistProfileA.id);
    assert.equal(details.reason, suspensionReason);
  });

  it("6. Artist Reactivation Flow: Admin reactivates Artist A -> is_available: true, AuditLog created", async () => {
    const reactivated = await AdminService.reactivateArtist(artistProfileA.id, adminUser.id);
    assert.equal(reactivated, true);

    const updatedA = await db.ArtistProfile.findByPk(artistProfileA.id);
    assert.equal(updatedA.is_available, true);
    assert.equal(updatedA.verification_status, "APPROVED");

    const audit = await db.AuditLog.findOne({
      where: { admin_id: adminUser.id, action: "ARTIST_REACTIVATION" }
    });
    assert.ok(audit);
  });

  it("7. Bookings Inspection: Admin fetches all platform bookings with customer and artist associations", async () => {
    const bookings = await AdminService.getAllBookings();
    assert.ok(bookings.length >= 1);
    assert.equal(bookings[0].booking_code, "MG-120101");
    assert.ok(bookings[0].user);
    assert.ok(bookings[0].artist);
  });

  it("8. Review Moderation: Admin approves review", async () => {
    if (review1) {
      const approved = await AdminService.approveReview(review1.id);
      assert.ok(approved);
      assert.equal(approved.is_verified, true);
    }
  });

  it("9. Audit Log History: All admin actions are traceable with timestamps and actor IDs", async () => {
    const logs = await db.AuditLog.findAll({
      where: { admin_id: adminUser.id },
      order: [["createdAt", "ASC"]]
    });
    assert.ok(logs.length >= 4);
    const actions = logs.map((l) => l.action);
    assert.ok(actions.includes("KYC_APPROVAL"));
    assert.ok(actions.includes("KYC_REJECTION"));
    assert.ok(actions.includes("ARTIST_SUSPENSION"));
    assert.ok(actions.includes("ARTIST_REACTIVATION"));
  });

  it("10. Zero Dummy Admin Data: Admin metrics and lists derive strictly from real DB rows", async () => {
    const stats = await AdminService.getStats();
    assert.ok(typeof stats.totalUsers === "number");
    assert.ok(typeof stats.totalArtists === "number");
    assert.ok(typeof stats.totalBookings === "number");
    assert.ok(stats.totalArtists >= 2);
  });
});
