"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BlockedIP extends Model {}

  BlockedIP.init(
    {
      ip_address: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "BlockedIP",
      tableName: "BlockedIPs",
      timestamps: true,
      underscored: true
    }
  );

  return BlockedIP;
};
