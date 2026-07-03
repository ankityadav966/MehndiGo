"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Banner extends Model {}

  Banner.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: false
      },
      banner_type: {
        type: DataTypes.ENUM("HOME", "OFFER", "FESTIVAL", "POPUP"),
        allowNull: false,
        defaultValue: "HOME"
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      starts_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      ends_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Banner",
      tableName: "Banners",
      timestamps: true,
      underscored: true
    }
  );

  return Banner;
};
