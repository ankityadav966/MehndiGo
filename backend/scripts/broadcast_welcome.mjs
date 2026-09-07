// backend/scripts/broadcast_welcome.mjs
import { execSync } from "child_process";
import { sendDirectFcmNotification } from "../src/fcm_v1_service.js";

const NOTIF_TITLE = "🌸 Welcome to MehndiGo!";
const NOTIF_BODY = "Welcome to MehndiGo platform! Explore top verified Mehndi artists, trending designs & book doorstep services easily. ✨";

async function executeD1(sql) {
  const escapedSql = sql.replace(/"/g, '\\"');
  const cmd = `npx wrangler d1 execute mehndigo --remote --command "${escapedSql}" --json`;
  const output = execSync(cmd, { cwd: "c:\\MehndiGo\\backend", encoding: "utf8" });
  const parsed = JSON.parse(output);
  if (Array.isArray(parsed) && parsed[0]?.results) {
    return parsed[0].results;
  }
  return [];
}

async function sendExpoPush(tokens, title, body, data = {}) {
  const validTokens = tokens.filter(
    (t) => t && typeof t === "string" && (t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"))
  );
  if (validTokens.length === 0) return { success: true, count: 0, results: [] };

  const payload = validTokens.map((token) => ({
    to: token,
    title,
    body,
    sound: "default",
    priority: "high",
    badge: 1,
    channelId: "default",
    data: {
      ...data,
      title,
      message: body,
    },
  }));

  console.log(`[Expo] Dispatching to ${validTokens.length} Expo tokens...`);
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(payload),
  });

  const responseJson = await res.json();
  return { success: true, count: validTokens.length, response: responseJson };
}

async function run() {
  console.log("==================================================");
  console.log("🚀 Starting MehndiGo Welcome Push Notification Broadcast");
  console.log("Title:   ", NOTIF_TITLE);
  console.log("Message: ", NOTIF_BODY);
  console.log("==================================================\n");

  // 1. Fetch active push tokens from D1
  console.log("📦 Fetching registered push tokens from D1...");
  const tokenRows = await executeD1("SELECT id, user_id, device_type, token FROM push_tokens WHERE is_active = 1;");
  console.log(`Found ${tokenRows.length} active token records.`);

  const fcmTokens = new Set();
  const expoTokens = new Set();

  for (const row of tokenRows) {
    const tok = (row.token || "").trim();
    if (!tok) continue;
    if (tok.startsWith("ExponentPushToken") || tok.startsWith("ExpoPushToken")) {
      // Exclude test validation dummy tokens
      if (!tok.includes("TestTokenValidation") && !tok.includes("RealDevice")) {
        expoTokens.add(tok);
      }
    } else {
      fcmTokens.add(tok);
    }
  }

  console.log(`🎯 Unique Expo Push Tokens: ${expoTokens.size}`);
  console.log(`🎯 Unique Native Android FCM Tokens: ${fcmTokens.size}`);

  const notifData = {
    type: "WELCOME",
    event: "welcome_platform",
    channelId: "default",
  };

  // 2. Dispatch FCM Push Notifications
  console.log("\n📱 Sending to Native Android FCM Devices...");
  let fcmSuccess = 0;
  let fcmFail = 0;
  for (const token of fcmTokens) {
    try {
      const res = await sendDirectFcmNotification(token, {
        title: NOTIF_TITLE,
        body: NOTIF_BODY,
        data: notifData,
        channelId: "default",
      });
      if (res.success) {
        console.log(`  ✅ FCM Delivered to ${token.substring(0, 25)}... [Message: ${res.messageId}]`);
        fcmSuccess++;
      } else {
        console.log(`  ⚠️ FCM Failed for ${token.substring(0, 25)}... [Error: ${res.error}]`);
        fcmFail++;
      }
    } catch (err) {
      console.error(`  ❌ FCM Exception for ${token.substring(0, 25)}...:`, err.message);
      fcmFail++;
    }
  }

  // 3. Dispatch Expo Push Notifications
  console.log("\n📲 Sending to Expo Push Devices...");
  let expoResult = null;
  if (expoTokens.size > 0) {
    try {
      expoResult = await sendExpoPush(Array.from(expoTokens), NOTIF_TITLE, NOTIF_BODY, notifData);
      console.log("  ✅ Expo Push Batch Response:", JSON.stringify(expoResult.response?.data || expoResult.response));
    } catch (err) {
      console.error("  ❌ Expo Push Batch Error:", err.message);
    }
  }

  // 4. Insert in-app notifications for all users in D1
  console.log("\n🔔 Creating In-App Notifications for all registered users in D1...");
  const users = await executeD1("SELECT id, full_name, role FROM users;");
  console.log(`Total users found: ${users.length}`);

  let insertedCount = 0;
  // Batch insert in chunks of 20
  const chunkSize = 20;
  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    const valueClauses = chunk.map(u => {
      const escapedTitle = NOTIF_TITLE.replace(/'/g, "''");
      const escapedMsg = NOTIF_BODY.replace(/'/g, "''");
      return `(${u.id}, '${escapedTitle}', '${escapedMsg}', 'WELCOME', 0, CURRENT_TIMESTAMP)`;
    }).join(", ");

    const insertSql = `INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES ${valueClauses};`;
    try {
      await executeD1(insertSql);
      insertedCount += chunk.length;
      console.log(`  Inserted ${insertedCount}/${users.length} user in-app notifications...`);
    } catch (err) {
      console.error(`  Insert chunk error:`, err.message);
    }
  }

  console.log("\n==================================================");
  console.log("🎉 Broadcast Completed Successfully!");
  console.log(`- FCM Push Deliveries: ${fcmSuccess} successful (${fcmFail} stale/failed)`);
  console.log(`- Expo Push Deliveries: ${expoTokens.size} devices`);
  console.log(`- In-App Notifications: ${insertedCount} users`);
  console.log("==================================================");
}

run().catch(console.error);
