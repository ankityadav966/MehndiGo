"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Coupon extends Model {
    static associate(models) {
      Coupon.hasMany(models.CouponUsage, {
        foreignKey: "coupon_id",
        as: "usages"
      });
    }
  }

  Coupon.init(
    {
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      discount_percentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      max_discount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      min_booking_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      discount_type: {
        type: DataTypes.ENUM("PERCENTAGE", "FLAT"),
        allowNull: false,
        defaultValue: "PERCENTAGE"
      },
      discount_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      per_user_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      usage_limit: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      used_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      first_booking_only: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      applicable_cities: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      applicable_categories: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      applicable_artists: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Coupon",
      tableName: "Coupons",
      timestamps: true,
      underscored: true,
    }
  );

  return Coupon;
};
