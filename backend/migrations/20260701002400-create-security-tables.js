"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create SecurityLogs table
    await queryInterface.createTable("SecurityLogs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      event_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      severity: {
        type: Sequelize.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
        allowNull: false,
        defaultValue: "LOW"
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });

    // 2. Create BlockedIPs table
    await queryInterface.createTable("BlockedIPs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });

    // 3. Create FailedLoginAttempts table
    await queryInterface.createTable("FailedLoginAttempts", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      attempts_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      locked_until: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("FailedLoginAttempts");
    await queryInterface.dropTable("BlockedIPs");
    await queryInterface.dropTable("SecurityLogs");
  }
};
