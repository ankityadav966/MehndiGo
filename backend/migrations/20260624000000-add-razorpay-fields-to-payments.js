"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Payments", "razorpay_order_id", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Payments", "razorpay_payment_id", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Payments", "razorpay_signature", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Payments", "razorpay_order_id");
    await queryInterface.removeColumn("Payments", "razorpay_payment_id");
    await queryInterface.removeColumn("Payments", "razorpay_signature");
  },
};
