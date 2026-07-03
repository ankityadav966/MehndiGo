"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SecurityLog extends Model {}

  SecurityLog.init(
    {
      ip_address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      event_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      severity: {
        type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
        allowNull: false,
        defaultValue: "LOW"
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "SecurityLog",
      tableName: "SecurityLogs",
      timestamps: true,
      underscored: true
    }
  );

  return SecurityLog;
};
