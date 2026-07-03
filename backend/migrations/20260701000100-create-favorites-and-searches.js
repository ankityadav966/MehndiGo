"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create RecentSearches Table
    await queryInterface.createTable("RecentSearches", {
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
      },
      search_query: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // 2. Create Favorites Table
    await queryInterface.createTable("Favorites", {
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
      },
      artist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "artist_profiles",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Unique index on Favorites to prevent duplicate entries
    await queryInterface.addIndex("Favorites", ["user_id", "artist_id"], {
      unique: true,
      name: "unique_user_artist_favorites",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Favorites");
    await queryInterface.dropTable("RecentSearches");
  },
};
