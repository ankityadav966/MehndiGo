"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class XpLog extends Model {
    static associate(models) {
      XpLog.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
    }
  }

  XpLog.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false
      },
      reference_id: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "XpLog",
      tableName: "XpLogs",
      timestamps: true,
      underscored: true
    }
  );

  return XpLog;
};
