"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add views_count and caption columns to Portfolios table
    const portfolioTable = await queryInterface.describeTable("Portfolios");
    
    if (!portfolioTable.views_count) {
      await queryInterface.addColumn("Portfolios", "views_count", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!portfolioTable.caption) {
      await queryInterface.addColumn("Portfolios", "caption", {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // 2. Create PortfolioComments table if it does not already exist
    const tables = await queryInterface.showAllTables();
    const hasTable = tables.includes("PortfolioComments") || tables.includes("portfoliocomments");

    if (!hasTable) {
      await queryInterface.createTable("PortfolioComments", {
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
          onDelete: "CASCADE",
          onUpdate: "CASCADE"
        },
        portfolio_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "Portfolios",
            key: "id"
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE"
        },
        text: {
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

      await queryInterface.addIndex("PortfolioComments", ["portfolio_id"], {
        name: "idx_portfolio_comments_portfolio_id"
      });

      await queryInterface.addIndex("PortfolioComments", ["user_id"], {
        name: "idx_portfolio_comments_user_id"
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("PortfolioComments") || tables.includes("portfoliocomments")) {
      await queryInterface.dropTable("PortfolioComments");
    }

    const portfolioTable = await queryInterface.describeTable("Portfolios");
    if (portfolioTable.views_count) {
      await queryInterface.removeColumn("Portfolios", "views_count");
    }
    if (portfolioTable.caption) {
      await queryInterface.removeColumn("Portfolios", "caption");
    }
  }
};
