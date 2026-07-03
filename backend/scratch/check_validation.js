const db = require("../models");
const BookingService = require("../services/booking.services");

async function runTest() {
  try {
    const payload = {
      artistId: 1,
      serviceId: 1,
      slotId: null,
      address: "Test Address",
      landmark: "Test Landmark",
      notes: "Test Notes",
      couponCode: null,
      latitude: 26.9124,
      longitude: 75.7873,
      selectedDate: "2026-07-03",
      timeLabel: "10:00 AM - 01:00 PM"
    };

    console.log("Simulating BookingService.createBooking with payload:", payload);
    const result = await BookingService.createBooking(4, payload);
    console.log("SUCCESS! Booking created:", result.id);
    process.exit(0);
  } catch (err) {
    console.error("FAILED with error:");
    console.error(err);
    if (err.errors) {
      console.log("Detailed Sequelize Validation errors:");
      err.errors.forEach(e => console.log(` - Field: ${e.path}, Message: ${e.message}, Value: ${e.value}`));
    }
    process.exit(1);
  }
}

runTest();
