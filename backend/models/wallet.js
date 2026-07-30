"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Wallet extends Model {
    static associate(models) {
      Wallet.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      Wallet.hasMany(models.WalletTransaction, {
        foreignKey: "wallet_id",
        as: "transactions"
      });
    }
  }

  Wallet.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      balance: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      available_balance: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      pending_balance: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      pending_settlement: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      processing_settlement: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      outstanding_commission: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      lifetime_earnings: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      today_earnings: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      weekly_earnings: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      monthly_earnings: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      total_commission_earned: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      total_withdrawals: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      }
    },

    {
      sequelize,
      modelName: "Wallet",
      tableName: "Wallets",
      timestamps: true,
      underscored: true
    }
  );

  return Wallet;
};
