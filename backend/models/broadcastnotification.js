"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BroadcastNotification extends Model {}

  BroadcastNotification.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      target: {
        type: DataTypes.ENUM("ALL", "ARTISTS", "CUSTOMERS"),
        allowNull: false,
        defaultValue: "ALL",
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "BroadcastNotification",
      tableName: "BroadcastNotifications",
      timestamps: true,
      underscored: true,
    }
  );

  return BroadcastNotification;
};
