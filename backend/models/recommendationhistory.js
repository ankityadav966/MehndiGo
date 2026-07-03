"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RecommendationHistory extends Model {
    static associate(models) {
      RecommendationHistory.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      RecommendationHistory.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist"
      });
    }
  }

  RecommendationHistory.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      recommendation_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      clicked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      booked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: "RecommendationHistory",
      tableName: "RecommendationHistories",
      timestamps: true,
      underscored: true
    }
  );

  return RecommendationHistory;
};
