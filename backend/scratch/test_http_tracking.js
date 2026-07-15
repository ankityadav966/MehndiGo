require("dotenv").config();
const jwt = require("jsonwebtoken");
const db = require("../models");

async function testHttpTracking() {
  try {
    console.log("Preparing test data for tracking...");

    // Find or create customer
    const [customerUser] = await db.User.findOrCreate({
      where: { phone: "9999999991" },
      defaults: {
        name: "Test Customer Tracking",
        email: "customer_track@test.com",
        role: "USER",
        is_verified: true
      }
    });

    // Find or create artist user
    const [artistUser] = await db.User.findOrCreate({
      where: { phone: "9999999992" },
      defaults: {
        name: "Test Artist Tracking",
        email: "artist_track@test.com",
        role: "ARTIST",
        is_verified: true
      }
    });

    // Find or create artist profile
    const [artistProfile] = await db.ArtistProfile.findOrCreate({
      where: { user_id: artistUser.id },
      defaults: {
        bio: "Test tracking bio",
        experience_years: 5,
        verification_status: "APPROVED"
      }
    });

    // Find a service
    const service = await db.Service.findOne({ where: { artist_id: artistProfile.id } }) || 
                    await db.Service.create({
                      artist_id: artistProfile.id,
                      specialization_name: "Bridal Mehndi",
                      category: "Bridal",
                      minimum_price: 1500,
                      maximum_price: 3000,
                      duration_minutes: 120,
                      is_active: true
                    });

    // Create a slots
    const slot = await db.AvailabilitySlot.create({
      artist_id: artistProfile.id,
      start_time: new Date(),
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
      is_booked: true
    });

    // Create booking
    const booking = await db.Booking.create({
      booking_code: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
      user_id: customerUser.id,
      artist_id: artistProfile.id,
      service_id: service.id,
      slot_id: slot.id,
      total_price: 1500,
      advance_paid: 0,
      remaining_amount: 1805,
      booking_status: "PENDING",
      payment_status: "PENDING",
      detailed_status: "PENDING",
      travel_charges: 150,
      offer_price: 1500,
      platform_fee: 50,
      gst: 306,
      final_amount: 2006,
      latitude: "26.9124",
      longitude: "75.7873",
      address: "Jaipur, India",
      notes: "Tracking test booking"
    });

    console.log(`Entities created. Booking ID: ${booking.id}`);

    // Generate JWT token for artist
    const artistToken = jwt.sign(
      { id: artistUser.id, role: "ARTIST" },
      process.env.JWT_SECRET || "Live credentials"
    );

    // Generate JWT token for customer
    const customerToken = jwt.sign(
      { id: customerUser.id, role: "USER" },
      process.env.JWT_SECRET || "Live credentials"
    );

    console.log("Sending POST /artist/location/update (as Artist)...");
    const updateRes = await fetch("http://localhost:8000/artist/location/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${artistToken}`
      },
      body: JSON.stringify({
        bookingId: booking.id,
        latitude: 26.9201,
        longitude: 75.7891,
        heading: 90,
        speed: 12.5
      })
    });

    const updateData = await updateRes.json();
    console.log("Update Response Status:", updateRes.status);
    console.log("Update Response Body:", JSON.stringify(updateData, null, 2));

    if (updateRes.status !== 200) {
      throw new Error("Update location endpoint failed");
    }

    console.log("Sending GET /booking/:bookingId/live-location (as Customer)...");
    const getRes = await fetch(`http://localhost:8000/booking/${booking.id}/live-location`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${customerToken}`
      }
    });

    const getData = await getRes.json();
    console.log("Fetch Response Status:", getRes.status);
    console.log("Fetch Response Body:", JSON.stringify(getData, null, 2));

    if (getRes.status !== 200) {
      throw new Error("Fetch location endpoint failed");
    }

    console.log("SUCCESS: Tracking End-to-End API verification completed perfectly!");
    process.exit(0);
  } catch (err) {
    console.error("Test encountered error:", err);
    process.exit(1);
  }
}

testHttpTracking();
