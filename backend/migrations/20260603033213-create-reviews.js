"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Reviews", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Bookings",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      artist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "artist_profiles",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

     updated_at: {
  allowNull: false,
  type: Sequelize.DATE,
  defaultValue: Sequelize.NOW,
},
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Reviews");
  },
};