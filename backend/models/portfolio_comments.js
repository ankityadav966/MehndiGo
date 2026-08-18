"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PortfolioComment extends Model {
    static associate(models) {
      PortfolioComment.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      PortfolioComment.belongsTo(models.Portfolio, {
        foreignKey: "portfolio_id",
        as: "portfolio",
      });
    }
  }

  PortfolioComment.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      portfolio_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "PortfolioComment",
      tableName: "PortfolioComments",
      timestamps: true,
      underscored: true,
    }
  );

  return PortfolioComment;
};
