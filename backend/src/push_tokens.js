// c:/MehndiGo/backend/src/push_tokens.js
// Helper for managing push notification tokens (Expo Push Tokens)
import { getDb } from "./db.js";

export async function addOrUpdatePushToken(db, userId, token, deviceType) {
  // Upsert token for user. If token already exists, update device_type.
  await db.run(
    `INSERT INTO push_tokens (user_id, token, device_type) VALUES (?, ?, ?)
     ON CONFLICT(user_id, token) DO UPDATE SET device_type = excluded.device_type`,
    [userId, token, deviceType]
  );
}

export async function removePushToken(db, userId, token) {
  await db.run(`DELETE FROM push_tokens WHERE user_id = ? AND token = ?`, [userId, token]);
}

export async function getUserPushTokens(db, userId) {
  const rows = await db.all(`SELECT token FROM push_tokens WHERE user_id = ?`, [userId]);
  return rows.map(r => r.token);
}
