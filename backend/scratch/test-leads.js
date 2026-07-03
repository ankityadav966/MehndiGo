const db = require("../models");
const ArtistService = require("../services/artist.services");

async function test() {
  try {
    console.log("Locating artist user...");
    const artistUser = await db.User.findOne({ where: { role: "ARTIST" } });
    if (!artistUser) {
      console.log("No artist user found in the database. Please seed first.");
      process.exit(1);
    }
    
    console.log(`Found artist user: ${artistUser.name} (ID: ${artistUser.id})`);
    
    console.log("Fetching leads list...");
    const result = await ArtistService.getLeads(artistUser.id);
    console.log("Leads Count:", result?.leads?.length);
    console.log("Stats:", JSON.stringify(result?.stats, null, 2));
    
    console.log("SUCCESS: Leads API check completed.");
  } catch (error) {
    console.error("FAILED:", error.message);
  }
  process.exit(0);
}

test();
