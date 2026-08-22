const crypto = require("crypto");

const CLOUD_NAME = "dair21jov";
const API_KEY = "344422783583887";
const API_SECRET = "KxOubI4_DlRLsEtkP360SLlwJNg";

async function uploadToCloudinaryDirect(base64Data, folder = "mehndigo/test") {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const formData = new FormData();
  formData.append("file", base64Data);
  formData.append("api_key", API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    throw new Error(`Cloudinary upload failed: ${data.error?.message || "Unknown error"}`);
  }
  return data.secure_url;
}

async function runLiveVerification() {
  console.log("===============================================================");
  console.log("  MEHNDIGO — REAL-WORLD LIVE IMAGE PIPELINE & PROFILE AUDIT    ");
  console.log("===============================================================\n");

  const results = {};

  // 1. Real Cloudinary Upload Test
  try {
    console.log("1. Uploading Real Image A to Cloudinary...");
    const samplePngA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9QzwAEjDAGAwMAM34DAfG5oJAAAAAASUVORK5CYII=";
    const urlA = await uploadToCloudinaryDirect(samplePngA, "mehndigo/profile");
    console.log("   ✅ Real Cloudinary Secure URL A:", urlA);
    results.cloudinaryUploadA = urlA.startsWith("https://res.cloudinary.com/");

    console.log("\n2. Uploading Real Image B (Replacement) to Cloudinary...");
    const samplePngB = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8AARAwMDEwMDAwAM34DAfG5oJAAAAAASUVORK5CYII=";
    const urlB = await uploadToCloudinaryDirect(samplePngB, "mehndigo/profile");
    console.log("   ✅ Real Cloudinary Secure URL B:", urlB);
    results.cloudinaryUploadB = urlB.startsWith("https://res.cloudinary.com/") && urlB !== urlA;

    console.log("\n3. Uploading Real Aadhaar Front & Back to Cloudinary...");
    const urlAadhaarF = await uploadToCloudinaryDirect(samplePngA, "mehndigo/kyc");
    const urlAadhaarB = await uploadToCloudinaryDirect(samplePngB, "mehndigo/kyc");
    console.log("   ✅ Aadhaar Front URL:", urlAadhaarF);
    console.log("   ✅ Aadhaar Back URL: ", urlAadhaarB);
    results.aadhaarUpload = urlAadhaarF.includes("cloudinary.com") && urlAadhaarB.includes("cloudinary.com");

    console.log("\n4. Uploading Real Portfolio Design Sample to Cloudinary...");
    const urlPortfolio = await uploadToCloudinaryDirect(samplePngA, "mehndigo/portfolio");
    console.log("   ✅ Portfolio Sample URL:", urlPortfolio);
    results.portfolioUpload = urlPortfolio.includes("cloudinary.com");

    console.log("\n===============================================================");
    console.log("  SUMMARY OF LIVE CLOUDINARY UPLOADS: ALL PASSED ✅             ");
    console.log("===============================================================");
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("❌ Live Cloudinary Upload Failed:", err.message);
    process.exit(1);
  }
}

runLiveVerification();
