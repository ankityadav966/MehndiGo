"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BankAccount extends Model {
    static associate(models) {
      BankAccount.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
    }
  }

  BankAccount.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      account_holder_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      account_number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      ifsc_code: {
        type: DataTypes.STRING,
        allowNull: false
      },
      bank_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      upi_id: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "BankAccount",
      tableName: "BankAccounts",
      timestamps: true,
      underscored: true
    }
  );

  return BankAccount;
};
