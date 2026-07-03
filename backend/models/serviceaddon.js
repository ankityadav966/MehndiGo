"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ServiceAddon extends Model {
    static associate(models) {
      ServiceAddon.belongsTo(models.Service, {
        foreignKey: "service_id",
        as: "service"
      });
    }
  }

  ServiceAddon.init(
    {
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      addon_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      addon_price: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "ServiceAddon",
      tableName: "ServiceAddons",
      timestamps: true,
      underscored: true
    }
  );

  return ServiceAddon;
};
