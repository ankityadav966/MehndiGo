"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Invoice extends Model {
    static associate(models) {
      Invoice.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });
    }
  }

  Invoice.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      invoice_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      invoice_url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Invoice",
      tableName: "Invoices",
      timestamps: true,
      underscored: true,
    }
  );

  return Invoice;
};
