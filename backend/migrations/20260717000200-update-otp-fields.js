"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("Otps");

    // 1. Make phone nullable
    if (tableDescription.phone && !tableDescription.phone.allowNull) {
      await queryInterface.changeColumn("Otps", "phone", {
        type: Sequelize.STRING(15),
        allowNull: true,
      });
    }

    // 2. Make user_id nullable
    if (tableDescription.user_id && !tableDescription.user_id.allowNull) {
      await queryInterface.changeColumn("Otps", "user_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    // 3. Add email column
    if (!tableDescription.email) {
      await queryInterface.addColumn("Otps", "email", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    // 4. Add registration_payload column
    if (!tableDescription.registration_payload) {
      await queryInterface.addColumn("Otps", "registration_payload", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("Otps");

    if (tableDescription.registration_payload) {
      await queryInterface.removeColumn("Otps", "registration_payload");
    }

    if (tableDescription.email) {
      await queryInterface.removeColumn("Otps", "email");
    }

    if (tableDescription.user_id) {
      await queryInterface.changeColumn("Otps", "user_id", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    if (tableDescription.phone) {
      await queryInterface.changeColumn("Otps", "phone", {
        type: Sequelize.STRING(15),
        allowNull: false,
      });
    }
  },
};
