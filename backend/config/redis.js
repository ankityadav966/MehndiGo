const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
console.log(`[Redis] Initializing connection to: ${redisUrl}`);

const client = createClient({
  url: redisUrl
});

client.on("error", (err) => {
  console.error("[Redis] Client Error:", err.message);
});

client.on("connect", () => {
  console.log("[Redis] Connected successfully to server");
});

async function connectRedis() {
  try {
    await client.connect();
  } catch (err) {
    console.error("[Redis] Connection failed:", err.message);
  }
}

module.exports = {
  client,
  connectRedis
};
