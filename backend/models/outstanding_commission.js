"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OutstandingCommission extends Model {
    static associate(models) {
      OutstandingCommission.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist"
      });
      OutstandingCommission.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking"
      });
    }
  }

  OutstandingCommission.init(
    {
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      gross_amount: {
        type: DataTypes.DOUBLE,
        allowNull: false
      },
      commission_amount: {
        type: DataTypes.DOUBLE,
        allowNull: false
      },
      gst_amount: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
      },
      total_due: {
        type: DataTypes.DOUBLE,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("PENDING", "PAID", "OVERDUE", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING"
      },
      razorpay_order_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      razorpay_payment_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "OutstandingCommission",
      tableName: "OutstandingCommissions",
      timestamps: true,
      underscored: true
    }
  );

  return OutstandingCommission;
};
