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
