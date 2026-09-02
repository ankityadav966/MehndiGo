"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReferralHistory extends Model {
    static associate(models) {
      ReferralHistory.belongsTo(models.User, {
        foreignKey: "referrer_id",
        as: "referrer"
      });
      ReferralHistory.belongsTo(models.User, {
        foreignKey: "referred_id",
        as: "referred"
      });
    }
  }

  ReferralHistory.init(
    {
      referrer_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      referred_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true // one referral entry per referred user, ever
      },
      referral_type: {
        type: DataTypes.ENUM("CUSTOMER_TO_CUSTOMER", "CUSTOMER_TO_ARTIST", "ARTIST_TO_ARTIST"),
        allowNull: false,
        defaultValue: "CUSTOMER_TO_CUSTOMER"
      },
      referral_code: {
        type: DataTypes.STRING,
        allowNull: true
      },
      // Lifecycle status for the referred user's journey
      referral_status: {
        type: DataTypes.ENUM("PENDING", "REGISTERED", "QUALIFIED"),
        allowNull: false,
        defaultValue: "REGISTERED"
      },
      qualified_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      fraud_flag: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      // Legacy fields kept for backwards compat
      status: {
        type: DataTypes.ENUM("PENDING", "COMPLETED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING"
      },
      boost_days_awarded: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      customer_benefit_awarded: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reward_status: {
        type: DataTypes.ENUM("PENDING", "CREDITED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING"
      }
    },
    {
      sequelize,
      modelName: "ReferralHistory",
      tableName: "ReferralHistories",
      timestamps: true,
      underscored: true
    }
  );

  return ReferralHistory;
};
