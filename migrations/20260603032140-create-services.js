
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Services", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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

      specialization_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      minimum_price: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      maximum_price: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      service_image: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      is_home_service: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      is_salon_service: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue:
          Sequelize.literal(
            "CURRENT_TIMESTAMP"
          ),
      },

      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue:
          Sequelize.literal(
            "CURRENT_TIMESTAMP"
          ),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Services");
  },
};
