const db = require("../models");
const pushService = require("./push.services");

class NotificationService {
  /**
   * Send notification to a specific user
   */
  async sendToUser(userId, title, body, data = {}) {
    try {
      // 1. Create database notification record
      const notif = await db.Notification.create({
        user_id: userId,
        title,
        message: body,
        type: data.type || "INFO",
        metadata: data,
        is_read: false
      });

      // 2. Fetch active push tokens
      const tokenRecords = await db.NotificationToken.findAll({
        where: { user_id: userId }
      });

      if (tokenRecords.length > 0) {
        const tokens = tokenRecords.map(t => t.token);
        await pushService.sendPushNotification(tokens, title, body, {
          ...data,
          notificationId: notif.id
        });
      }
      return notif;
    } catch (err) {
      console.error(`Failed to send notification to user ${userId}:`, err.message);
      return null;
    }
  }

  /**
   * Broadcast notification to all users
   */
  async broadcast(title, body, data = {}) {
    try {
      const users = await db.User.findAll({ attributes: ["id"] });
      for (const user of users) {
        await this.sendToUser(user.id, title, body, data);
      }
      return true;
    } catch (err) {
      console.error("Broadcast failed:", err.message);
      return false;
    }
  }

  /**
   * Send notification to a specific group (e.g. USER, ARTIST)
   */
  async sendToGroup(role, title, body, data = {}) {
    try {
      const users = await db.User.findAll({
        where: { role },
        attributes: ["id"]
      });
      for (const user of users) {
        await this.sendToUser(user.id, title, body, data);
      }
      return true;
    } catch (err) {
      console.error(`Send to group ${role} failed:`, err.message);
      return false;
    }
  }
}

module.exports = new NotificationService();
