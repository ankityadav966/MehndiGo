"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BookingStatusHistory extends Model {
    static associate(models) {
      BookingStatusHistory.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });
      BookingStatusHistory.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  BookingStatusHistory.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "BookingStatusHistory",
      tableName: "BookingStatusHistories",
      timestamps: true,
      underscored: true,
    }
  );

  return BookingStatusHistory;
};
