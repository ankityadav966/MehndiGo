require("dotenv").config();
const db = require("../models");
const connectMongoDB = require("../config/mongodb");
const BookingService = require("../services/booking.services");

async function runBookingTests() {
  console.log("Starting Booking Creation API Validations Test...");

  // 1. Connect DBs
  await connectMongoDB();
  await new Promise(r => setTimeout(r, 1000));

  try {
    // 2. Setup Test Entities in PostgreSQL
    console.log("\n[Test Setup] Preparing user, artist, and slots...");
    
    // Create a fresh test customer with a random phone to avoid DB constraints conflicts
    const customerPhone = "+91" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const customer = await db.User.create({
      name: "Test Customer " + Date.now().toString().slice(-4),
      phone: customerPhone,
      email: `customer_${Date.now()}@test.com`,
      role: "USER",
      is_verified: true
    });

    // Find or create test artist user
    let artistUser = await db.User.findOne({ where: { phone: "9999999992" } });
    if (!artistUser) {
      artistUser = await db.User.create({
        name: "Test Artist User",
        phone: "9999999992",
        email: "artist@test.com",
        role: "ARTIST",
        is_verified: true
      });
    }

    // Find or create artist profile
    let artistProfile = await db.ArtistProfile.findOne({ where: { user_id: artistUser.id } });
    if (!artistProfile) {
      artistProfile = await db.ArtistProfile.create({
        user_id: artistUser.id,
        bio: "Test bio",
        experience_years: 5,
        verification_status: "APPROVED",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        location: "Jaipur"
      });
    }

    // Find or create test service
    let service = await db.Service.findOne({ where: { artist_id: artistProfile.id } });
    if (!service) {
      service = await db.Service.create({
        artist_id: artistProfile.id,
        specialization_name: "Bridal Mehndi",
        category: "Bridal",
        minimum_price: 1500,
        duration_minutes: 120
      });
    }

    // Create a fresh unbooked slot
    const slot = await db.AvailabilitySlot.create({
      artist_id: artistProfile.id,
      start_time: new Date(),
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
      is_booked: false
    });

    console.log(`Setup complete. Customer ID: ${customer.id}, Artist ID: ${artistProfile.id}, Slot ID: ${slot.id}`);

    // 3. Test scenario A: Normal Booking
    console.log("\n[Test 1] Testing normal booking creation...");
    const payload = {
      serviceId: service.id,
      artistId: artistProfile.id,
      slotId: [slot.id],
      address: "Jaipur, India",
      latitude: 26.9124,
      longitude: 75.7873
    };

    const bookingRes = await BookingService.createBooking(customer.id, payload);
    console.log(`✅ Normal booking created successfully! Code: ${bookingRes.booking_code}`);

    // 4. Test scenario B: Already Booked Slot
    console.log("\n[Test 2] Testing duplicate slot booking (should throw error)...");
    try {
      await BookingService.createBooking(customer.id, payload);
      throw new Error("Duplicate booking did not fail as expected!");
    } catch (err) {
      console.log(`✅ Failed successfully as expected. Error: "${err.message}"`);
      if (!err.message.includes("already booked") && !err.message.includes("active booking")) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }

    // 5. Test scenario C: Restricted Booking (User has too many active bookings)
    console.log("\n[Test 3] Testing restricted booking rule (3 or more active bookings)...");
    
    // Create 2 more bookings manually to hit the limit of 3
    for (let i = 0; i < 2; i++) {
      const extraSlot = await db.AvailabilitySlot.create({
        artist_id: artistProfile.id,
        start_time: new Date(),
        end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
        is_booked: true
      });

      await db.Booking.create({
        booking_code: `BKSPAM${i}_${Date.now().toString().slice(-4)}`,
        user_id: customer.id,
        artist_id: artistProfile.id,
        service_id: service.id,
        slot_id: extraSlot.id,
        total_price: 1500,
        advance_paid: 0,
        remaining_amount: 1500,
        booking_status: "CONFIRMED",
        payment_status: "PENDING",
        detailed_status: "PENDING",
        final_amount: 1500,
        address: "Jaipur, India"
      });
    }

    // Attempt a 4th booking (active limit is 3)
    const freshSlot = await db.AvailabilitySlot.create({
      artist_id: artistProfile.id,
      start_time: new Date(),
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
      is_booked: false
    });

    const fourthPayload = {
      serviceId: service.id,
      artistId: artistProfile.id,
      slotId: [freshSlot.id],
      address: "Jaipur, India"
    };

    try {
      await BookingService.createBooking(customer.id, fourthPayload);
      throw new Error("Restricted booking did not fail as expected!");
    } catch (err) {
      console.log(`✅ Failed successfully as expected. Error: "${err.message}"`);
      if (!err.message.includes("Booking restricted")) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }

    console.log("\n🎉 All Booking Creation tests passed successfully! 🚀");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Booking validations test failed:", err.message);
    console.error(err);
    process.exit(1);
  }
}

runBookingTests();
