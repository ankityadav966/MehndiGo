"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    static associate(models) {
      Service.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist"
      });
      Service.hasMany(models.ServicePackage, {
        foreignKey: "service_id",
        as: "packages",
        onDelete: "CASCADE"
      });
      Service.hasMany(models.ServiceAddon, {
        foreignKey: "service_id",
        as: "addons",
        onDelete: "CASCADE"
      });
    }
  }

  Service.init(
    {
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      specialization_name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      minimum_price: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      maximum_price: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      service_image: {
        type: DataTypes.STRING,
        allowNull: true
      },
      is_home_service: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      is_salon_service: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      offer_price: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      travel_charges: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      minimum_booking_amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      advance_payment_percentage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      tags: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Service",
      tableName: "Services",
      timestamps: true,
      underscored: true
    }
  );

  return Service;
};
