"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SystemSetting extends Model {}

  SystemSetting.init(
    {
      key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      value: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "SystemSetting",
      tableName: "SystemSettings",
      timestamps: true,
      underscored: true
    }
  );

  return SystemSetting;
};
