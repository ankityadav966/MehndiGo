"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CMSPage extends Model {}

  CMSPage.init(
    {
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "CMSPage",
      tableName: "CMSPages",
      timestamps: true,
      underscored: true
    }
  );

  return CMSPage;
};
