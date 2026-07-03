"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add extra columns to Portfolios table
    await queryInterface.addColumn("Portfolios", "video_url", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Portfolios", "title", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Portfolios", "description", {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Portfolios", "category", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Portfolios", "occasion", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Portfolios", "tags", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Portfolios", "location", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Portfolios", "visibility", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn("Portfolios", "display_order", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Portfolios", "likes_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    // 2. Create PortfolioLikes table
    await queryInterface.createTable("PortfolioLikes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      portfolio_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Portfolios",
          key: "id"
        },
        onDelete: "CASCADE"
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

    // 3. Create PortfolioSaves table
    await queryInterface.createTable("PortfolioSaves", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      portfolio_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Portfolios",
          key: "id"
        },
        onDelete: "CASCADE"
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

    // Add unique constraint to prevent duplicate likes and saves
    await queryInterface.addConstraint("PortfolioLikes", {
      fields: ["user_id", "portfolio_id"],
      type: "unique",
      name: "unique_user_portfolio_like"
    });

    await queryInterface.addConstraint("PortfolioSaves", {
      fields: ["user_id", "portfolio_id"],
      type: "unique",
      name: "unique_user_portfolio_save"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("PortfolioSaves");
    await queryInterface.dropTable("PortfolioLikes");

    await queryInterface.removeColumn("Portfolios", "video_url");
    await queryInterface.removeColumn("Portfolios", "title");
    await queryInterface.removeColumn("Portfolios", "description");
    await queryInterface.removeColumn("Portfolios", "category");
    await queryInterface.removeColumn("Portfolios", "occasion");
    await queryInterface.removeColumn("Portfolios", "tags");
    await queryInterface.removeColumn("Portfolios", "location");
    await queryInterface.removeColumn("Portfolios", "visibility");
    await queryInterface.removeColumn("Portfolios", "display_order");
    await queryInterface.removeColumn("Portfolios", "likes_count");
  }
};
