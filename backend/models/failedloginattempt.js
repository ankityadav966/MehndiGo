"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FailedLoginAttempt extends Model {}

  FailedLoginAttempt.init(
    {
      ip_address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      attempts_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      locked_until: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "FailedLoginAttempt",
      tableName: "FailedLoginAttempts",
      timestamps: true,
      underscored: true
    }
  );

  return FailedLoginAttempt;
};
