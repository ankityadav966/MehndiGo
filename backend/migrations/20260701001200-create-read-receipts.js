'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ReadReceipts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      message_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Messages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('SENT', 'DELIVERED', 'READ'),
        allowNull: false,
        defaultValue: 'SENT'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add unique constraint on message_id and user_id to prevent duplicates
    await queryInterface.addConstraint('ReadReceipts', {
      fields: ['message_id', 'user_id'],
      type: 'unique',
      name: 'unique_message_user_receipt'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ReadReceipts');
  }
};
