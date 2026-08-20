"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const ArtistService = require("../services/artist.services");
const CustomerService = require("../services/customer.services");
const BookingService = require("../services/booking.services");

describe("ARTIST MODULE 2: SERVICES + PACKAGES + PRICING + AVAILABILITY INTEGRATION SUITE", () => {
  let approvedArtistUser, approvedArtistProfile;
  let unapprovedArtistUser, unapprovedArtistProfile;
  let rivalArtistUser, rivalArtistProfile;
  let customerUser;
  let bridalCategory, inactiveCategory;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // Seed Categories
    bridalCategory = await db.Category.create({
      name: "Bridal Mehndi",
      slug: "bridal-mehndi",
      status: "ACTIVE"
    });

    inactiveCategory = await db.Category.create({
      name: "Discontinued Style",
      slug: "discontinued-style",
      status: "INACTIVE"
    });

    // Create Customer
    customerUser = await db.User.create({
      name: "Pooja Sharma",
      phone_number: "9876543210",
      email: "pooja@example.com",
      role: "CUSTOMER"
    });

    // Create Approved Artist
    approvedArtistUser = await db.User.create({
      name: "Sunita Verma",
      phone_number: "9876543211",
      email: "sunita@example.com",
      role: "ARTIST"
    });
    approvedArtistProfile = await db.ArtistProfile.create({
      user_id: approvedArtistUser.id,
      bio: "Professional Bridal Artist",
      years_of_experience: 7,
      verification_status: "APPROVED",
      is_active: true,
      is_available: true,
      working_days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      working_start_time: "09:00",
      working_end_time: "20:00",
      break_start_time: "14:00",
      break_end_time: "15:00",
      leave_dates: []
    });

    // Create Unapproved/Pending Artist
    unapprovedArtistUser = await db.User.create({
      name: "Pending Artist",
      phone_number: "9876543212",
      email: "pending@example.com",
      role: "ARTIST"
    });
    unapprovedArtistProfile = await db.ArtistProfile.create({
      user_id: unapprovedArtistUser.id,
      bio: "Newbie Artist",
      years_of_experience: 1,
      verification_status: "PENDING",
      is_active: true,
      is_available: true,
      working_days: ["MONDAY", "TUESDAY", "WEDNESDAY"],
      working_start_time: "10:00",
      working_end_time: "18:00"
    });

    // Create Rival Artist
    rivalArtistUser = await db.User.create({
      name: "Rival Artist",
      phone_number: "9876543213",
      email: "rival@example.com",
      role: "ARTIST"
    });
    rivalArtistProfile = await db.ArtistProfile.create({
      user_id: rivalArtistUser.id,
      bio: "Rival Artist",
      years_of_experience: 5,
      verification_status: "APPROVED",
      is_active: true,
      is_available: true,
      working_days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      working_start_time: "09:00",
      working_end_time: "20:00"
    });
  });

  // ==========================================
  // 1. SERVICE CREATION & VALIDATION
  // ==========================================

  it("1. Approved artist creates a service successfully with packages and addons", async () => {
    const service = await ArtistService.createNewService(approvedArtistUser.id, {
      specialization_name: "Royal Rajasthani Bridal",
      category: "Bridal Mehndi",
      minimum_price: 3500,
      maximum_price: 8000,
      duration_minutes: 180,
      description: "Intricate royal Rajasthani bridal patterns",
      packages: [
        {
          package_name: "Standard Bridal",
          package_price: 4500,
          duration: 180,
          number_of_hands: 2,
          number_of_feet: 2
        }
      ],
      addons: [
        {
          addon_name: "Organic Henna Cone",
          addon_price: 250
        }
      ]
    });

    assert.ok(service.id, "Service ID should exist");
    assert.equal(service.specialization_name, "Royal Rajasthani Bridal");
    assert.equal(service.category, "Bridal Mehndi");
    assert.equal(service.minimum_price, 3500);
    assert.equal(service.packages.length, 1);
    assert.equal(service.packages[0].package_name, "Standard Bridal");
    assert.equal(service.addons.length, 1);
  });

  it("2. Unapproved/Pending artist cannot create a service (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createNewService(unapprovedArtistUser.id, {
          specialization_name: "Pending Service",
          category: "Bridal Mehndi",
          minimum_price: 1500,
          duration_minutes: 60
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /approved artists/i);
        return true;
      }
    );
  });

  it("3. Reject service creation with non-positive or invalid minimum_price", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createNewService(approvedArtistUser.id, {
          specialization_name: "Invalid Price Service",
          category: "Bridal Mehndi",
          minimum_price: -500,
          duration_minutes: 60
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /positive amount/i);
        return true;
      }
    );
  });

  it("4. Reject service creation with invalid duration (< 15 mins or > 720 mins)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createNewService(approvedArtistUser.id, {
          specialization_name: "Zero Duration Service",
          category: "Bridal Mehndi",
          minimum_price: 1500,
          duration_minutes: 5
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /duration must be between 15 and 720/i);
        return true;
      }
    );
  });

  it("5. Reject service creation referencing an INACTIVE category", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createNewService(approvedArtistUser.id, {
          specialization_name: "Old Style Service",
          category: "Discontinued Style",
          minimum_price: 2000,
          duration_minutes: 60
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /inactive/i);
        return true;
      }
    );
  });

  it("6. Prevent duplicate service creation with identical specialization name for the same artist", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createNewService(approvedArtistUser.id, {
          specialization_name: "Royal Rajasthani Bridal",
          category: "Bridal Mehndi",
          minimum_price: 4000,
          duration_minutes: 180
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /already exists/i);
        return true;
      }
    );
  });

  it("7. Reject package with duplicate names or invalid price during service creation", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createNewService(approvedArtistUser.id, {
          specialization_name: "Arabic Floral Elegance",
          category: "Bridal Mehndi",
          minimum_price: 2000,
          duration_minutes: 90,
          packages: [
            { package_name: "Deluxe", package_price: 2500 },
            { package_name: "Deluxe", package_price: 3000 }
          ]
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /duplicate package/i);
        return true;
      }
    );
  });

  // ==========================================
  // 2. SERVICE OWNERSHIP & MANAGEMENT
  // ==========================================

  let createdService;

  it("8. Create second service and verify list fetch", async () => {
    createdService = await ArtistService.createNewService(approvedArtistUser.id, {
      specialization_name: "Arabic Floral Elegance",
      category: "Bridal Mehndi",
      minimum_price: 2200,
      maximum_price: 5000,
      duration_minutes: 90,
      packages: [
        { package_name: "Standard Arabic", package_price: 2500, duration: 90 }
      ]
    });

    const list = await ArtistService.getServicesList(approvedArtistUser.id);
    assert.equal(list.length, 2);
  });

  it("9. Rival artist cannot update another artist's service (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.updateServiceDetails(createdService.id, rivalArtistUser.id, {
          minimum_price: 9999
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /unauthorized/i);
        return true;
      }
    );
  });

  it("10. Author artist can update service details successfully", async () => {
    const updated = await ArtistService.updateServiceDetails(createdService.id, approvedArtistUser.id, {
      minimum_price: 2600,
      duration_minutes: 100
    });

    assert.equal(updated.minimum_price, 2600);
    assert.equal(updated.duration_minutes, 100);
  });

  it("11. Artist toggles service active status and customer visibility updates accordingly", async () => {
    // Deactivate service
    await ArtistService.updateServiceActiveStatus(createdService.id, approvedArtistUser.id, false);

    const activeList = await ArtistService.getCustomerServicesList();
    const found = activeList.find((s) => s.id === createdService.id);
    assert.equal(found, undefined, "Inactive service must not appear in customer list");

    // Reactivate service
    await ArtistService.updateServiceActiveStatus(createdService.id, approvedArtistUser.id, true);
    const activeList2 = await ArtistService.getCustomerServicesList();
    const found2 = activeList2.find((s) => s.id === createdService.id);
    assert.ok(found2, "Reactivated service must appear in customer list");
  });

  it("12. Rival artist cannot delete another artist's service (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.deleteServiceItem(createdService.id, rivalArtistUser.id);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  // ==========================================
  // 3. STANDALONE PACKAGE MANAGEMENT
  // ==========================================

  let standalonePkg;

  it("13. Author artist creates standalone package under service", async () => {
    standalonePkg = await ArtistService.createServicePackage(createdService.id, approvedArtistUser.id, {
      package_name: "Premium Arabic Bridal",
      package_price: 4999,
      duration: 120,
      number_of_hands: 2,
      number_of_feet: 2
    });

    assert.ok(standalonePkg.id);
    assert.equal(standalonePkg.package_name, "Premium Arabic Bridal");
    assert.equal(standalonePkg.package_price, 4999);
  });

  it("14. Rival artist cannot create package under another artist's service (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createServicePackage(createdService.id, rivalArtistUser.id, {
          package_name: "Hacked Package",
          package_price: 100
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  it("15. Reject standalone package with negative or zero price", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createServicePackage(createdService.id, approvedArtistUser.id, {
          package_name: "Free Package",
          package_price: 0
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /positive number/i);
        return true;
      }
    );
  });

  it("16. Author artist updates package details successfully", async () => {
    const updated = await ArtistService.updateServicePackage(standalonePkg.id, approvedArtistUser.id, {
      package_price: 5499
    });

    assert.equal(updated.package_price, 5499);
  });

  it("17. Rival artist cannot update another artist's package (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.updateServicePackage(standalonePkg.id, rivalArtistUser.id, {
          package_price: 100
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  it("18. Author artist deletes package successfully", async () => {
    const res = await ArtistService.deleteServicePackage(standalonePkg.id, approvedArtistUser.id);
    assert.equal(res, true);

    const check = await db.ServicePackage.findByPk(standalonePkg.id);
    assert.equal(check, null);
  });

  // ==========================================
  // 4. AVAILABILITY SCHEDULE & WORKING HOURS
  // ==========================================

  it("19. Get artist availability schedule", async () => {
    const schedule = await ArtistService.getAvailabilitySchedule(approvedArtistUser.id);
    assert.equal(schedule.artist_id, approvedArtistProfile.id);
    assert.equal(schedule.working_start_time, "09:00");
    assert.equal(schedule.working_end_time, "20:00");
    assert.equal(schedule.is_available, true);
  });

  it("20. Update working hours and working days successfully", async () => {
    const updated = await ArtistService.updateAvailabilitySchedule(approvedArtistUser.id, {
      working_days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      working_start_time: "08:00",
      working_end_time: "21:00",
      break_start_time: "13:30",
      break_end_time: "14:30"
    });

    assert.equal(updated.working_start_time, "08:00");
    assert.equal(updated.working_end_time, "21:00");
    assert.equal(updated.break_start_time, "13:30");
    assert.equal(updated.break_end_time, "14:30");
    assert.equal(updated.working_days.includes("SATURDAY"), false);
  });

  it("21. Reject invalid working hours where start_time >= end_time", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.updateAvailabilitySchedule(approvedArtistUser.id, {
          working_start_time: "20:00",
          working_end_time: "09:00"
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /earlier than/i);
        return true;
      }
    );
  });

  it("22. Reject invalid break period outside working hours or start >= end", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.updateAvailabilitySchedule(approvedArtistUser.id, {
          break_start_time: "22:00",
          break_end_time: "23:00"
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /within working hours/i);
        return true;
      }
    );
  });

  it("23. Reject invalid weekday name in working_days", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.updateAvailabilitySchedule(approvedArtistUser.id, {
          working_days: ["MONDAY", "FUNDAY"]
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Invalid weekday/i);
        return true;
      }
    );
  });

  // ==========================================
  // 5. BLOCKED DATES & LEAVE MANAGEMENT
  // ==========================================

  const testLeaveDate = "2026-11-25";

  it("24. Add blocked date (leave date)", async () => {
    const res = await ArtistService.addBlockedDate(approvedArtistUser.id, testLeaveDate);
    assert.ok(res.leave_dates.includes(testLeaveDate));
  });

  it("25. Remove blocked date (unblock)", async () => {
    const res = await ArtistService.removeBlockedDate(approvedArtistUser.id, testLeaveDate);
    assert.equal(res.leave_dates.includes(testLeaveDate), false);
  });

  // ==========================================
  // 6. CUSTOMER AVAILABILITY CALCULATIONS & SLOTS
  // ==========================================

  it("26. Customer gets available slots on a valid working day", async () => {
    // 2026-11-23 is Monday
    const avail = await CustomerService.getArtistAvailability(approvedArtistProfile.id, {
      date: "2026-11-23"
    });

    assert.equal(avail.is_working_day, true);
    assert.equal(avail.is_on_leave, false);
    assert.ok(avail.smart_slots.length > 0);
    const hasAvailable = avail.smart_slots.some((s) => s.is_available === true);
    assert.equal(hasAvailable, true);
  });

  it("27. Customer slots are marked unavailable on non-working day (Saturday)", async () => {
    // 2026-11-28 is Saturday (excluded in test 20)
    const avail = await CustomerService.getArtistAvailability(approvedArtistProfile.id, {
      date: "2026-11-28"
    });

    assert.equal(avail.is_working_day, false);
    const anyAvailable = avail.smart_slots.some((s) => s.is_available === true);
    assert.equal(anyAvailable, false);
  });

  it("28. Customer slots are marked unavailable on blocked leave date", async () => {
    await ArtistService.addBlockedDate(approvedArtistUser.id, "2026-11-24"); // Tuesday

    const avail = await CustomerService.getArtistAvailability(approvedArtistProfile.id, {
      date: "2026-11-24"
    });

    assert.equal(avail.is_on_leave, true);
    const anyAvailable = avail.smart_slots.some((s) => s.is_available === true);
    assert.equal(anyAvailable, false);

    // Cleanup
    await ArtistService.removeBlockedDate(approvedArtistUser.id, "2026-11-24");
  });

  it("29. Customer slots are unavailable when master is_available is false", async () => {
    await ArtistService.updateAvailabilitySchedule(approvedArtistUser.id, { is_available: false });

    const avail = await CustomerService.getArtistAvailability(approvedArtistProfile.id, {
      date: "2026-11-23"
    });

    const anyAvailable = avail.smart_slots.some((s) => s.is_available === true);
    assert.equal(anyAvailable, false);

    // Restore
    await ArtistService.updateAvailabilitySchedule(approvedArtistUser.id, { is_available: true });
  });

  it("30. Customer slots are unavailable for Unapproved/Pending artist", async () => {
    const avail = await CustomerService.getArtistAvailability(unapprovedArtistProfile.id, {
      date: "2026-11-23"
    });

    const anyAvailable = avail.smart_slots.some((s) => s.is_available === true);
    assert.equal(anyAvailable, false);
  });

  // ==========================================
  // 7. HISTORICAL SNAPSHOT & DOUBLE BOOKING PROTECTION
  // ==========================================

  let bookedSlotId;
  let activeBooking;

  it("31. Direct slot creation creates availability slot with approval gate verification", async () => {
    const slot = await ArtistService.createSlot({
      artist_id: approvedArtistUser.id,
      date: "2026-11-23",
      start_time: "10:00:00",
      end_time: "13:00:00"
    });

    assert.ok(slot.id);
    bookedSlotId = slot.id;
  });

  it("32. Pending artist cannot create direct availability slot", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createSlot({
          artist_id: unapprovedArtistUser.id,
          date: "2026-11-23",
          start_time: "10:00:00",
          end_time: "13:00:00"
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  it("33. Customer booking creates immutable snapshot preserving price snapshot", async () => {
    activeBooking = await BookingService.createBooking(customerUser.id, {
      artistId: approvedArtistProfile.id,
      serviceId: createdService.id,
      slotId: bookedSlotId,
      selectedDate: "2026-11-23",
      timeLabel: "10:00 AM",
      selectedArtTitle: "Arabic Floral Pattern",
      selectedArtPrice: 2600,
      selectedArtDuration: 90
    });

    assert.ok(activeBooking.id);
    assert.equal(activeBooking.total_price, 2600);

    // Artist updates service price to 5000
    await ArtistService.updateServiceDetails(createdService.id, approvedArtistUser.id, {
      minimum_price: 5000
    });

    // Historical booking price remains 2600
    const snapshotBooking = await db.Booking.findByPk(activeBooking.id);
    assert.equal(snapshotBooking.total_price, 2600, "Historical booking price snapshot must not mutate");
  });

  it("34. Double booking on the same slot is rejected with 409 Conflict", async () => {
    const anotherCustomer = await db.User.create({
      name: "Ritu Sen",
      phone_number: "9876543299",
      email: "ritu@example.com",
      role: "CUSTOMER"
    });

    await assert.rejects(
      async () => {
        await BookingService.createBooking(anotherCustomer.id, {
          artistId: approvedArtistProfile.id,
          serviceId: createdService.id,
          slotId: bookedSlotId,
          selectedDate: "2026-11-23",
          timeLabel: "10:00 AM"
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /booked or placed on hold/i);
        return true;
      }
    );
  });

  it("35. Cannot delete service with active bookings (soft deactivates instead)", async () => {
    const res = await ArtistService.deleteServiceItem(createdService.id, approvedArtistUser.id);
    assert.equal(res.deactivated, true);

    const checkService = await db.Service.findByPk(createdService.id);
    assert.ok(checkService, "Service record is preserved");
    assert.equal(checkService.is_active, false, "Service is deactivated");
  });
});
