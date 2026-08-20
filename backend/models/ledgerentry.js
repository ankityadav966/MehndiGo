"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LedgerEntry extends Model {
    static associate(models) {
      LedgerEntry.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      LedgerEntry.belongsTo(models.Wallet, {
        foreignKey: "wallet_id",
        as: "wallet"
      });
      LedgerEntry.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking"
      });
    }
  }

  LedgerEntry.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      wallet_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      entry_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      balance_after: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      reference_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "LedgerEntry",
      tableName: "LedgerEntries",
      timestamps: true,
      underscored: true
    }
  );

  return LedgerEntry;
};
