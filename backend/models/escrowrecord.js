"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class EscrowRecord extends Model {
    static associate(models) {
      EscrowRecord.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
      EscrowRecord.belongsTo(models.User, { foreignKey: "artist_id", as: "artist" });
    }
  }

  EscrowRecord.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("HELD", "RELEASED", "REFUNDED"),
        allowNull: false,
        defaultValue: "HELD"
      }
    },
    {
      sequelize,
      modelName: "EscrowRecord",
      tableName: "EscrowRecords",
      timestamps: true,
      underscored: true
    }
  );

  return EscrowRecord;
};
