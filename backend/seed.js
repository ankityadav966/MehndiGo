const db = require("./models");

async function seed() {
  console.log("Starting database seeding...");
  
  try {
    // Sync models (ensuring schema is synchronized)
    await db.sequelize.sync();

    // Clear old seed data using TRUNCATE CASCADE to avoid foreign key violations
    await db.sequelize.query('TRUNCATE TABLE "Messages", "Reviews", "Payments", "Bookings", "AvailabilitySlots", "Services", "artist_profiles", "Otps", "Users" CASCADE');

    // Set phone to nullable and email to non-nullable
    await db.sequelize.query('ALTER TABLE "Users" ALTER COLUMN "phone" DROP NOT NULL');
    await db.sequelize.query('ALTER TABLE "Users" ALTER COLUMN "email" SET NOT NULL');
    console.log("Database cleared via CASCADE.");

    // 1. Create System Admin
    const crypto = require("crypto");
    const adminPasswordHash = crypto.createHash("sha256").update("admin123").digest("hex");
    const admin = await db.User.create({
      id: 1,
      name: "System Admin",
      phone: "6350650966",
      role: "ADMIN",
      is_verified: true,
      email: "ankityadav941318@gmail.com",
      password: adminPasswordHash
    });
    console.log("Admin seeded: Phone 6350650966, Email ankityadav941318@gmail.com");

    // 2. Create Customer User
    const customer = await db.User.create({
      id: 2,
      name: "Rani Sharma",
      phone: "7777777777",
      role: "USER",
      is_verified: true,
      email: "rani@gmail.com"
    });
    console.log("Customer seeded: Phone 7777777777");

    // 3. Create Artist User
    const artistUser = await db.User.create({
      id: 3,
      name: "Pooja Sharma",
      phone: "8888888888",
      role: "ARTIST",
      is_verified: true,
      email: "pooja@mehndi.com",
      profile_image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400"
    });
    console.log("Artist User seeded: Phone 8888888888");

    // 4. Create Artist Profile
    const artistProfile = await db.ArtistProfile.create({
      id: 1,
      user_id: artistUser.id,
      bio: "Award-winning Bridal Mehndi designer specializing in traditional Rajasthani, intricate Arabic, and modern portrait mehndi patterns with 5+ years of experience.",
      experience_years: 5,
      home_service: true,
      salon_service: false,
      verification_status: "APPROVED", // Pre-approved for instant display
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
      location: "Malviya Nagar, Jaipur",
      avg_rating: 4.8,
      total_reviews: 1,
      total_bookings: 1,
      latitude: 26.9124,
      longitude: 75.7873
    });
    console.log("Artist Profile seeded.");

    // 5. Create Services
    const svc1 = await db.Service.create({
      id: 1,
      artist_id: artistProfile.id,
      specialization_name: "Full Bridal Rajkumari Mehndi",
      category: "Bridal",
      description: "Intricate traditional royal portrait style covering front and back hands up to elbows.",
      minimum_price: 5000,
      duration_minutes: 180,
      is_home_service: true,
      is_active: true
    });
    
    const svc2 = await db.Service.create({
      id: 2,
      artist_id: artistProfile.id,
      specialization_name: "Festive Arabic Mehndi Pattern",
      category: "Arabic",
      description: "Elegant floral diagonal patterns on palms and fingers for festivals.",
      minimum_price: 1200,
      duration_minutes: 45,
      is_home_service: true,
      is_active: true
    });
    console.log("Artist Services seeded.");

    // 6. Create Availability Slots
    const today = new Date();
    
    // Slot 1: Tomorrow at 10:00 AM
    const d1 = new Date(today);
    d1.setDate(today.getDate() + 1);
    d1.setHours(10, 0, 0, 0);
    const d1_end = new Date(d1);
    d1_end.setHours(13, 0, 0, 0);
    
    await db.AvailabilitySlot.create({
      id: 1,
      artist_id: artistProfile.id,
      start_time: d1,
      end_time: d1_end,
      is_booked: false
    });

    // Slot 2: Tomorrow at 2:00 PM
    const d2 = new Date(today);
    d2.setDate(today.getDate() + 1);
    d2.setHours(14, 0, 0, 0);
    const d2_end = new Date(d2);
    d2_end.setHours(17, 0, 0, 0);

    await db.AvailabilitySlot.create({
      id: 2,
      artist_id: artistProfile.id,
      start_time: d2,
      end_time: d2_end,
      is_booked: false
    });

    // Slot 3: Day after tomorrow at 11:00 AM
    const d3 = new Date(today);
    d3.setDate(today.getDate() + 2);
    d3.setHours(11, 0, 0, 0);
    const d3_end = new Date(d3);
    d3_end.setHours(14, 0, 0, 0);

    await db.AvailabilitySlot.create({
      id: 3,
      artist_id: artistProfile.id,
      start_time: d3,
      end_time: d3_end,
      is_booked: false
    });
    console.log("Availability Slots seeded.");

    // 7. Create Portfolios
    await db.Portfolio.create({
      id: 1,
      artist_id: artistProfile.id,
      image_url: "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=400",
      caption: "Traditional Bridal Full Hand peacock design"
    });
    await db.Portfolio.create({
      id: 2,
      artist_id: artistProfile.id,
      image_url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=400",
      caption: "Intricate Arabic floral pattern"
    });
    console.log("Portfolio images seeded.");

    console.log("Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
