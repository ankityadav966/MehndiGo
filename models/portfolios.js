"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Portfolio extends Model {
    static associate(models) {
      Portfolio.belongsTo(
        models.ArtistProfile,

        {
          foreignKey: "artist_id",

          as: "artist",
        },
      );
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

      caption: {
        type: DataTypes.STRING,

        allowNull: true,
      },
    },

    {
      sequelize,

      modelName: "Portfolio",

      tableName: "Portfolios",

      timestamps: true,

      underscored: true,
    },
  );

  return Portfolio;
};
