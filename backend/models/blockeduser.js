'use strict';
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BlockedUser extends Model {
    static associate(models) {
      BlockedUser.belongsTo(models.User, {
        foreignKey: "blocker_id",
        as: "blocker",
      });
      BlockedUser.belongsTo(models.User, {
        foreignKey: "blocked_id",
        as: "blocked",
      });
    }
  }

  BlockedUser.init(
    {
      blocker_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      blocked_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "BlockedUser",
      tableName: "BlockedUsers",
      timestamps: true,
      underscored: true,
    }
  );

  return BlockedUser;
};
