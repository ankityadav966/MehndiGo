"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FAQ extends Model {}

  FAQ.init(
    {
      category: {
        type: DataTypes.STRING,
        allowNull: false
      },
      question: {
        type: DataTypes.STRING,
        allowNull: false
      },
      answer: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: "FAQ",
      tableName: "FAQs",
      timestamps: true,
      underscored: true
    }
  );

  return FAQ;
};
