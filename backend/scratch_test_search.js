const db = require("./models");
const CustomerService = require("./services/customer.services");

async function testSearch() {
  try {
    console.log("--- Testing Category Search: Bridal ---");
    const res1 = await CustomerService.searchArtists("", { category: "Bridal" }, "nearest", 26.9124, 75.7873, 1, 10);
    console.log("Bridal Results Count:", res1?.rows?.length);

    console.log("--- Testing Category Search: Arabic ---");
    const res2 = await CustomerService.searchArtists("", { category: "Arabic" }, "nearest", 26.9124, 75.7873, 1, 10);
    console.log("Arabic Results Count:", res2?.rows?.length);

    console.log("--- Testing Empty Search (All Artists) ---");
    const res3 = await CustomerService.searchArtists("", {}, "nearest", 26.9124, 75.7873, 1, 10);
    console.log("All Artists Count:", res3?.rows?.length);
    if (res3?.rows?.length > 0) {
      console.log("Sample Artist ID:", res3.rows[0].id, "User Name:", res3.rows[0].user?.name);
    }

    process.exit(0);
  } catch (err) {
    console.error("Search Test Error:", err);
    process.exit(1);
  }
}

testSearch();
