"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RewardClaim extends Model {
    static associate(models) {
      RewardClaim.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      RewardClaim.belongsTo(models.RewardOption, {
        foreignKey: "reward_id",
        as: "rewardOption"
      });
    }
  }

  RewardClaim.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      reward_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "APPROVED"
      },
      claim_code: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "RewardClaim",
      tableName: "RewardClaims",
      timestamps: true,
      underscored: true
    }
  );

  return RewardClaim;
};
