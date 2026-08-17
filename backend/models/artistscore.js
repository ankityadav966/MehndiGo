"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ArtistScore extends Model {
    static associate(models) {
      ArtistScore.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist"
      });
    }
  }

  ArtistScore.init(
    {
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      popularity_score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      quality_score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      response_score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      booking_score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      trust_score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      reliability_score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100.0
      },
      acceptance_rate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100.0
      },
      completion_rate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100.0
      },
      on_time_rate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100.0
      },
      tier_badge: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "ON_TIME_PRO"
      }
    },
    {
      sequelize,
      modelName: "ArtistScore",
      tableName: "ArtistScores",
      timestamps: true,
      underscored: true
    }
  );

  return ArtistScore;
};
