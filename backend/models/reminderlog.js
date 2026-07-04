"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReminderLog extends Model {
    static associate(models) {
      ReminderLog.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
    }
  }

  ReminderLog.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      last_sent_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "ReminderLog",
      tableName: "ReminderLogs",
      timestamps: true,
      underscored: true
    }
  );

  return ReminderLog;
};
