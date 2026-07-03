"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class KnowledgeBase extends Model {}

  KnowledgeBase.init(
    {
      category: {
        type: DataTypes.STRING,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      content: {
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
      modelName: "KnowledgeBase",
      tableName: "KnowledgeBases",
      timestamps: true,
      underscored: true
    }
  );

  return KnowledgeBase;
};
