"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Portfolio extends Model {
    static associate(models) {
      Portfolio.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist",
      });
      Portfolio.hasMany(models.PortfolioLike, {
        foreignKey: "portfolio_id",
        as: "likes",
      });
      Portfolio.hasMany(models.PortfolioSave, {
        foreignKey: "portfolio_id",
        as: "saves",
      });
    }
  }

  Portfolio.init(
    {
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      video_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      caption: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      occasion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tags: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      visibility: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      likes_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Portfolio",
      tableName: "Portfolios",
      timestamps: true,
      underscored: true,
    }
  );

  return Portfolio;
};
