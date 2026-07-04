"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SettlementHistory extends Model {
    static associate(models) {
      SettlementHistory.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
      SettlementHistory.belongsTo(models.User, { foreignKey: "artist_id", as: "artist" });
    }
  }

  SettlementHistory.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      total_amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      commission_amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      artist_amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING"
      }
    },
    {
      sequelize,
      modelName: "SettlementHistory",
      tableName: "SettlementHistories",
      timestamps: true,
      underscored: true
    }
  );

  return SettlementHistory;
};
