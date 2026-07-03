'use strict';
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReportedChat extends Model {
    static associate(models) {
      ReportedChat.belongsTo(models.User, {
        foreignKey: "reporter_id",
        as: "reporter",
      });
      ReportedChat.belongsTo(models.User, {
        foreignKey: "reported_id",
        as: "reported",
      });
      ReportedChat.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });
    }
  }

  ReportedChat.init(
    {
      reporter_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reported_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("PENDING", "RESOLVED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
    },
    {
      sequelize,
      modelName: "ReportedChat",
      tableName: "ReportedChats",
      timestamps: true,
      underscored: true,
    }
  );

  return ReportedChat;
};
