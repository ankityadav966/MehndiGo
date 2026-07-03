"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  Notification.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      type: {
        type: DataTypes.ENUM("BOOKING", "PAYMENT", "SYSTEM", "PROMOTION"),
        allowNull: false,
      },

      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Notification",
      tableName: "Notifications",
      timestamps: true,
      underscored: true,
      hooks: {
        afterCreate: async (notification) => {
          try {
            const db = require("./index");
            
            // 1. Fetch registered tokens for the user
            const tokens = await db.NotificationToken.findAll({
              where: { user_id: notification.user_id }
            });
            
            if (tokens && tokens.length > 0) {
              const tokenStrings = tokens.map(t => t.token);
              const { sendPushNotification } = require("../services/push.services");
              
              // Custom deep link metadata routing configuration
              let dataPayload = {
                type: notification.type ? notification.type.toLowerCase() : "system",
                event: "system_notification",
                notificationId: notification.id
              };

              const titleText = notification.title.toLowerCase();
              if (notification.type === "BOOKING") {
                dataPayload.event = "new_booking_request";
                if (titleText.includes("confirm")) {
                  dataPayload.event = "booking_confirmed";
                } else if (titleText.includes("accept")) {
                  dataPayload.event = "booking_accepted";
                } else if (titleText.includes("reject")) {
                  dataPayload.event = "booking_rejected";
                } else if (titleText.includes("way")) {
                  dataPayload.event = "artist_on_the_way";
                } else if (titleText.includes("arrive")) {
                  dataPayload.event = "artist_arrived";
                } else if (titleText.includes("complete")) {
                  dataPayload.event = "booking_completed";
                }
              } else if (notification.type === "PAYMENT") {
                dataPayload.event = "payment_success";
                if (titleText.includes("fail")) {
                  dataPayload.event = "payment_failed";
                }
              }

              // Send push notification
              await sendPushNotification(tokenStrings, notification.title, notification.message, dataPayload);
            }

            // 2. Real-time socket event trigger
            const { getIO } = require("../sockets/socket");
            const io = getIO();
            
            io.to(notification.user_id.toString()).emit("new_notification", {
              id: notification.id,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              is_read: notification.is_read,
              createdAt: notification.createdAt
            });

            // Update badge unread count dynamically
            const unreadCount = await db.Notification.count({
              where: { user_id: notification.user_id, is_read: false }
            });
            
            io.to(notification.user_id.toString()).emit("unread_notification_count", {
              unreadCount
            });

          } catch (err) {
            console.error("Error in Notification afterCreate hook:", err.message);
          }
        }
      }
    },
  );

  return Notification;
};
