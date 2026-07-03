"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("NotificationTokens", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
      token: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      device_type: {
        type: Sequelize.ENUM("ANDROID", "IOS", "WEB"),
        allowNull: false,
        defaultValue: "ANDROID",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Composite unique constraint: user_id + token to prevent duplicates
    await queryInterface.addConstraint("NotificationTokens", {
      fields: ["user_id", "token"],
      type: "unique",
      name: "unique_user_token_constraint"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("NotificationTokens");
  },
};
