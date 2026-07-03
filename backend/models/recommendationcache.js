"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RecommendationCache extends Model {}

  RecommendationCache.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      cache_key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      cached_data: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "RecommendationCache",
      tableName: "RecommendationCaches",
      timestamps: true,
      underscored: true
    }
  );

  return RecommendationCache;
};
