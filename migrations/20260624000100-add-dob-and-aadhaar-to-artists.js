"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("artist_profiles", "dob", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("artist_profiles", "aadhaar_number", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("artist_profiles", "dob");
    await queryInterface.removeColumn("artist_profiles", "aadhaar_number");
  },
};
