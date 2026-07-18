const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Search paths for .env relative to this file's folder (config)
const pathsToTry = [
  path.resolve(__dirname, "../backend/.env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
  path.resolve(process.cwd(), ".env"),
];

let loaded = false;
for (const envPath of pathsToTry) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`[Env Loader] Loaded environment variables from: ${envPath}`);
    loaded = true;
    break;
  }
}

if (!loaded) {
  dotenv.config();
}

const requiredVars = ["JWT_SECRET", "EMAIL_USER", "EMAIL_PASS"];
const missingVars = [];

for (const key of requiredVars) {
  if (!process.env[key] || process.env[key].trim() === "") {
    missingVars.push(key);
  }
}

if (missingVars.length > 0) {
  const errorMsg = `
==================================================
❌ CRITICAL ENVIRONMENT CONFIGURATION ERROR
Missing required environment variable(s): ${missingVars.join(", ")}
==================================================
`;
  console.error(errorMsg);
  throw new Error(`Environment Configuration Error: Missing ${missingVars.join(", ")}`);
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  PORT: process.env.PORT || 8000,
};
