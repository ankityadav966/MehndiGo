const fs = require("fs");
const path = require("path");
const https = require("https");
const db = require("./models");
const ArtistService = require("./services/artist.services");
const cloudinary = require("./config/cloudinary");

function downloadSampleVideo(destPath) {
  return new Promise((resolve, reject) => {
    const fileUrl = "https://raw.githubusercontent.com/bower-media-samples/big-buck-bunny-480p-30s/master/video.mp4";
    const file = fs.createWriteStream(destPath);
    https.get(fileUrl, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, (redirectRes) => {
          redirectRes.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        });
      } else {
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }
    }).on("error", reject);
  });
}

async function testNewVideoRecord() {
  console.log("=== STEP 1: Downloading sample MP4 video ===");
  const tempVideoPath = path.join(__dirname, "temp_uploads", "verify_sample.mp4");
  await downloadSampleVideo(tempVideoPath);
  const stats = fs.statSync(tempVideoPath);
  console.log(`Downloaded real MP4 file (${stats.size} bytes)`);

  console.log("\n=== STEP 2: Uploading MP4 Video to Cloudinary ===");
  const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(tempVideoPath, {
      folder: "mehndigo/portfolio",
      resource_type: "video"
    }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

  const videoUrl = uploadResult.secure_url;
  const thumbnailUrl = videoUrl.replace("/video/upload/", "/video/upload/so_0,f_jpg/").replace(/\.mp4$/i, ".jpg");

  console.log("\n[VIDEO UPLOAD RESPONSE]", { videoUrl });

  console.log("\n[PORTFOLIO SAVE PAYLOAD]", {
    image_url: thumbnailUrl,
    video_url: videoUrl,
    title: "New Verified Video Sample"
  });

  console.log("\n=== STEP 3: Saving to DB via ArtistService.createPortfolio ===");
  await db.sequelize.authenticate();
  const artist = await db.ArtistProfile.findOne();
  
  const savedItem = await ArtistService.createPortfolio({
    artist_id: artist.user_id,
    title: "New Verified Video Sample",
    image_url: thumbnailUrl,
    video_url: videoUrl,
    category: "Bridal Mehndi"
  });

  console.log("\n[VIDEO SAVED URL]", {
    id: savedItem.id,
    image_url: savedItem.image_url,
    video_url: savedItem.video_url
  });

  console.log("\n=== STEP 4: GET Portfolio API Check ===");
  const fetchedItem = await ArtistService.getPortfolioById(savedItem.id);
  console.log("[GET PORTFOLIO RESPONSE]", {
    id: fetchedItem.id,
    image_url: fetchedItem.image_url,
    video_url: fetchedItem.video_url
  });

  console.log("\n=== STEP 5: HEAD Request against video_url ===");
  const headResult = await new Promise((resolve) => {
    https.get(fetchedItem.video_url, (res) => {
      resolve({
        status: res.statusCode,
        contentType: res.headers["content-type"],
        contentLength: res.headers["content-length"],
        acceptRanges: res.headers["accept-ranges"]
      });
    }).on("error", (e) => resolve({ error: e.message }));
  });

  console.log("HEAD Result:", headResult);

  // Clean up
  if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);

  if (fetchedItem.video_url.includes("/video/upload/") && fetchedItem.video_url.endsWith(".mp4") && headResult.status === 200) {
    console.log("\n🎉 TEST SUCCESS! video_url is a genuine playable MP4 URL!");
  } else {
    console.error("\n❌ TEST FAILED! video_url is NOT valid MP4!");
    process.exit(1);
  }

  process.exit(0);
}

testNewVideoRecord().catch((e) => {
  console.error("Test Error:", e);
  process.exit(1);
});
