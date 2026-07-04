"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Badge extends Model {
    static associate(models) {
      Badge.hasMany(models.UserBadge, {
        foreignKey: "badge_id",
        as: "userBadges"
      });
    }
  }

  Badge.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      icon_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      criteria_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      criteria_value: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "Badge",
      tableName: "Badges",
      timestamps: true,
      underscored: true
    }
  );

  return Badge;
};
