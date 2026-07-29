"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      Transaction.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });
    }
  }

  Transaction.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      cashfree_order_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cashfree_payment_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cashfree_signature: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      razorpay_order_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      razorpay_payment_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      razorpay_signature: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PENDING",
      },
    },
    {
      sequelize,
      modelName: "Transaction",
      tableName: "Transactions",
      timestamps: true,
      underscored: true,
    }
  );

  return Transaction;
};
