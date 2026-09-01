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
      artist_boost_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7
      },
      welcome_boost_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3
      },
      customer_benefit: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "Priority Support & Exclusive Offers"
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
