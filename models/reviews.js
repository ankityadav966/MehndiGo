"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });

      Review.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      Review.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist",
      });
    }
  }

  Review.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Review",
      tableName: "Reviews",
      timestamps: true,
      underscored: true
    }
  );

  return Review;
};