require("dotenv").config();
const db = require("../models");

async function checkAndCleanBookings() {
  try {
    console.log("Checking active bookings in PostgreSQL database...");
    
    // Find users who have bookings
    const bookings = await db.Booking.findAll({
      attributes: ["id", "user_id", "booking_code", "booking_status", "detailed_status"],
      order: [["createdAt", "DESC"]]
    });

    console.log(`Total bookings found: ${bookings.length}`);
    bookings.forEach(b => {
      console.log(` - Booking ID: ${b.id}, User ID: ${b.user_id}, Code: ${b.booking_code}, Status: ${b.booking_status}, Detailed Status: ${b.detailed_status}`);
    });

    // Let's cancel all active bookings (PENDING or CONFIRMED) so that any test user is free to create new bookings
    const result = await db.Booking.update(
      { booking_status: "CANCELLED" },
      {
        where: {
          booking_status: ["PENDING", "CONFIRMED"]
        }
      }
    );
    console.log(`Successfully cancelled ${result[0]} active bookings to reset the restriction limits.`);
    process.exit(0);
  } catch (error) {
    console.error("Error occurred:", error);
    process.exit(1);
  }
}

checkAndCleanBookings();
