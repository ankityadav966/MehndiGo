'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make phone nullable
    await queryInterface.changeColumn("Users", "phone", {
      type: Sequelize.STRING(15),
      allowNull: true,
    });

    // Make email non-nullable
    await queryInterface.changeColumn("Users", "email", {
      type: Sequelize.STRING(100),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Users", "phone", {
      type: Sequelize.STRING(15),
      allowNull: false,
    });

    await queryInterface.changeColumn("Users", "email", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  }
};
