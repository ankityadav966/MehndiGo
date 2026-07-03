"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("artist_profiles", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      bio: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      experience_years: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },


      home_service: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      salon_service: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      avg_rating: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },

      total_reviews: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_bookings: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_available: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      aadhaar_front: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      aadhaar_back: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      selfie_image: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      verification_status: {
        type: Sequelize.ENUM(
          "PENDING",
          "APPROVED",
          "REJECTED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },

      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      location: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      city: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      state: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      pincode: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },

      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },

      last_location_update: {
        type: Sequelize.DATE,
        allowNull: true,
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
    await queryInterface.dropTable(
      "artist_profiles"
    );
  },
};
