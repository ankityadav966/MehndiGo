const db = require("./models");
const crypto = require("crypto");

async function seed() {
  console.log("Starting expanded database seeding...");
  
  try {
    try { await db.sequelize.query('PRAGMA foreign_keys = OFF;'); } catch(e){}
    await db.sequelize.sync({ force: true });
    try { await db.sequelize.query('PRAGMA foreign_keys = ON;'); } catch(e){}
    // Clear old data in order
    console.log("Cleaning existing database tables...");
    await db.Message.destroy({ where: {} });
    await db.Review.destroy({ where: {} });
    await db.Payment.destroy({ where: {} });
    if (db.Invoice) await db.Invoice.destroy({ where: {} });
    if (db.Refund) await db.Refund.destroy({ where: {} });
    if (db.Settlement) await db.Settlement.destroy({ where: {} });
    await db.Transaction.destroy({ where: {} });
    if (db.WalletTransaction) await db.WalletTransaction.destroy({ where: {} });
    await db.Booking.destroy({ where: {} });
    await db.Portfolio.destroy({ where: {} });
    await db.Favorite.destroy({ where: {} });
    await db.AvailabilitySlot.destroy({ where: {} });
    await db.Service.destroy({ where: {} });
    await db.ArtistProfile.destroy({ where: {} });
    await db.Otp.destroy({ where: {} });
    if (db.Notification) await db.Notification.destroy({ where: {} });
    if (db.Wallet) await db.Wallet.destroy({ where: {} });
    if (db.Coupon) await db.Coupon.destroy({ where: {} });
    await db.User.destroy({ where: {} });
    
    console.log("Database cleared.");

    // Helper for hashes
    const adminPasswordHash = crypto.createHash("sha256").update("admin123").digest("hex");
    const userPasswordHash = crypto.createHash("sha256").update("123456").digest("hex");

    // 1. Create System Admin
    await db.User.create({
      id: 1,
      name: "System Admin",
      phone: "6350650966",
      role: "ADMIN",
      is_verified: true,
      email: "ankityadav941318@gmail.com",
      password: adminPasswordHash
    });
    console.log("Admin seeded: Phone 6350650966");

    // 2. Create Customers
    const customer1 = await db.User.create({
      id: 2,
      name: "Rani Sharma",
      phone: "7777777777",
      role: "USER",
      is_verified: true,
      email: "rani@gmail.com",
      password: userPasswordHash
    });

    const customer2 = await db.User.create({
      id: 4,
      name: "Priya Patel",
      phone: "9999999999",
      role: "USER",
      is_verified: true,
      email: "priya@gmail.com",
      password: userPasswordHash
    });

    const customer3 = await db.User.create({
      id: 5,
      name: "Neha Mehta",
      phone: "9876543210",
      role: "USER",
      is_verified: true,
      email: "neha@gmail.com",
      password: userPasswordHash
    });
    console.log("Customers seeded.");

    // 3. Create Artists Users
    const artistUser1 = await db.User.create({
      id: 3,
      name: "Pooja Sharma",
      phone: "8888888888",
      role: "ARTIST",
      is_verified: true,
      email: "pooja@mehndi.com",
      password: userPasswordHash,
      profile_image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400"
    });

    const artistUser2 = await db.User.create({
      id: 6,
      name: "Aisha Khan",
      phone: "8888888889",
      role: "ARTIST",
      is_verified: true,
      email: "aisha@mehndi.com",
      password: userPasswordHash,
      profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400"
    });

    const artistUser3 = await db.User.create({
      id: 7,
      name: "Kiran Rajput",
      phone: "8888888890",
      role: "ARTIST",
      is_verified: true,
      email: "kiran@mehndi.com",
      password: userPasswordHash,
      profile_image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400"
    });

    const artistUser4 = await db.User.create({
      id: 8,
      name: "Shalu Saini",
      phone: "8888888891",
      role: "ARTIST",
      is_verified: true,
      email: "shalu@mehndi.com",
      password: userPasswordHash,
      profile_image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400"
    });

    const artistUser5 = await db.User.create({
      id: 9,
      name: "Preeti Vyas",
      phone: "8888888892",
      role: "ARTIST",
      is_verified: true,
      email: "preeti@mehndi.com",
      password: userPasswordHash,
      profile_image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400"
    });
    console.log("Artists Users seeded.");

    // 4. Create Artist Profiles
    const ap1 = await db.ArtistProfile.create({
      id: 1,
      user_id: artistUser1.id,
      bio: "Award-winning Bridal Mehndi designer specializing in traditional Rajasthani, intricate Arabic, and modern portrait mehndi patterns with 5+ years of experience.",
      experience_years: 5,
      home_service: true,
      salon_service: false,
      verification_status: "APPROVED",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
      location: "Malviya Nagar, Jaipur",
      avg_rating: 4.8,
      total_reviews: 2,
      total_bookings: 5,
      cover_image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=600",
      latitude: 26.91240000,
      longitude: 75.78730000
    });

    const ap2 = await db.ArtistProfile.create({
      id: 2,
      user_id: artistUser2.id,
      bio: "Famous for modern Arabic and Indo-Arabic mehndi styles. Quick hands, gorgeous bold highlights, and clean modern styling for festivals and casual celebrations.",
      experience_years: 4,
      home_service: true,
      salon_service: true,
      verification_status: "APPROVED",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302015",
      location: "C-Scheme, Jaipur",
      avg_rating: 4.9,
      total_reviews: 1,
      total_bookings: 3,
      cover_image: "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=600",
      latitude: 26.91500000,
      longitude: 75.79000000
    });

    const ap3 = await db.ArtistProfile.create({
      id: 3,
      user_id: artistUser3.id,
      bio: "Express speed mehndi services for large family groups and weddings. Specialty in Indo-Western designer patterns, motifs, and glitter mehndi highlights.",
      experience_years: 7,
      home_service: true,
      salon_service: false,
      verification_status: "APPROVED",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302018",
      location: "Raja Park, Jaipur",
      avg_rating: 4.5,
      total_reviews: 1,
      total_bookings: 2,
      cover_image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600",
      latitude: 26.92000000,
      longitude: 75.78000000
    });

    const ap4 = await db.ArtistProfile.create({
      id: 4,
      user_id: artistUser4.id,
      bio: "Exclusive portrait designer. Creator of complex bride & groom portraits, custom logos, and custom request scenes for weddings and special occasions.",
      experience_years: 6,
      home_service: true,
      salon_service: true,
      verification_status: "APPROVED",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302020",
      location: "Vaishali Nagar, Jaipur",
      avg_rating: 4.7,
      total_reviews: 1,
      total_bookings: 4,
      cover_image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600",
      latitude: 26.90000000,
      longitude: 75.77000000
    });

    const ap5 = await db.ArtistProfile.create({
      id: 5,
      user_id: artistUser5.id,
      bio: "Specialist in heritage Rajasthani and Marwari mehndi layouts. Intricate jaal patterns, lines, checks, and traditional peacock designs with premium organic henna dye.",
      experience_years: 8,
      home_service: true,
      salon_service: false,
      verification_status: "APPROVED",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302004",
      location: "Adarsh Nagar, Jaipur",
      avg_rating: 4.6,
      total_reviews: 0,
      total_bookings: 0,
      cover_image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=600",
      latitude: 26.89000000,
      longitude: 75.80000000
    });
    console.log("Artist Profiles seeded.");

    // 5. Create Services
    // AP1
    const svc1 = await db.Service.create({
      id: 1,
      artist_id: ap1.id,
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
      artist_id: ap1.id,
      specialization_name: "Festive Arabic Mehndi Pattern",
      category: "Arabic",
      description: "Elegant floral diagonal patterns on palms and fingers for festivals.",
      minimum_price: 1200,
      duration_minutes: 45,
      is_home_service: true,
      is_active: true
    });

    // AP2
    const svc3 = await db.Service.create({
      id: 3,
      artist_id: ap2.id,
      specialization_name: "Bold Arabic Fusion Mehndi",
      category: "Arabic",
      description: "Thick bold outlines with delicate interior patterns on front and back palms.",
      minimum_price: 1500,
      duration_minutes: 60,
      is_home_service: true,
      is_active: true
    });

    // AP3
    const svc4 = await db.Service.create({
      id: 4,
      artist_id: ap3.id,
      specialization_name: "Indo-Western Floral Pattern",
      category: "Indo-Western",
      description: "Clean modern design blending western motifs with traditional Indian styles.",
      minimum_price: 1800,
      duration_minutes: 90,
      is_home_service: true,
      is_active: true
    });

    // AP4
    const svc5 = await db.Service.create({
      id: 5,
      artist_id: ap4.id,
      specialization_name: "Premium Portrait & Logo Design",
      category: "Portrait",
      description: "Bride and Groom portrait mehndi customized according to your actual photos.",
      minimum_price: 8500,
      duration_minutes: 240,
      is_home_service: true,
      is_active: true
    });
    console.log("Services seeded.");

    // 6. Create Availability Slots
    const today = new Date();
    const slotList = [];

    // Loop over artists 1 to 5
    for (let artistId = 1; artistId <= 5; artistId++) {
      let slotIndex = 1 + (artistId - 1) * 5;
      
      // Day 1 slots
      const d1 = new Date(today);
      d1.setDate(today.getDate() + 1);
      d1.setHours(9, 0, 0, 0);
      const d1_end = new Date(d1);
      d1_end.setHours(12, 0, 0, 0);

      await db.AvailabilitySlot.create({
        id: slotIndex,
        artist_id: artistId,
        start_time: d1,
        end_time: d1_end,
        is_booked: false
      });

      const d2 = new Date(today);
      d2.setDate(today.getDate() + 1);
      d2.setHours(13, 0, 0, 0);
      const d2_end = new Date(d2);
      d2_end.setHours(16, 0, 0, 0);

      await db.AvailabilitySlot.create({
        id: slotIndex + 1,
        artist_id: artistId,
        start_time: d2,
        end_time: d2_end,
        is_booked: false
      });

      // Day 2 slots
      const d3 = new Date(today);
      d3.setDate(today.getDate() + 2);
      d3.setHours(10, 0, 0, 0);
      const d3_end = new Date(d3);
      d3_end.setHours(13, 0, 0, 0);

      await db.AvailabilitySlot.create({
        id: slotIndex + 2,
        artist_id: artistId,
        start_time: d3,
        end_time: d3_end,
        is_booked: false
      });

      const d4 = new Date(today);
      d4.setDate(today.getDate() + 2);
      d4.setHours(14, 0, 0, 0);
      const d4_end = new Date(d4);
      d4_end.setHours(17, 0, 0, 0);

      await db.AvailabilitySlot.create({
        id: slotIndex + 3,
        artist_id: artistId,
        start_time: d4,
        end_time: d4_end,
        is_booked: false
      });
    }
    console.log("Availability Slots seeded.");

    // 7. Create Portfolios
    const pfData = [
      { id: 1, artist_id: 1, url: "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=400", caption: "Bridal peacock patterns" },
      { id: 2, artist_id: 1, url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=400", caption: "Detailed Arabic layout" },
      { id: 3, artist_id: 2, url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400", caption: "Elegant flowy vines" },
      { id: 4, artist_id: 3, url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400", caption: "Contemporary floral wristbands" },
      { id: 5, artist_id: 4, url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400", caption: "Portrait elements" }
    ];

    for (const pf of pfData) {
      await db.Portfolio.create({
        id: pf.id,
        artist_id: pf.artist_id,
        image_url: pf.url,
        caption: pf.caption,
        visibility: true,
        display_order: 1
      });
    }
    console.log("Portfolio items seeded.");

    // 8. Create Bookings (So reviews can reference them)
    // Booking 1 (Completed for review)
    const booking1 = await db.Booking.create({
      id: 1,
      booking_code: "BK-872910",
      user_id: customer1.id,
      artist_id: ap1.id,
      service_id: svc1.id,
      total_price: 5000,
      advance_paid: 1000,
      remaining_amount: 4000,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED"
    });

    // Booking 2 (Completed for review)
    const booking2 = await db.Booking.create({
      id: 2,
      booking_code: "BK-872911",
      user_id: customer2.id,
      artist_id: ap1.id,
      service_id: svc2.id,
      total_price: 1200,
      advance_paid: 200,
      remaining_amount: 1000,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED"
    });

    // Booking 3 (Completed for review)
    const booking3 = await db.Booking.create({
      id: 3,
      booking_code: "BK-872912",
      user_id: customer3.id,
      artist_id: ap2.id,
      service_id: svc3.id,
      total_price: 1500,
      advance_paid: 300,
      remaining_amount: 1200,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED"
    });

    // Booking 4 (Completed for review)
    const booking4 = await db.Booking.create({
      id: 4,
      booking_code: "BK-872913",
      user_id: customer1.id,
      artist_id: ap3.id,
      service_id: svc4.id,
      total_price: 1800,
      advance_paid: 400,
      remaining_amount: 1400,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED"
    });

    // Booking 5 (Completed for review)
    const booking5 = await db.Booking.create({
      id: 5,
      booking_code: "BK-872914",
      user_id: customer2.id,
      artist_id: ap4.id,
      service_id: svc5.id,
      total_price: 8500,
      advance_paid: 1700,
      remaining_amount: 6800,
      booking_status: "COMPLETED",
      payment_status: "PAID",
      detailed_status: "COMPLETED"
    });
    console.log("Completed Bookings seeded.");

    // 9. Create Reviews
    await db.Review.create({
      id: 1,
      booking_id: booking1.id,
      user_id: customer1.id,
      artist_id: ap1.id,
      rating: 5,
      comment: "Absolutely gorgeous bridal mehndi! Pooja was highly professional, detail-oriented, and kept checking if I was comfortable. Worth every rupee!",
      design_quality_rating: 5,
      punctuality_rating: 5,
      professionalism_rating: 5,
      helpful_count: 2
    });

    await db.Review.create({
      id: 2,
      booking_id: booking2.id,
      user_id: customer2.id,
      artist_id: ap1.id,
      rating: 4,
      comment: "Very clean work, the Arabic fusion pattern looked stunning. Deducted 1 star because she arrived 15 minutes late, but the art was brilliant.",
      design_quality_rating: 5,
      punctuality_rating: 3,
      professionalism_rating: 4,
      helpful_count: 0
    });

    await db.Review.create({
      id: 3,
      booking_id: booking3.id,
      user_id: customer3.id,
      artist_id: ap2.id,
      rating: 5,
      comment: "Aisha is extremely fast! Her bold strokes are unmatched. The color turned out incredibly dark overnight. Highly recommend her services.",
      design_quality_rating: 5,
      punctuality_rating: 5,
      professionalism_rating: 5,
      helpful_count: 1
    });

    await db.Review.create({
      id: 4,
      booking_id: booking4.id,
      user_id: customer1.id,
      artist_id: ap3.id,
      rating: 4,
      comment: "Loved the Indo-Western combination. The design was clean and the team was supportive.",
      design_quality_rating: 4,
      punctuality_rating: 5,
      professionalism_rating: 4,
      helpful_count: 0
    });

    await db.Review.create({
      id: 5,
      booking_id: booking5.id,
      user_id: customer2.id,
      artist_id: ap4.id,
      rating: 5,
      comment: "Mindblowing portrait designs! The bride and groom faces matched our actual photos beautifully. She has magic in her hands.",
      design_quality_rating: 5,
      punctuality_rating: 5,
      professionalism_rating: 5,
      helpful_count: 3
    });
    console.log("Reviews and ratings seeded.");

    // 10. Create Coupons
    await db.Coupon.create({
      id: 1,
      code: "TEEJ20",
      discount_type: "PERCENTAGE",
      discount_percentage: 20,
      max_discount: 1000,
      min_booking_value: 500,
      expires_at: new Date("2028-12-31T23:59:59.000Z"),
      is_active: true,
      per_user_limit: 5,
      usage_limit: 100,
      first_booking_only: false
    });

    await db.Coupon.create({
      id: 2,
      code: "BRIDAL500",
      discount_type: "FLAT",
      discount_value: 500,
      max_discount: 500,
      min_booking_value: 3000,
      expires_at: new Date("2028-12-31T23:59:59.000Z"),
      is_active: true,
      per_user_limit: 5,
      usage_limit: 100,
      first_booking_only: false
    });

    await db.Coupon.create({
      id: 3,
      code: "WELCOME50",
      discount_type: "PERCENTAGE",
      discount_percentage: 50,
      max_discount: 200,
      min_booking_value: 300,
      expires_at: new Date("2028-12-31T23:59:59.000Z"),
      is_active: true,
      per_user_limit: 1,
      usage_limit: 500,
      first_booking_only: true
    });
    console.log("Coupons seeded.");

    console.log("Resetting PostgreSQL primary key sequences...");
    const tablesToReset = ['"Users"', 'artist_profiles', '"Bookings"', '"Services"', '"Portfolios"', '"Reviews"', '"Otps"', '"AvailabilitySlots"', '"Coupons"'];
    for (const tbl of tablesToReset) {
      try {
        await db.sequelize.query(`SELECT setval(pg_get_serial_sequence('${tbl}', 'id'), COALESCE((SELECT MAX(id) FROM ${tbl}), 1));`);
      } catch (e) {}
    }

    console.log("Database expanded seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
