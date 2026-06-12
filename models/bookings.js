"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      Booking.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist",
      });

      Booking.belongsTo(models.Service, {
        foreignKey: "service_id",
        as: "service",
      });

      Booking.belongsTo(models.AvailabilitySlot, {
        foreignKey: "slot_id",
        as: "slot",
      });
    }
  }

  Booking.init(
    {
      booking_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      slot_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      booking_date: {
        type: DataTypes.DATEONLY,
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

      total_price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      advance_paid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      remaining_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      booking_status: {
        type: DataTypes.ENUM(
          "PENDING",
          "CONFIRMED",
          "COMPLETED",
          "CANCELLED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },

      payment_status: {
        type: DataTypes.ENUM(
          "PENDING",
          "PARTIAL",
          "PAID",
          "FAILED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },

      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      cancel_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Booking",
      tableName: "Bookings",
      timestamps: true,
      underscored: true
    }
  );

  return Booking;
};