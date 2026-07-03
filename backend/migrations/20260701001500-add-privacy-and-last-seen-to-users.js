'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('Users');

    if (!tableDescription.hide_last_seen) {
      await queryInterface.addColumn('Users', 'hide_last_seen', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'hide_last_seen');
  }
};
