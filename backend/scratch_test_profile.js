const db = require("./models");
const CustomerService = require("./services/customer.services");

async function testProfile() {
  try {
    const profiles = await db.ArtistProfile.findAll();
    console.log("Found Artist Profiles:", profiles.map(p => ({ id: p.id, user_id: p.user_id })));

    for (const p of profiles) {
      const data = await CustomerService.getArtistById(p.id);
      console.log(`Artist ID ${p.id}:`, data ? `SUCCESS (Name: ${data.user?.name})` : "NULL");
    }

    process.exit(0);
  } catch (err) {
    console.error("Profile Test Error:", err);
    process.exit(1);
  }
}

testProfile();
