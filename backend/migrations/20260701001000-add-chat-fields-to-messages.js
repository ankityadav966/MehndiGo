'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('Messages');

    if (!tableDescription.chat_room_id) {
      await queryInterface.addColumn('Messages', 'chat_room_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ChatRooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!tableDescription.booking_id) {
      await queryInterface.addColumn('Messages', 'booking_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Bookings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!tableDescription.message_type) {
      await queryInterface.addColumn('Messages', 'message_type', {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'TEXT'
      });
    }

    if (!tableDescription.parent_message_id) {
      await queryInterface.addColumn('Messages', 'parent_message_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Messages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!tableDescription.is_edited) {
      await queryInterface.addColumn('Messages', 'is_edited', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableDescription.is_starred_customer) {
      await queryInterface.addColumn('Messages', 'is_starred_customer', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableDescription.is_starred_artist) {
      await queryInterface.addColumn('Messages', 'is_starred_artist', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableDescription.deleted_by_sender) {
      await queryInterface.addColumn('Messages', 'deleted_by_sender', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableDescription.deleted_by_receiver) {
      await queryInterface.addColumn('Messages', 'deleted_by_receiver', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableDescription.is_deleted_everyone) {
      await queryInterface.addColumn('Messages', 'is_deleted_everyone', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Messages', 'chat_room_id');
    await queryInterface.removeColumn('Messages', 'booking_id');
    await queryInterface.removeColumn('Messages', 'message_type');
    await queryInterface.removeColumn('Messages', 'parent_message_id');
    await queryInterface.removeColumn('Messages', 'is_edited');
    await queryInterface.removeColumn('Messages', 'is_starred_customer');
    await queryInterface.removeColumn('Messages', 'is_starred_artist');
    await queryInterface.removeColumn('Messages', 'deleted_by_sender');
    await queryInterface.removeColumn('Messages', 'deleted_by_receiver');
    await queryInterface.removeColumn('Messages', 'is_deleted_everyone');
  }
};
