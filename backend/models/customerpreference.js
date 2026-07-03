"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CustomerPreference extends Model {
    static associate(models) {
      CustomerPreference.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
    }
  }

  CustomerPreference.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      preferred_categories: {
        type: DataTypes.STRING,
        allowNull: true
      },
      avg_spend: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      budget_tier: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "MID"
      }
    },
    {
      sequelize,
      modelName: "CustomerPreference",
      tableName: "CustomerPreferences",
      timestamps: true,
      underscored: true
    }
  );

  return CustomerPreference;
};
