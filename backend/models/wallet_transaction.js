"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class WalletTransaction extends Model {
    static associate(models) {
      WalletTransaction.belongsTo(models.Wallet, {
        foreignKey: "wallet_id",
        as: "wallet"
      });
      WalletTransaction.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking"
      });
    }
  }

  WalletTransaction.init(
    {
      wallet_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      transaction_type: {
        type: DataTypes.ENUM(
          "RECHARGE",
          "PAYMENT",
          "REFUND",
          "CASHBACK",
          "REFERRAL",
          "SETTLEMENT",
          "COMMISSION",
          "WITHDRAWAL",
          "MANUAL_CREDIT",
          "MANUAL_DEBIT"
        ),
        allowNull: false
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
      description: {
        type: DataTypes.STRING,
        allowNull: true
      },
      razorpay_order_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      razorpay_payment_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      razorpay_signature: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "WalletTransaction",
      tableName: "WalletTransactions",
      timestamps: true,
      underscored: true
    }
  );

  return WalletTransaction;
};
