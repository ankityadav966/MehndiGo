const db = require("./models");

async function test() {
  try {
    console.log("Fetching all artist profiles...");
    const profiles = await db.ArtistProfile.findAll();

    console.log("Approving profiles and assigning coordinates...");
    for (const p of profiles) {
      const updates = {};
      
      if (p.verification_status !== "APPROVED") {
        updates.verification_status = "APPROVED";
      }

      if (p.latitude === null || p.longitude === null) {
        // Assign mock coordinates near Jaipur
        const offsetLat = (Math.random() - 0.5) * 0.05;
        const offsetLng = (Math.random() - 0.5) * 0.05;
        updates.latitude = 26.9124 + offsetLat;
        updates.longitude = 75.7873 + offsetLng;
      }

      if (Object.keys(updates).length > 0) {
        await p.update(updates);
        console.log(`Updated Artist Profile ID ${p.id}:`, updates);
      }
    }

    console.log("All pending profiles approved and coordinate issues fixed!");
    process.exit(0);
  } catch (error) {
    console.error("Database update failed:", error);
    process.exit(1);
  }
}

test();
