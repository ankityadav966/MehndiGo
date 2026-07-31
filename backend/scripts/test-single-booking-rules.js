const db = require("../models");
const bookingService = require("../services/booking.services");

async function runBookingRulesTest() {
  console.log("==========================================");
  console.log("MEHNDIGO SINGLE DATE & TIME SLOT BOOKING RULES TEST");
  console.log("==========================================\n");

  try {
    // 1. Setup Test Users, Artist, Service, and Slot
    const [user1] = await db.User.findOrCreate({
      where: { phone: "9998881111" },
      defaults: {
        name: "Customer One",
        email: "customer1@mehndigo.com",
        role: "USER"
      }
    });

    const [user2] = await db.User.findOrCreate({
      where: { phone: "9998882222" },
      defaults: {
        name: "Customer Two",
        email: "customer2@mehndigo.com",
        role: "USER"
      }
    });

    const [artistUser] = await db.User.findOrCreate({
      where: { phone: "9998883333" },
      defaults: {
        name: "Artist Specialist",
        email: "artist_spec@mehndigo.com",
        role: "ARTIST"
      }
    });

    const [artistProfile] = await db.ArtistProfile.findOrCreate({
      where: { user_id: artistUser.id },
      defaults: {
        bio: "Top Mehndi Specialist",
        experience_years: 6
      }
    });

    const [service] = await db.Service.findOrCreate({
      where: { artist_id: artistProfile.id },
      defaults: {
        specialization_name: "Bridal Full Hand Mehndi",
        category: "Bridal",
        minimum_price: 2500,
        duration_minutes: 150
      }
    });

    // Create an available slot
    const slotStartTime = new Date("2026-08-10T14:00:00.000Z");
    const slotEndTime = new Date("2026-08-10T17:00:00.000Z");

    const slot = await db.AvailabilitySlot.create({
      artist_id: artistProfile.id,
      start_time: slotStartTime,
      end_time: slotEndTime,
      is_booked: false
    });

    console.log(`[TEST 1] Created Slot ID: ${slot.id} for Date 2026-08-10 (14:00 - 17:00).`);

    // 2. Test Multi-Slot Array Rejection
    console.log("\n[TEST 2] Testing Multi-Slot Rejection (passing slotId: [1, 2])...");
    try {
      await bookingService.createBooking(user1.id, {
        artistId: artistProfile.id,
        serviceId: service.id,
        slotId: [slot.id, 999],
        address: "Test Address"
      });
      throw new Error("Multi-slot request failed to be rejected by backend!");
    } catch (err) {
      if (err.message.includes("Multi-slot booking is not allowed")) {
        console.log(`✅ Multi-Slot Request Rejected Successfully with message: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // 3. Test Multi-Date String Rejection
    console.log("\n[TEST 3] Testing Multi-Date Rejection (passing selectedDate: '2026-08-10, 2026-08-11')...");
    try {
      await bookingService.createBooking(user1.id, {
        artistId: artistProfile.id,
        serviceId: service.id,
        selectedDate: "2026-08-10, 2026-08-11",
        timeLabel: "02:00 PM",
        address: "Test Address"
      });
      throw new Error("Multi-date request failed to be rejected by backend!");
    } catch (err) {
      if (err.message.includes("Multi-date booking is not allowed")) {
        console.log(`✅ Multi-Date Request Rejected Successfully with message: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // 4. Test Single Slot Booking Creation by User 1
    console.log("\n[TEST 4] Creating Single Slot Booking by User 1...");
    const booking1 = await bookingService.createBooking(user1.id, {
      artistId: artistProfile.id,
      serviceId: service.id,
      slotId: slot.id,
      selectedDate: "2026-08-10",
      timeLabel: "02:00 PM - 05:00 PM",
      address: "123 Main Street, Jaipur"
    });

    console.log(`✅ Booking Created Successfully: Code ${booking1.booking_code}, Final Amount: ₹${booking1.final_amount}`);

    // Check slot state post-booking
    const updatedSlot = await db.AvailabilitySlot.findByPk(slot.id);
    console.log(`Slot is_booked status: ${updatedSlot.is_booked} (Expected: true)`);
    if (!updatedSlot.is_booked) {
      throw new Error("Slot was not marked is_booked = true!");
    }

    // 5. Test Double Booking Protection by User 2 (attempting to book the SAME slot)
    console.log("\n[TEST 5] Testing Double Booking Protection (User 2 attempting to book SAME slot)...");
    try {
      await bookingService.createBooking(user2.id, {
        artistId: artistProfile.id,
        serviceId: service.id,
        slotId: slot.id,
        selectedDate: "2026-08-10",
        timeLabel: "02:00 PM - 05:00 PM",
        address: "456 Side Street, Jaipur"
      });
      throw new Error("Double booking request failed to be blocked!");
    } catch (err) {
      if (err.message.includes("This time slot is no longer available")) {
        console.log(`✅ Double Booking Successfully Blocked! Error Message: "${err.message}"`);
      } else {
        throw err;
      }
    }

    console.log("\n==========================================");
    console.log("🎉 ALL SINGLE DATE & TIME SLOT BOOKING TESTS PASSED 100%!");
    console.log("==========================================\n");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ TEST FAILED WITH ERROR:", error);
    process.exit(1);
  }
}

runBookingRulesTest();
