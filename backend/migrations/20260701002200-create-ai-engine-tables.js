"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create ArtistScores table
    await queryInterface.createTable("ArtistScores", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      artist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "artist_profiles", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      popularity_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      quality_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      response_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      booking_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      trust_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0
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

    // 2. Create CustomerPreferences table
    await queryInterface.createTable("CustomerPreferences", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      preferred_categories: {
        type: Sequelize.STRING,
        allowNull: true
      },
      avg_spend: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      budget_tier: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "MID"
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

    // 3. Create RecommendationCaches table
    await queryInterface.createTable("RecommendationCaches", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      cache_key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      cached_data: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      expires_at: {
        type: Sequelize.DATE,
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

    // 4. Create RecommendationHistories table
    await queryInterface.createTable("RecommendationHistories", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      artist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "artist_profiles", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      recommendation_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      clicked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      booked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    await queryInterface.dropTable("RecommendationHistories");
    await queryInterface.dropTable("RecommendationCaches");
    await queryInterface.dropTable("CustomerPreferences");
    await queryInterface.dropTable("ArtistScores");
  }
};
