"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.User, {
        foreignKey: "admin_id",
        as: "admin"
      });
    }
  }

  AuditLog.init(
    {
      admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      ip_address: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "AuditLog",
      tableName: "AuditLogs",
      timestamps: true,
      underscored: true
    }
  );

  return AuditLog;
};
