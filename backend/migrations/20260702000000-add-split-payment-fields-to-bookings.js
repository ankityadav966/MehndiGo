"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Bookings", "artist_completion_status", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "PENDING"
    });
    await queryInterface.addColumn("Bookings", "artist_completed_at", {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn("Bookings", "remaining_paid_at", {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Bookings", "remaining_paid_at");
    await queryInterface.removeColumn("Bookings", "artist_completed_at");
    await queryInterface.removeColumn("Bookings", "artist_completion_status");
  }
};
