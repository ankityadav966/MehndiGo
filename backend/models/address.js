"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    static associate(models) {
      Address.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
    }
  }

  Address.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      address_line_1: {
        type: DataTypes.STRING,
        allowNull: false
      },
      address_line_2: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false
      },
      pincode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      latitude: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      longitude: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      landmark: {
        type: DataTypes.STRING,
        allowNull: true
      },
      house_flat: {
        type: DataTypes.STRING,
        allowNull: true
      },
      label: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "Home"
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }

    },
    {
      sequelize,
      modelName: "Address",
      tableName: "Addresses",
      timestamps: true,
      underscored: true
    }
  );

  return Address;
};
