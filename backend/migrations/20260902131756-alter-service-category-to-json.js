'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    if (queryInterface.sequelize.options.dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Services" 
        ALTER COLUMN category TYPE JSONB 
        USING CAST('["' || category || '"]' AS JSONB);
      `);
    } else {
      // Create a temporary column to migrate data safely if needed,
      // but for simplicity we'll just try changing the column.
      await queryInterface.changeColumn('Services', 'category', {
        type: Sequelize.JSON,
        allowNull: false
      });
    }
  },

  async down (queryInterface, Sequelize) {
    if (queryInterface.sequelize.options.dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Services" 
        ALTER COLUMN category TYPE VARCHAR(100) 
        USING category->>0;
      `);
    } else {
      await queryInterface.changeColumn('Services', 'category', {
        type: Sequelize.STRING(100),
        allowNull: false
      });
    }
  }
};
