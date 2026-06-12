"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });
    }
  }

  Payment.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },

      payment_method: {
        type: DataTypes.ENUM(
          "CASH",
          "UPI",
          "CARD",
          "WALLET",
          "ONLINE"
        ),
        allowNull: false,
      },

      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "PENDING",
          "SUCCESS",
          "FAILED",
          "REFUNDED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },

      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Payment",
      tableName: "Payments",
      timestamps: true,
      underscored: true
    }
  );

  return Payment;
};