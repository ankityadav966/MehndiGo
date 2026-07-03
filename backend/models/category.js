"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Category associations can be defined here if needed
    }
  }

  Category.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true
      },
      banner: {
        type: DataTypes.STRING,
        allowNull: true
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: true
      },
      featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      popular: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        defaultValue: "ACTIVE"
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "sort_order"
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "created_by"
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "updated_by"
      }
    },
    {
      sequelize,
      modelName: "Category",
      tableName: "Categories",
      timestamps: true,
      underscored: true
    }
  );

  return Category;
};
