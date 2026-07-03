'use strict';
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ChatRoom extends Model {
    static associate(models) {
      ChatRoom.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });
      ChatRoom.hasMany(models.Message, {
        foreignKey: "chat_room_id",
        as: "messages",
      });
    }
  }

  ChatRoom.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      is_pinned_customer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_pinned_artist: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_archived_customer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_archived_artist: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "ChatRoom",
      tableName: "ChatRooms",
      timestamps: true,
      underscored: true,
    }
  );

  return ChatRoom;
};
