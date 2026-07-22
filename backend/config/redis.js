const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
console.log(`[Redis] Initializing connection to: ${redisUrl}`);

const client = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Delay reconnection attempts progressively up to 30 seconds to prevent log spamming
      return Math.min(retries * 2000, 30000);
    }
  }
});

let hasLoggedConnectionError = false;

client.on("error", (err) => {
  if (err.message.includes("ECONNREFUSED") || err.code === "ECONNREFUSED") {
    if (!hasLoggedConnectionError) {
      console.warn("[Redis] Client is offline (ECONNREFUSED). Live tracking features will be bypassed.");
      hasLoggedConnectionError = true;
    }
  } else {
    console.error("[Redis] Client Error:", err.message);
  }
});

client.on("connect", () => {
  console.log("[Redis] Connected successfully to server");
  hasLoggedConnectionError = false;
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
