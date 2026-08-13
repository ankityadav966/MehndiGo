const db = require("../../models");
const crypto = require('crypto');
const { SuccessResponse, ErrorResponse } = require("../../utils/common");
const { Op } = require("sequelize");

// 1. POST /notification/register-token
async function registerToken(req, res) {
  // Helper to hash token for safe logging
  const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
  try {
    const userId = req.user.id;
    const { token, device_type } = req.body;

    if (!token) {
      return res.status(400).json(ErrorResponse("Token is required"));
    }

    const [notifToken, created] = await db.NotificationToken.findOrCreate({
      where: {
        user_id: userId,
        token: token
      },
      defaults: {
        user_id: userId,
        token: token,
        device_type: device_type || "ANDROID",
        is_active: true
      }
    });

    // If the token existed but was inactive, reactivate it
    if (!created && (!notifToken.is_active || (device_type && notifToken.device_type !== device_type))) {
      await notifToken.update({
        is_active: true,
        device_type: device_type || notifToken.device_type
      });
    }

    if (!created && device_type && notifToken.device_type !== device_type) {
      await notifToken.update({ device_type });
    }

    console.log(`Token registered for user ${userId}: ${hashToken(token)}`);
      return res.status(200).json(SuccessResponse("Token registered successfully", notifToken));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 2. DELETE /notification/remove-token
async function removeToken(req, res) {
  const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(ErrorResponse("Token is required to unregister"));
    }

    const deleted = await db.NotificationToken.destroy({
      where: {
        user_id: userId,
        token: token
      }
    });

    console.log(`Token removed for user ${userId}: ${hashToken(token)}`);
      return res.status(200).json(SuccessResponse("Token removed successfully", { deletedCount: deleted }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 3. GET /notification/history
async function getHistory(req, res) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await db.Notification.findAndCountAll({
      where: {
        user_id: userId
      },
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    const unreadCount = await db.Notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });

    return res.status(200).json(SuccessResponse("Notification history fetched", {
      notifications: rows,
      totalCount: count,
      unreadCount,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 4. PUT /notification/read
async function markRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.body; // allow body payload

    const notificationId = id || req.params.id;
    if (!notificationId) {
      return res.status(400).json(ErrorResponse("Notification ID is required"));
    }

    const [updated] = await db.Notification.update(
      { is_read: true },
      {
        where: {
          id: notificationId,
          user_id: userId
        }
      }
    );

    return res.status(200).json(SuccessResponse("Notification marked as read", { updatedCount: updated }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 5. PUT /notification/read-all
async function markAllRead(req, res) {
  try {
    const userId = req.user.id;

    const [updated] = await db.Notification.update(
      { is_read: true },
      {
        where: {
          user_id: userId,
          is_read: false
        }
      }
    );

    return res.status(200).json(SuccessResponse("All notifications marked as read", { updatedCount: updated }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 6. DELETE /notification/:id
async function deleteNotification(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await db.Notification.destroy({
      where: {
        id,
        user_id: userId
      }
    });

    return res.status(200).json(SuccessResponse("Notification deleted successfully", { deletedCount: deleted }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 7. DELETE /notification/clear-all
async function clearAll(req, res) {
  try {
    const userId = req.user.id;

    const deleted = await db.Notification.destroy({
      where: {
        user_id: userId
      }
    });

    return res.status(200).json(SuccessResponse("All notification history cleared", { deletedCount: deleted }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 8. POST /notification/send (Admin utility)

// 11. GET /debug/push/:userId (Admin debug endpoint)
async function sendSystemNotification(req, res) {
  try {
    const { user_id, title, message } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json(ErrorResponse("user_id, title, and message are required"));
    }

    const notif = await db.Notification.create({
      user_id,
      title,
      message,
      type: "SYSTEM",
      is_read: false
    });

    return res.status(201).json(SuccessResponse("Notification sent successfully", notif));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// Admin debug endpoint to retrieve raw push tokens for a user (should be removed after testing)
async function debugGetTokens(req, res) {
  try {
    const { userId } = req.params;
    const tokens = await db.NotificationToken.findAll({ where: { user_id: userId } });
    return res.status(200).json(SuccessResponse('Debug tokens fetched', tokens));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 9. POST /notification/broadcast (Admin bulk utility)
async function sendBroadcast(req, res) {
  try {
    const { title, message, target, data } = req.body;

    if (!title || !message) {
      return res.status(400).json(ErrorResponse("title and message are required"));
    }

    const targetGroup = target || "ALL"; // ALL, ARTISTS, CUSTOMERS
    const broadcast = await db.BroadcastNotification.create({
      title,
      message,
      target: targetGroup,
      data: data ? JSON.stringify(data) : null
    });

    // Determine target users list
    let targetUsers = [];
    if (targetGroup === "CUSTOMERS") {
      targetUsers = await db.User.findAll({ where: { role: "USER" } });
    } else if (targetGroup === "ARTISTS") {
      targetUsers = await db.User.findAll({ where: { role: "ARTIST" } });
    } else {
      targetUsers = await db.User.findAll();
    }

    // Create notifications for all targets (Sequelize afterCreate handles push/socket logic)
    await Promise.all(
      targetUsers.map(async (user) => {
        return db.Notification.create({
          user_id: user.id,
          title,
          message,
          type: "SYSTEM",
          is_read: false
        });
      })
    );

    return res.status(201).json(SuccessResponse("Broadcast sent successfully", broadcast));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 10. POST /notification/schedule (Admin scheduling utility)
async function scheduleNotification(req, res) {
  try {
    const { title, message, scheduled_at, user_id, data } = req.body;

    if (!title || !message || !scheduled_at) {
      return res.status(400).json(ErrorResponse("title, message, and scheduled_at are required"));
    }

    const parsedDate = new Date(scheduled_at);
    if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
      return res.status(400).json(ErrorResponse("scheduled_at must be a valid future timestamp"));
    }

    const scheduled = await db.ScheduledNotification.create({
      title,
      message,
      scheduled_at: parsedDate,
      user_id: user_id || null,
      status: "PENDING",
      data: data ? JSON.stringify(data) : null
    });

    return res.status(201).json(SuccessResponse("Notification scheduled successfully", scheduled));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function sendTestPush(req, res) {
  try {
    const userId = req.user.id;
    const NotificationService = require("../../services/notification.services");

    const result = await NotificationService.sendToUser(
      userId,
      req.body.title || "MehndiGo Test Push 🚀",
      req.body.body || "Your push notifications are configured and working perfectly!",
      req.body.data || { type: "TEST_PUSH", screen: "MyBookings" }
    );

    if (!result) {
      return res.status(500).json(ErrorResponse("Failed to send test push notification"));
    }

    return res.status(200).json(SuccessResponse("Test push notification sent successfully", result));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  registerToken,
  removeToken,
  getHistory,
  markRead,
  markAllRead,
  deleteNotification,
  clearAll,
  sendSystemNotification,
  sendBroadcast,
  scheduleNotification,
  sendTestPush,
  debugGetTokens
};
