"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add extra columns to Reviews table
    await queryInterface.addColumn("Reviews", "design_quality_rating", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn("Reviews", "punctuality_rating", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn("Reviews", "professionalism_rating", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn("Reviews", "helpful_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    // 2. Create ReviewReplies table
    await queryInterface.createTable("ReviewReplies", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      review_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Reviews",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      artist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "artist_profiles",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      reply_text: {
        type: Sequelize.TEXT,
        allowNull: false
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

    // 3. Create ReviewReports table
    await queryInterface.createTable("ReviewReports", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      review_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Reviews",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: false
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

    // 4. Create HelpfulVotes table
    await queryInterface.createTable("HelpfulVotes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      review_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Reviews",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
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
    await queryInterface.dropTable("HelpfulVotes");
    await queryInterface.dropTable("ReviewReports");
    await queryInterface.dropTable("ReviewReplies");
    await queryInterface.removeColumn("Reviews", "design_quality_rating");
    await queryInterface.removeColumn("Reviews", "punctuality_rating");
    await queryInterface.removeColumn("Reviews", "professionalism_rating");
    await queryInterface.removeColumn("Reviews", "helpful_count");
  }
};
