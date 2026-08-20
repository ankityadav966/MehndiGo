const db = require("../models");
const pushService = require("./push.services");

class NotificationService {
  /**
   * Send notification to a specific user
   */
  async sendToUser(userId, title, body, data = {}) {
    try {
      const allowedTypes = ["BOOKING", "PAYMENT", "SYSTEM", "PROMOTION", "CHAT"];
      let normalizedType = "SYSTEM";
      if (data.type && allowedTypes.includes(String(data.type).toUpperCase())) {
        normalizedType = String(data.type).toUpperCase();
      }

      // 1. Create database notification record (afterCreate hook dispatches push & socket)
      const notif = await db.Notification.create({
        user_id: userId,
        title,
        message: body,
        type: normalizedType,
        data: data,
        is_read: false
      });

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
