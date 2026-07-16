const db = require("../models");

async function check() {
  try {
    const list = await db.Category.findAll();
    console.log("ALL DATABASE CATEGORIES:");
    list.forEach(c => {
      console.log(`- ID: ${c.id}, Name: ${c.name}, Slug: ${c.slug}, Image: ${c.image}`);
    });
    process.exit(0);
  } catch (err) {
    console.error("Check failed:", err);
    process.exit(1);
  }
}

check();
