"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NotificationToken extends Model {
    static associate(models) {
      NotificationToken.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  NotificationToken.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      device_type: {
        type: DataTypes.ENUM("ANDROID", "IOS", "WEB"),
        allowNull: false,
        defaultValue: "ANDROID",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "NotificationToken",
      tableName: "NotificationTokens",
      timestamps: true,
      underscored: true,
    }
  );

  return NotificationToken;
};
