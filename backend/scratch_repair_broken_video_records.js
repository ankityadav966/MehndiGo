const db = require("./models");
const cloudinary = require("./config/cloudinary");
const https = require("https");

function checkUrlExists(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on("error", () => resolve(false));
  });
}

async function repairBrokenVideoRecords() {
  console.log("Starting DB Repair for broken Cloudinary portfolio video records...");
  await db.sequelize.authenticate();
  
  const portfolios = await db.Portfolio.findAll();
  console.log(`Found ${portfolios.length} portfolio records in DB.`);

  let repairedCount = 0;

  for (const item of portfolios) {
    const rawImage = item.image_url || "";
    const rawVideo = item.video_url || "";
    const targetUrl = rawVideo || rawImage;

    if (!targetUrl.includes("cloudinary.com")) continue;

    // Check if URL was saved as /image/upload/
    if (targetUrl.includes("/image/upload/")) {
      const videoCandidateUrl = targetUrl
        .replace("/image/upload/", "/video/upload/")
        .replace(/\.(jpg|jpeg|png|webp)$/i, ".mp4");

      console.log(`[Item #${item.id}] Checking video candidate:`, videoCandidateUrl);

      // Verify if Cloudinary actually has a video resource for this URL
      const exists = await checkUrlExists(videoCandidateUrl);
      if (exists) {
        const posterUrl = videoCandidateUrl
          .replace("/video/upload/", "/video/upload/so_0,f_jpg/")
          .replace(/\.mp4$/i, ".jpg");

        item.video_url = videoCandidateUrl;
        item.image_url = posterUrl;
        await item.save();

        repairedCount++;
        console.log(`✅ [Item #${item.id}] REPAIRED: video_url set to ${videoCandidateUrl}`);
      } else {
        console.log(`ℹ️ [Item #${item.id}] Confirmed REAL image, skipping.`);
      }
    }
  }

  console.log(`🎉 Migration Finished. Repaired ${repairedCount} broken video records.`);
  process.exit(0);
}

repairBrokenVideoRecords().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
