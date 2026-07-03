"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CouponUsage extends Model {
    static associate(models) {
      CouponUsage.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      CouponUsage.belongsTo(models.Coupon, {
        foreignKey: "coupon_id",
        as: "coupon"
      });
      CouponUsage.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking"
      });
    }
  }

  CouponUsage.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      coupon_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "CouponUsage",
      tableName: "CouponUsages",
      timestamps: true,
      underscored: true
    }
  );

  return CouponUsage;
};
