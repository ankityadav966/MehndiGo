"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReferralCode extends Model {
    static associate(models) {
      ReferralCode.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
    }
  }

  ReferralCode.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }
    },
    {
      sequelize,
      modelName: "ReferralCode",
      tableName: "ReferralCodes",
      timestamps: true,
      underscored: true
    }
  );

  return ReferralCode;
};
