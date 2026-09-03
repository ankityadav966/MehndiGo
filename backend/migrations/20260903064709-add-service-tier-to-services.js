'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('services', 'service_tier', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'STANDARD'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('services', 'service_tier');
  }
};
