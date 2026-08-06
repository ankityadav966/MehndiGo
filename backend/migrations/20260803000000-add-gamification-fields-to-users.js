'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('Users');

    if (!tableDescription.current_level) {
      await queryInterface.addColumn('Users', 'current_level', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
    }
    if (!tableDescription.current_xp) {
      await queryInterface.addColumn('Users', 'current_xp', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
    if (!tableDescription.lifetime_xp) {
      await queryInterface.addColumn('Users', 'lifetime_xp', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
    if (!tableDescription.ambassador_tier) {
      await queryInterface.addColumn('Users', 'ambassador_tier', {
        type: Sequelize.ENUM("BEGINNER", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "ELITE"),
        allowNull: false,
        defaultValue: "BEGINNER"
      });
    }
    if (!tableDescription.ambassador_score) {
      await queryInterface.addColumn('Users', 'ambassador_score', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
    if (!tableDescription.device_uuid) {
      await queryInterface.addColumn('Users', 'device_uuid', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'current_level');
    await queryInterface.removeColumn('Users', 'current_xp');
    await queryInterface.removeColumn('Users', 'lifetime_xp');
    await queryInterface.removeColumn('Users', 'ambassador_tier');
    await queryInterface.removeColumn('Users', 'ambassador_score');
    await queryInterface.removeColumn('Users', 'device_uuid');
  }
};
