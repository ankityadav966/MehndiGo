"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReferralReward extends Model {
    static associate(models) {
      ReferralReward.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
    }
  }

  ReferralReward.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      reward_type: {
        type: DataTypes.ENUM(
          "CUSTOMER_50_PERCENT_OFFER",
          "CUSTOMER_70_PERCENT_OFFER",
          "ARTIST_FEATURED_PROFILE"
        ),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("LOCKED", "UNLOCKED", "REDEEMED"),
        allowNull: false,
        defaultValue: "LOCKED"
      },
      unlocked_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      redeemed_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "ReferralReward",
      tableName: "ReferralRewards",
      timestamps: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ["user_id", "reward_type"], name: "referral_rewards_user_type_unique" }
      ]
    }
  );

  return ReferralReward;
};
