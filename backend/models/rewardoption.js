"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RewardOption extends Model {
    static associate(models) {
      RewardOption.hasMany(models.RewardClaim, {
        foreignKey: "reward_id",
        as: "claims"
      });
    }
  }

  RewardOption.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      xp_cost: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM("COUPON", "FEATURED_BOOST", "CASH"),
        allowNull: false,
        defaultValue: "COUPON"
      },
      value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      coupon_code: {
        type: DataTypes.STRING,
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: "RewardOption",
      tableName: "RewardOptions",
      timestamps: true,
      underscored: true
    }
  );

  return RewardOption;
};
