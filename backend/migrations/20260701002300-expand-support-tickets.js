"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add extra columns to SupportTickets table
    await queryInterface.addColumn("SupportTickets", "category", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "Other"
    });
    
    await queryInterface.addColumn("SupportTickets", "priority", {
      type: Sequelize.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
      allowNull: false,
      defaultValue: "LOW"
    });

    await queryInterface.addColumn("SupportTickets", "attachments", {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("SupportTickets", "rating", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn("SupportTickets", "feedback", {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // 2. Create FAQs table
    await queryInterface.createTable("FAQs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      question: {
        type: Sequelize.STRING,
        allowNull: false
      },
      answer: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    // 3. Create KnowledgeBases table (articles and guidebooks)
    await queryInterface.createTable("KnowledgeBases", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    await queryInterface.dropTable("KnowledgeBases");
    await queryInterface.dropTable("FAQs");
    await queryInterface.removeColumn("SupportTickets", "feedback");
    await queryInterface.removeColumn("SupportTickets", "rating");
    await queryInterface.removeColumn("SupportTickets", "attachments");
    await queryInterface.removeColumn("SupportTickets", "priority");
    await queryInterface.removeColumn("SupportTickets", "category");
  }
};
