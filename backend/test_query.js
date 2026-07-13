const db = require("./models");

async function test() {
  try {
    console.log("Querying all categories in database...");
    const categories = await db.Category.findAll({
      order: [["sortOrder", "ASC"]]
    });
    console.log("Categories found:", categories.length);
    categories.forEach(c => {
      console.log(`ID: ${c.id}, Name: ${c.name}, Slug: ${c.slug}, Image: ${c.image}, Featured: ${c.featured}`);
    });
    process.exit(0);
  } catch (error) {
    console.error("DB QUERY ERROR EXCEPTION:", error);
    process.exit(1);
  }
}

test();
