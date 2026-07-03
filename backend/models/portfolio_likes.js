"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PortfolioLike extends Model {
    static associate(models) {
      PortfolioLike.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      PortfolioLike.belongsTo(models.Portfolio, {
        foreignKey: "portfolio_id",
        as: "portfolio",
      });
    }
  }

  PortfolioLike.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      portfolio_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "PortfolioLike",
      tableName: "PortfolioLikes",
      timestamps: true,
      underscored: true,
    }
  );

  return PortfolioLike;
};
