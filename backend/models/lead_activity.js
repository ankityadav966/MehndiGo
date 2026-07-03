"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LeadActivity extends Model {
    static associate(models) {
      LeadActivity.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking"
      });
    }
  }

  LeadActivity.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      activity_type: {
        type: DataTypes.STRING, // "VIEWED", "ACCEPTED", "REJECTED"
        allowNull: false
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "LeadActivity",
      tableName: "lead_activities",
      timestamps: true,
      underscored: true
    }
  );

  return LeadActivity;
};
