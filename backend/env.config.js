const path = require("path");
const dotenv = require("dotenv");

// Load .env file
dotenv.config({ path: path.join(__dirname, ".env") });

const REQUIRED_ENV_VARS = [
  "PORT",
  "JWT_SECRET",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

function validateEnv() {
  const missing = [];
  const warnings = [];

  REQUIRED_ENV_VARS.forEach((key) => {
    if (!process.env[key] || process.env[key].trim() === "") {
      missing.push(key);
    }
  });

  if (!process.env.REDIS_URL) {
    warnings.push("REDIS_URL is not set. Defaulting to redis://127.0.0.1:6379");
    process.env.REDIS_URL = "redis://127.0.0.1:6379";
  }

  if (missing.length > 0) {
    console.error("\n=======================================================");
    console.error(" ❌ ENVIRONMENT CONFIGURATION ERROR");
    console.error("=======================================================");
    console.error("The following required environment variables are missing:");
    missing.forEach((varName) => console.error(`  - ${varName}`));
    console.error("Please check your .env file in the backend directory.");
    console.error("=======================================================\n");
    throw new Error(`Missing ${missing.length} required environment variables: ${missing.join(", ")}`);
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== "production") {
    warnings.forEach((warn) => console.warn(`[Env Loader Warning] ${warn}`));
  }

  return {
    PORT: Number(process.env.PORT) || 8000,
    NODE_ENV: process.env.NODE_ENV || "development",
    JWT_SECRET: process.env.JWT_SECRET,
    DB: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      name: process.env.DB_NAME,
      ssl: process.env.DB_SSL === "true"
    },
    RAZORPAY: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    },
    CLOUDINARY: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    },
    REDIS_URL: process.env.REDIS_URL
  };
}

const envConfig = validateEnv();

module.exports = envConfig;
