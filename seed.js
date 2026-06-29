const db = require("./models");
const crypto = require("crypto");

const indianNamesFirst = ["Aarav", "Vihaan", "Aditya", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Shaurya", "Atharv", "Diya", "Pari", "Ananya", "Aadhya", "Kyra", "Kavya", "Avni", "Saanvi", "Neha", "Pooja"];
const indianNamesLast = ["Sharma", "Verma", "Gupta", "Singh", "Patel", "Kumar", "Yadav", "Jain", "Choudhary", "Reddy", "Mehta", "Bansal", "Agarwal", "Mishra", "Joshi"];
const categories = ["Bridal", "Arabic", "Indo-Arabic", "Moroccan", "Rajasthani", "Minimalist", "Portrait", "Floral", "Jewelry", "Geometrical"];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generatePhone = () => "9" + Math.floor(100000000 + Math.random() * 900000000).toString();
const generateEmail = (name) => `${name.toLowerCase().replace(/[^a-z]/g, "")}${Math.floor(Math.random() * 1000)}@example.com`;

async function seed() {
  console.log("Starting comprehensive database seeding...");
  
  try {
    // Sync models (ensuring schema is synchronized)
    await db.sequelize.sync({ force: true });
    
    // Clear old seed data
    await db.Message.destroy({ where: {} });
    await db.Review.destroy({ where: {} });
    await db.Payment.destroy({ where: {} });
    await db.Booking.destroy({ where: {} });
    await db.AvailabilitySlot.destroy({ where: {} });
    await db.Service.destroy({ where: {} });
    await db.ArtistProfile.destroy({ where: {} });
    await db.Otp.destroy({ where: {} });
    await db.User.destroy({ where: {} });
    
    console.log("Database cleared.");

    // 1. Create System Admin
    const adminPasswordHash = crypto.createHash("sha256").update("admin123").digest("hex");
    const admin = await db.User.create({
      name: "System Admin",
      phone: "6350650966",
      role: "ADMIN",
      is_verified: true,
      email: "ankityadav941318@gmail.com",
      password: adminPasswordHash
    });
    console.log("Admin seeded: Phone 6350650966, Email ankityadav941318@gmail.com");

    // 2. Create 10 Users
    let users = [];
    for (let i = 1; i <= 10; i++) {
      const name = `${getRandom(indianNamesFirst)} ${getRandom(indianNamesLast)}`;
      const user = await db.User.create({
        name: name,
        phone: generatePhone(),
        role: "USER",
        is_verified: true,
        email: generateEmail(name),
        profile_image: `https://i.pravatar.cc/150?u=${i}`
      });
      users.push(user);
    }
    console.log("10 Users seeded.");

    // 3. Create 10 Artists
    let artists = [];
    let artistProfiles = [];
    for (let i = 11; i <= 20; i++) {
      const name = `${getRandom(indianNamesFirst)} ${getRandom(indianNamesLast)}`;
      const artistUser = await db.User.create({
        name: name,
        phone: generatePhone(),
        role: "ARTIST",
        is_verified: true,
        email: generateEmail(name),
        profile_image: `https://i.pravatar.cc/150?u=${i}`
      });
      artists.push(artistUser);

      const profile = await db.ArtistProfile.create({
        user_id: artistUser.id,
        bio: `Experienced Mehndi designer specializing in ${getRandom(categories)} designs.`,
        experience_years: Math.floor(Math.random() * 10) + 1,
        home_service: Math.random() > 0.5,
        salon_service: Math.random() > 0.5,
        verification_status: "APPROVED",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "30200" + Math.floor(Math.random() * 9),
        location: "Jaipur, Rajasthan",
        avg_rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
        total_reviews: Math.floor(Math.random() * 50),
        total_bookings: Math.floor(Math.random() * 100)
      });
      artistProfiles.push(profile);
    }
    console.log("10 Artists and Profiles seeded.");

    // 4. Create Services for Artists
    for (const profile of artistProfiles) {
      for (let j = 0; j < 3; j++) {
        await db.Service.create({
          artist_id: profile.id,
          specialization_name: `${getRandom(categories)} Mehndi`,
          category: getRandom(categories),
          description: "High-quality intricate mehndi design for special occasions.",
          minimum_price: Math.floor(Math.random() * 3000) + 500,
          duration_minutes: Math.floor(Math.random() * 120) + 60,
          is_home_service: profile.home_service,
          is_active: true
        });
      }
    }
    console.log("Services seeded.");

    // 5. Create Availability Slots
    const today = new Date();
    for (const profile of artistProfiles) {
      for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
        const d1 = new Date(today);
        d1.setDate(today.getDate() + dayOffset);
        d1.setHours(10, 0, 0, 0);
        const d1_end = new Date(d1);
        d1_end.setHours(13, 0, 0, 0);
        
        await db.AvailabilitySlot.create({
          artist_id: profile.id,
          start_time: d1,
          end_time: d1_end,
          is_booked: false
        });
      }
    }
    console.log("Availability Slots seeded.");

    // 6. Create Bookings & Reviews
    for (let i = 0; i < 15; i++) {
      const user = getRandom(users);
      const artistProfile = getRandom(artistProfiles);
      
      const d = new Date(today);
      d.setDate(today.getDate() - Math.floor(Math.random() * 30)); // past booking
      
      const service = await db.Service.findOne({ where: { artist_id: artistProfile.id } });
      const service_id = service ? service.id : 1;
      const total_amount = Math.floor(Math.random() * 3000) + 500;

      const booking = await db.Booking.create({
        booking_code: "BK" + Math.floor(100000 + Math.random() * 900000),
        user_id: user.id,
        artist_id: artistProfile.id,
        service_id: service_id,
        scheduled_date: d,
        booking_status: "COMPLETED",
        total_price: total_amount,
        advance_paid: Math.floor(total_amount * 0.2),
        remaining_amount: total_amount - Math.floor(total_amount * 0.2),
        address: "User Address",
        payment_status: "PAID"
      });

      await db.Review.create({
        user_id: user.id,
        artist_id: artistProfile.id,
        booking_id: booking.id,
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5
        comment: "Amazing work, loved the design!"
      });
    }

    for (let i = 0; i < 5; i++) { // Upcoming Bookings
      const user = getRandom(users);
      const artistProfile = getRandom(artistProfiles);
      
      const d = new Date(today);
      d.setDate(today.getDate() + Math.floor(Math.random() * 10) + 1); // future booking
      
      const service = await db.Service.findOne({ where: { artist_id: artistProfile.id } });
      const service_id = service ? service.id : 1;
      const total_amount = Math.floor(Math.random() * 3000) + 500;

      await db.Booking.create({
        booking_code: "BK" + Math.floor(100000 + Math.random() * 900000),
        user_id: user.id,
        artist_id: artistProfile.id,
        service_id: service_id,
        scheduled_date: d,
        booking_status: "CONFIRMED",
        total_price: total_amount,
        advance_paid: Math.floor(total_amount * 0.2),
        remaining_amount: total_amount - Math.floor(total_amount * 0.2),
        address: "User Address",
        payment_status: "PENDING"
      });
    }
    console.log("Bookings and Reviews seeded.");

    console.log("Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
