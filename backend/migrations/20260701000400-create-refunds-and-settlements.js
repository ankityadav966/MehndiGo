"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create Refunds table
    await queryInterface.createTable("Refunds", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Bookings",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Payments",
          key: "id"
        },
        onDelete: "SET NULL"
      },
      razorpay_refund_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "PENDING" // PENDING, SUCCESS, FAILED
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true
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

    // 2. Create Settlements table
    await queryInterface.createTable("Settlements", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      artist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "artist_profiles",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Bookings",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      total_amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      commission_deducted: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      settled_amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "PENDING" // PENDING, PROCESSED
      },
      settled_at: {
        type: Sequelize.DATE,
        allowNull: true
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Settlements");
    await queryInterface.dropTable("Refunds");
  }
};
