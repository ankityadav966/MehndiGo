"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Refund extends Model {
    static associate(models) {
      Refund.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking"
      });
      Refund.belongsTo(models.Payment, {
        foreignKey: "payment_id",
        as: "payment"
      });
    }
  }

  Refund.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      cashfree_refund_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      razorpay_refund_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PENDING"
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Refund",
      tableName: "Refunds",
      timestamps: true,
      underscored: true
    }
  );

  return Refund;
};
