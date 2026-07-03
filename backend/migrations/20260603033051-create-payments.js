"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Payments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Bookings",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },

      payment_method: {
        type: Sequelize.ENUM(
          "CASH",
          "UPI",
          "CARD",
          "WALLET",
          "ONLINE"
        ),
        allowNull: false,
      },

      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      status: {
        type: Sequelize.ENUM(
          "PENDING",
          "SUCCESS",
          "FAILED",
          "REFUNDED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },

      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

     updated_at: {
  allowNull: false,
  type: Sequelize.DATE,
  defaultValue: Sequelize.NOW,
},
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Payments");
  },
};