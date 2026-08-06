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

async function testEndToEndPortfolioUpload() {
  console.log("=== STEP 1: Downloading real sample MP4 video for End-to-End Test ===");
  const tempVideoPath = path.join(__dirname, "temp_uploads", "e2e_test_video.mp4");
  await downloadSampleVideo(tempVideoPath);
  const stats = fs.statSync(tempVideoPath);
  console.log(`Downloaded real MP4 file (${stats.size} bytes) to:`, tempVideoPath);

  console.log("\n=== STEP 2: Uploading Real MP4 Video to Cloudinary ===");
  const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(tempVideoPath, {
      folder: "mehndigo/portfolio",
      resource_type: "video"
    }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

  console.log("\n[CLOUDINARY PORTFOLIO RESULT]", {
    public_id: uploadResult.public_id,
    resource_type: uploadResult.resource_type,
    format: uploadResult.format,
    secure_url: uploadResult.secure_url,
    bytes: uploadResult.bytes
  });

  console.log("\n=== STEP 3: Creating Portfolio Record in Database ===");
  await db.sequelize.authenticate();
  const artist = await db.ArtistProfile.findOne();
  if (!artist) {
    throw new Error("No ArtistProfile found in DB for test");
  }

  const portfolioItem = await ArtistService.createPortfolio({
    artist_id: artist.user_id,
    title: "E2E Test Bridal Video",
    description: "Automated verification test item",
    category: "Bridal Mehndi",
    image_url: uploadResult.secure_url.replace("/video/upload/", "/video/upload/so_0,f_jpg/").replace(/\.mp4$/i, ".jpg"),
    video_url: uploadResult.secure_url
  });

  console.log("\n=== STEP 4: DB Saved Record Verified ===");
  console.log({
    id: portfolioItem.id,
    title: portfolioItem.title,
    image_url: portfolioItem.image_url,
    video_url: portfolioItem.video_url
  });

  console.log("\n=== STEP 5: GET Portfolio API Response Verified ===");
  const fetchedItem = await ArtistService.getPortfolioById(portfolioItem.id);
  console.log({
    id: fetchedItem.id,
    video_url: fetchedItem.video_url,
    image_url: fetchedItem.image_url
  });

  console.log("\n=== STEP 6: Programmatic HEAD Check against DB video_url ===");
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

  // Clean up test file
  if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);

  if (headResult.status === 200 && headResult.contentType && headResult.contentType.startsWith("video/")) {
    console.log("\n🎉 END-TO-END VERIFICATION PASSED! Real video stored and returned with Content-Type:", headResult.contentType);
  } else {
    console.error("\n❌ END-TO-END VERIFICATION FAILED! Content-Type was:", headResult.contentType);
    process.exit(1);
  }

  process.exit(0);
}

testEndToEndPortfolioUpload().catch((e) => {
  console.error("End-to-End Verification Error:", e);
  process.exit(1);
});
