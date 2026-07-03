const db = require("./models");

async function seed() {
  try {
    await db.sequelize.authenticate();
    console.log("Database connected successfully.");

    // Clear existing
    await db.Coupon.destroy({ where: {}, truncate: true, cascade: true });

    // Seed test coupons
    await db.Coupon.bulkCreate([
      {
        code: "TEEJ20",
        discount_percentage: 20,
        max_discount: 500,
        min_booking_value: 1000,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        is_active: true
      },
      {
        code: "MEHANDI100",
        discount_percentage: 10,
        max_discount: 1000,
        min_booking_value: 1500,
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        is_active: true
      },
      {
        code: "EXPIRED50",
        discount_percentage: 50,
        max_discount: 2000,
        min_booking_value: 500,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
        is_active: true
      }
    ]);

    console.log("Promotional coupons seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed coupons:", error);
    process.exit(1);
  }
}

seed();
