"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Bookings", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      booking_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
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

      service_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Services",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      slot_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "AvailabilitySlots",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },

    
      total_price: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      advance_paid: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      remaining_amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      booking_status: {
        type: Sequelize.ENUM(
          "PENDING",
          "CONFIRMED",
          "COMPLETED",
          "CANCELLED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },

      payment_status: {
        type: Sequelize.ENUM(
          "PENDING",
          "PARTIAL",
          "PAID",
          "FAILED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },
      

      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      notes: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      cancel_reason: {
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
    await queryInterface.dropTable("Bookings");
  },
};