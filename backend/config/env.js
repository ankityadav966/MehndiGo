const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return false;
  try {
    const content = fs.readFileSync(envPath, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eqIdx = line.indexOf("=");
      if (eqIdx !== -1) {
        const key = line.substring(0, eqIdx).trim();
        let val = line.substring(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        } else {
          const commentIdx = val.search(/\s+#/);
          if (commentIdx !== -1) {
            val = val.substring(0, commentIdx).trim();
          }
        }
        process.env[key] = val;
      }
    });
    return true;
  } catch (err) {
    return false;
  }
}

// Search paths for .env relative to this file's folder (backend/config)
const pathsToTry = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
  path.resolve(process.cwd(), ".env"),
];

let loaded = false;
for (const envPath of pathsToTry) {
  if (fs.existsSync(envPath)) {
    loadEnvFile(envPath);
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
⚠️ ENVIRONMENT CONFIGURATION WARNING
Missing required environment variable(s): ${missingVars.join(", ")}
Using default fallback configurations...
==================================================
`;
  console.warn(errorMsg);
}

process.env.JWT_SECRET = process.env.JWT_SECRET || "Live credentials";
process.env.EMAIL_USER = process.env.EMAIL_USER || "mehendigo@gmail.com";
process.env.EMAIL_PASS = process.env.EMAIL_PASS || "zgibsuiprjnapudd";

module.exports = {
  
  JWT_SECRET: process.env.JWT_SECRET,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  PORT: process.env.PORT || 8000,
};
