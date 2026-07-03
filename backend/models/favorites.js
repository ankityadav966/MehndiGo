"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Favorite extends Model {
    static associate(models) {
      Favorite.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      Favorite.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist",
      });
    }
  }

  Favorite.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Favorite",
      tableName: "Favorites",
      timestamps: true,
      underscored: true,
    }
  );

  return Favorite;
};
