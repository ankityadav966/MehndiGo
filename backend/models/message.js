"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.User, {
        foreignKey: "sender_id",
        as: "sender",
      });

      Message.belongsTo(models.User, {
        foreignKey: "receiver_id",
        as: "receiver",
      });

      Message.belongsTo(models.ChatRoom, {
        foreignKey: "chat_room_id",
        as: "chatRoom",
      });

      Message.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });

      Message.belongsTo(models.Message, {
        foreignKey: "parent_message_id",
        as: "parentMessage",
      });

      Message.hasOne(models.MessageMedia, {
        foreignKey: "message_id",
        as: "media",
      });

      Message.hasMany(models.ReadReceipt, {
        foreignKey: "message_id",
        as: "readReceipts",
      });
    }
  }

  Message.init(
    {
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      receiver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      chat_room_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      message_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "TEXT",
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      parent_message_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_edited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_starred_customer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_starred_artist: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      deleted_by_sender: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      deleted_by_receiver: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_deleted_everyone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Message",
      tableName: "Messages",
      timestamps: true,
    }
  );

  return Message;
};
