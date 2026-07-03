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
        unique: true
      },
      status: {
        type: DataTypes.ENUM("PENDING", "COMPLETED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING"
      },
      reward_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
