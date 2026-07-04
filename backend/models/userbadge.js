"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserBadge extends Model {
    static associate(models) {
      UserBadge.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      UserBadge.belongsTo(models.Badge, {
        foreignKey: "badge_id",
        as: "badge"
      });
    }
  }

  UserBadge.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      badge_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "UserBadge",
      tableName: "UserBadges",
      timestamps: true,
      underscored: true
    }
  );

  return UserBadge;
};
