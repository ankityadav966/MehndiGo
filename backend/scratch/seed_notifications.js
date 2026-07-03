const db = require("../models");

async function seed() {
  try {
    const users = await db.User.findAll();
    console.log(`Found ${users.length} users in database. Seeding dummy notifications...`);

    for (const user of users) {
      // Clean old notifications first to keep database clean
      await db.Notification.destroy({ where: { user_id: user.id } });

      await db.Notification.create({
        user_id: user.id,
        title: "Welcome to MehandiGo! 🎉",
        message: "Thank you for registering on MehandiGo. Explore trending Mehendi artists near you and book your first session today!",
        type: "SYSTEM",
        is_read: false
      });

      await db.Notification.create({
        user_id: user.id,
        title: "Booking Completed 📅",
        message: "Your booking request for Bridal Mehendi session has been successfully completed. Share your experience by leaving a review!",
        type: "BOOKING",
        is_read: false
      });

      await db.Notification.create({
        user_id: user.id,
        title: "Cashback Credited! 💰",
        message: "Congratulations! A cashback of ₹150 has been credited to your MehandiGo wallet for using code WELCOME50.",
        type: "PAYMENT",
        is_read: false
      });

      await db.Notification.create({
        user_id: user.id,
        title: "Tej Festival Offer! 🌺",
        message: "Get flat 20% discount on all Bridal and Rajasthani Mehendi categories. Use code TEEJ20 during checkout.",
        type: "PROMOTION",
        is_read: false
      });
      
      console.log(`Seeded 4 notifications for User ID: ${user.id} (${user.name})`);
    }

    console.log("Dummy notifications seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
