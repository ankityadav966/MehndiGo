"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PortfolioSave extends Model {
    static associate(models) {
      PortfolioSave.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      PortfolioSave.belongsTo(models.Portfolio, {
        foreignKey: "portfolio_id",
        as: "portfolio",
      });
    }
  }

  PortfolioSave.init(
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
      modelName: "PortfolioSave",
      tableName: "PortfolioSaves",
      timestamps: true,
      underscored: true,
    }
  );

  return PortfolioSave;
};
