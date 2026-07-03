"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RecentSearch extends Model {
    static associate(models) {
      RecentSearch.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  RecentSearch.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      search_query: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RecentSearch",
      tableName: "RecentSearches",
      timestamps: true,
      underscored: true,
    }
  );

  return RecentSearch;
};
