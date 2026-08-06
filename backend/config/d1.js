/**
 * Cloudflare D1 Database Helper Module for MehndiGo Backend
 * Database Name: mehndigo
 * Database ID: c25b4a9f-8ad2-4422-85bb-d64ddadcebaa
 * Binding: DB
 */

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "cea152968069623a305c1bec83cee5b5";
const D1_DATABASE_ID = process.env.D1_DATABASE_ID || "c25b4a9f-8ad2-4422-85bb-d64ddadcebaa";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

/**
 * Execute D1 Query
 * Handles both Cloudflare Worker env.DB binding and HTTP REST API fallback
 */
async function queryD1(sql, params = [], env = null) {
  // Option A: If running inside Cloudflare Worker with env.DB binding
  if (env && env.DB) {
    try {
      const stmt = env.DB.prepare(sql);
      const res = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      return res.results || res;
    } catch (err) {
      console.error("[Cloudflare D1 Worker Error]:", err.message);
      throw err;
    }
  }

  // Option B: If running via Cloudflare D1 REST API
  if (CLOUDFLARE_API_TOKEN) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || "D1 Query Failed");
    }

    return data.result?.[0]?.results || [];
  }

  console.log(`[Cloudflare D1 Query] (Mock/Dry-run SQL): ${sql}`);
  return [];
}

module.exports = {
  queryD1,
  D1_CONFIG: {
    binding: "DB",
    database_name: "mehndigo",
    database_id: D1_DATABASE_ID,
    account_id: CLOUDFLARE_ACCOUNT_ID,
  },
};
