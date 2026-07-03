"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AvailabilitySlot extends Model {
    static associate(models) {
      AvailabilitySlot.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist",
      });
    }
  }

  AvailabilitySlot.init(
    {
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      end_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      is_booked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "AvailabilitySlot",
      tableName: "AvailabilitySlots",
      timestamps: true, 
      underscored: true,
    }
  );

  return AvailabilitySlot;
};