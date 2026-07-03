"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      phone: {
        type: Sequelize.STRING(15),
        allowNull: false,
        unique: true,
      },

      email: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },

      role: {
        type: Sequelize.ENUM("USER", "ARTIST","ADMIN"),
        allowNull: false,
        defaultValue: "USER",
      },

      profile_image: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      gender: {
        type: Sequelize.ENUM("MALE", "FEMALE", "OTHER"),
        allowNull: true,
      },

      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      last_login_at: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable("Users");
  },
};