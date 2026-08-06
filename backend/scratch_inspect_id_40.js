const db = require("./models");

async function inspectRecord40() {
  await db.sequelize.authenticate();
  const item = await db.Portfolio.findByPk(40);
  console.log("=== DB RECORD FOR ID 40 ===");
  if (!item) {
    console.log("Record ID 40 not found.");
  } else {
    console.log({
      id: item.id,
      artist_id: item.artist_id,
      title: item.title,
      image_url: item.image_url,
      video_url: item.video_url,
      createdAt: item.createdAt
    });
  }

  // Also query the last 5 portfolio items
  const recentItems = await db.Portfolio.findAll({
    order: [["id", "DESC"]],
    limit: 5
  });

  console.log("\n=== 5 RECENT PORTFOLIO ITEMS IN DB ===");
  recentItems.forEach((p) => {
    console.log({
      id: p.id,
      title: p.title,
      image_url: p.image_url,
      video_url: p.video_url
    });
  });

  process.exit(0);
}

inspectRecord40().catch((e) => {
  console.error("Inspect error:", e);
  process.exit(1);
});
