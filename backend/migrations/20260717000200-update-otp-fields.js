"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Make phone nullable
    await queryInterface.changeColumn("Otps", "phone", {
      type: Sequelize.STRING(15),
      allowNull: true,
    });

    // 2. Make user_id nullable
    await queryInterface.changeColumn("Otps", "user_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // 3. Add email column
    await queryInterface.addColumn("Otps", "email", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    // 4. Add registration_payload column
    await queryInterface.addColumn("Otps", "registration_payload", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // 1. Remove registration_payload column
    await queryInterface.removeColumn("Otps", "registration_payload");

    // 2. Remove email column
    await queryInterface.removeColumn("Otps", "email");

    // 3. Revert user_id to not nullable
    await queryInterface.changeColumn("Otps", "user_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // 4. Revert phone to not nullable
    await queryInterface.changeColumn("Otps", "phone", {
      type: Sequelize.STRING(15),
      allowNull: false,
    });
  },
};
