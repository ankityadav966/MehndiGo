'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add timestamp columns to Messages table if they don't exist
    const tableDescription = await queryInterface.describeTable('Messages');
    
    if (!tableDescription.createdAt) {
      await queryInterface.addColumn('Messages', 'createdAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW
      });
    }
    
    if (!tableDescription.updatedAt) {
      await queryInterface.addColumn('Messages', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW
      });
    }
    
    // Set existing rows to have a timestamp
    await queryInterface.sequelize.query(
      `UPDATE "Messages" SET "createdAt" = NOW(), "updatedAt" = NOW() WHERE "createdAt" IS NULL`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Messages', 'createdAt');
    await queryInterface.removeColumn('Messages', 'updatedAt');
  }
};
