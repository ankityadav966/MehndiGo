// backend/src/notification_service.js
// Centralized Notification & Push Service for MehendiGo (Cloudflare Worker & D1)

/**
 * Ensures push notification and token tables exist in D1 SQLite database
 */
export async function ensurePushNotificationTables(db) {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        device_type TEXT DEFAULT 'ANDROID',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, token)
      )
    `).catch(() => null);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id)
    `).catch(() => null);

    await db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'INFO',
        entity_id TEXT,
        entity_type TEXT,
        deep_link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => null);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `).catch(() => null);
  } catch (err) {
    console.error("[NotificationService] Table initialization warning:", err.message);
  }
}

/**
 * Dispatches Expo push notifications to a list of tokens
 */
export async function sendExpoPushNotification(tokens, title, body, data = {}) {
  const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
  const validTokens = tokenArray.filter(
    (t) =>
      t &&
      typeof t === "string" &&
      (t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"))
  );

  if (validTokens.length === 0) {
    console.log("[NotificationService] No valid Expo push tokens found for dispatch.");
    return { success: false, reason: "NO_VALID_TOKENS" };
  }

  // Deduplicate tokens
  const uniqueTokens = Array.from(new Set(validTokens));

  const payload = uniqueTokens.map((token) => ({
    to: token,
    title: title || "MehndiGo Notification",
    body: body || "You have a new update from MehndiGo",
    sound: "default",
    priority: "high",
    badge: 1,
    channelId: data?.channelId || "default",
    data: {
      ...data,
      title: title || "MehndiGo Notification",
      message: body || "You have a new update from MehndiGo",
    },
  }));

  try {
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
    console.log("[NotificationService] Expo Push API response:", JSON.stringify(responseJson));
    return { success: true, response: responseJson };
  } catch (err) {
    console.error("[NotificationService] Expo Push dispatch error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Standardized Centralized Notification Dispatcher
 * Persists in-app DB notification and dispatches remote Push notification to user's registered devices.
 * 
 * @param {Object} db - D1 Database connection
 * @param {Object} params - Notification parameters
 * @param {number|string} params.userId - Recipient user ID
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body / message
 * @param {string} [params.type='INFO'] - Notification category type (e.g. BOOKING_CREATED, SUPPORT_TICKET_REPLY)
 * @param {string|number} [params.entityId] - Associated entity ID (e.g. bookingId, ticketId)
 * @param {string} [params.entityType] - Entity type (e.g. 'booking', 'ticket', 'chat')
 * @param {string} [params.deepLink] - Deep link URI (e.g. 'mehendigoo://booking/123')
 * @param {string} [params.channelId='default'] - Android notification channel ('bookings', 'payments', 'support', 'chat', 'default')
 */
export async function dispatchNotification(db, {
  userId,
  title,
  body,
  type = "INFO",
  entityId = null,
  entityType = null,
  deepLink = null,
  channelId = "default",
  additionalData = {},
}) {
  if (!db || !userId) {
    console.warn("[NotificationService] Missing db or userId in dispatchNotification.");
    return null;
  }

  const cleanUserId = Number(userId) || userId;
  const strUserId = String(userId);

  // 1. Persist notification in database
  let notifId = null;
  try {
    const insertResult = await db.run(
      `INSERT INTO notifications (user_id, title, message, type, entity_id, entity_type, deep_link, is_read) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        cleanUserId,
        title || "MehndiGo Notification",
        body || "",
        type,
        entityId ? String(entityId) : null,
        entityType || null,
        deepLink || null,
      ]
    ).catch((e) => {
      console.error("[NotificationService] DB Insert error:", e.message);
      return null;
    });

    notifId = insertResult?.lastInsertRowid || insertResult?.meta?.last_row_id || null;
  } catch (dbErr) {
    console.error("[NotificationService] In-App Notification save exception:", dbErr.message);
  }

  // 2. Fetch user's registered active push tokens
  const tokens = [];
  try {
    // From push_tokens table
    const tokenRows = await db.all(
      "SELECT token FROM push_tokens WHERE (user_id = ? OR CAST(user_id AS TEXT) = ?) AND is_active = 1",
      [cleanUserId, strUserId]
    ).catch(() => []);

    if (tokenRows && tokenRows.length > 0) {
      tokenRows.forEach((r) => {
        if (r.token) tokens.push(r.token);
      });
    }

    // From users table fallback
    const userRow = await db.first(
      "SELECT push_token FROM users WHERE id = ? OR CAST(id AS TEXT) = ?",
      [cleanUserId, strUserId]
    ).catch(() => null);

    if (userRow?.push_token) {
      tokens.push(userRow.push_token);
    }
  } catch (tokErr) {
    console.error("[NotificationService] Token retrieval error:", tokErr.message);
  }

  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));

  // 3. Construct standard push payload
  const pushData = {
    type,
    entityId: entityId ? String(entityId) : undefined,
    entityType: entityType || undefined,
    bookingId: entityType === "booking" || type.startsWith("BOOKING_") ? String(entityId) : undefined,
    ticketId: entityType === "ticket" || type.startsWith("SUPPORT_") ? String(entityId) : undefined,
    deepLink: deepLink || undefined,
    channelId,
    notificationId: notifId,
    userId: cleanUserId,
    ...additionalData,
  };

  // 4. Dispatch push asynchronously (does not block caller)
  if (uniqueTokens.length > 0) {
    sendExpoPushNotification(uniqueTokens, title, body, pushData).catch((err) => {
      console.error("[NotificationService] Async push dispatch failed:", err.message);
    });
  } else {
    console.log(`[NotificationService] No push tokens found for user ${userId}. In-app notification saved.`);
  }

  return { success: true, notificationId: notifId, recipientTokens: uniqueTokens.length };
}
