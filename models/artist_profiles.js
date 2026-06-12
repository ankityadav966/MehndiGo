"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ArtistProfile extends Model {
    static associate(models) {
      ArtistProfile.belongsTo(
        models.User,
        {
          foreignKey: "user_id",
          as: "user",
        },

        ArtistProfile.hasMany(models.Service, {
          foreignKey: "artist_id",
          as: "services",
        }),
        ArtistProfile.hasMany(models.Portfolio, {
          foreignKey: "artist_id",
          as: "portfolio",
        }),
        ArtistProfile.hasMany(models.AvailabilitySlot, {
          foreignKey: "artist_id",
          as: "slots",
        }),
        ArtistProfile.hasMany(models.Review, {
          foreignKey: "artist_id",
          as: "reviews",
        }),
      );
    }
  }

  ArtistProfile.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },

      bio: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      experience_years: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      price_start: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      home_service: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      salon_service: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      avg_rating: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },

      total_reviews: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_bookings: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      aadhaar_front: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      aadhaar_back: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      selfie_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      verification_status: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING",
      },

      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },

      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },

      last_location_update: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ArtistProfile",
      tableName: "artist_profiles",
      timestamps: true,
      underscored: true,
    },
  );

  return ArtistProfile;
};
