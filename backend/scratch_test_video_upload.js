const fs = require("fs");
const path = require("path");
const https = require("https");
const cloudinary = require("./config/cloudinary");

function downloadSampleVideo(destPath) {
  return new Promise((resolve, reject) => {
    // Small sample MP4 video URL (150KB)
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

async function testVideoUpload() {
  console.log("=== STEP 1: Downloading real sample MP4 video ===");
  const testFilePath = path.join(__dirname, "temp_uploads", "real_sample_video.mp4");
  await downloadSampleVideo(testFilePath);
  const stats = fs.statSync(testFilePath);
  console.log(`Downloaded real MP4 file (${stats.size} bytes) to:`, testFilePath);

  console.log("\n=== STEP 2: Uploading real MP4 to Cloudinary using backend uploader ===");
  const uploadOptions = {
    folder: "mehndigo/portfolio",
    resource_type: "video"
  };

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(testFilePath, uploadOptions, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

  console.log("\n=== STEP 3: Actual Cloudinary Response Inspected ===");
  console.log({
    public_id: result.public_id,
    resource_type: result.resource_type,
    format: result.format,
    secure_url: result.secure_url,
    bytes: result.bytes
  });

  console.log("\n=== STEP 4: Programmatic HEAD Check against Cloudinary secure_url ===");
  const headResult = await new Promise((resolve) => {
    https.get(result.secure_url, (res) => {
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
  if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

  if (headResult.contentType && headResult.contentType.startsWith("video/")) {
    console.log("\n🎉 SUCCESS! Cloudinary returned a GENUINE VIDEO STREAM with Content-Type:", headResult.contentType);
  } else {
    console.error("\n❌ FAILED! Content-Type was NOT video/mp4:", headResult.contentType);
    process.exit(1);
  }

  process.exit(0);
}

testVideoUpload().catch((e) => {
  console.error("Test Video Upload Error:", e);
  process.exit(1);
});
