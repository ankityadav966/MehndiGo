"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add data column to Notifications table
    await queryInterface.addColumn("Notifications", "data", {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Notifications", "data");
  }
};
