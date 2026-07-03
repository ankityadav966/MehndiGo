"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScheduledNotification extends Model {
    static associate(models) {
      ScheduledNotification.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  ScheduledNotification.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      scheduled_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("PENDING", "SENT", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ScheduledNotification",
      tableName: "ScheduledNotifications",
      timestamps: true,
      underscored: true,
    }
  );

  return ScheduledNotification;
};
