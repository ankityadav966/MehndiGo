"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Settlement extends Model {
    static associate(models) {
      Settlement.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist"
      });
      Settlement.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking"
      });
    }
  }

  Settlement.init(
    {
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      total_amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      commission_deducted: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      settled_amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PENDING"
      },
      settled_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Settlement",
      tableName: "Settlements",
      timestamps: true,
      underscored: true
    }
  );

  return Settlement;
};
