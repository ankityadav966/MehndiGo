"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ServicePackage extends Model {
    static associate(models) {
      ServicePackage.belongsTo(models.Service, {
        foreignKey: "service_id",
        as: "service"
      });
    }
  }

  ServicePackage.init(
    {
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      package_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      package_price: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      included_designs: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60
      },
      number_of_hands: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      number_of_feet: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      home_visit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      touch_up_included: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      aftercare_included: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: "ServicePackage",
      tableName: "ServicePackages",
      timestamps: true,
      underscored: true
    }
  );

  return ServicePackage;
};
