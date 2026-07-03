"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReferralCampaign extends Model {}

  ReferralCampaign.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      referrer_reward: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      referred_reward: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: "ReferralCampaign",
      tableName: "ReferralCampaigns",
      timestamps: true,
      underscored: true
    }
  );

  return ReferralCampaign;
};
