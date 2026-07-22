require("dotenv").config();
const db = require("../models");
const jwt = require("jsonwebtoken");

async function testHttpBooking() {
  try {
    // 1. Prepare entities
    console.log("Preparing test data in DB...");
    const customerPhone = "+91" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const customer = await db.User.create({
      name: "Test Customer " + Date.now().toString().slice(-4),
      phone: customerPhone,
      email: `customer_${Date.now()}@test.com`,
      role: "USER",
      is_verified: true
    });

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

    const slot = await db.AvailabilitySlot.create({
      artist_id: artistProfile.id,
      start_time: new Date(),
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
      is_booked: false
    });

    console.log(`Entities created/found. Customer: ${customer.id}, Artist: ${artistProfile.id}, Service: ${service.id}, Slot: ${slot.id}`);

    // 2. Generate token
    const token = jwt.sign({ id: customer.id, role: "USER" }, process.env.JWT_SECRET);
    console.log("Generated JWT token:", token);

    // 3. Make HTTP request
    const payload = {
      serviceId: service.id,
      artistId: artistProfile.id,
      slotId: [slot.id],
      address: "Jaipur, India",
      latitude: 26.9124,
      longitude: 75.7873
    };

    console.log("Sending POST /booking/create request to local server...");
    
    const response = await fetch("http://localhost:8000/booking/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const bodyText = await response.text();
    console.log(`HTTP Response Status: ${status}`);
    console.log("HTTP Response Body:", bodyText);

    if (status === 201) {
      console.log("SUCCESS: Booking created successfully via HTTP API!");
      process.exit(0);
    } else {
      console.error(`FAILURE: Received status ${status}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("Test encountered error:", error);
    process.exit(1);
  }
}

testHttpBooking();
