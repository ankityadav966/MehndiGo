"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Coupons", "discount_type", {
      type: Sequelize.ENUM("PERCENTAGE", "FLAT"),
      allowNull: false,
      defaultValue: "PERCENTAGE"
    });
    await queryInterface.addColumn("Coupons", "discount_value", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Coupons", "per_user_limit", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await queryInterface.addColumn("Coupons", "usage_limit", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn("Coupons", "used_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Coupons", "first_booking_only", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn("Coupons", "applicable_cities", {
      type: Sequelize.TEXT, // Comma-separated or JSON list
      allowNull: true
    });
    await queryInterface.addColumn("Coupons", "applicable_categories", {
      type: Sequelize.TEXT, // Comma-separated service categories
      allowNull: true
    });
    await queryInterface.addColumn("Coupons", "applicable_artists", {
      type: Sequelize.TEXT, // Comma-separated list of artist profile IDs
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Coupons", "discount_type");
    await queryInterface.removeColumn("Coupons", "discount_value");
    await queryInterface.removeColumn("Coupons", "per_user_limit");
    await queryInterface.removeColumn("Coupons", "usage_limit");
    await queryInterface.removeColumn("Coupons", "used_count");
    await queryInterface.removeColumn("Coupons", "first_booking_only");
    await queryInterface.removeColumn("Coupons", "applicable_cities");
    await queryInterface.removeColumn("Coupons", "applicable_categories");
    await queryInterface.removeColumn("Coupons", "applicable_artists");
  }
};
