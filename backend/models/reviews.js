"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking"
      });
      Review.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      Review.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist"
      });
      Review.hasMany(models.ReviewReply, {
        foreignKey: "review_id",
        as: "replies",
        onDelete: "CASCADE"
      });
      Review.hasMany(models.ReviewReport, {
        foreignKey: "review_id",
        as: "reports",
        onDelete: "CASCADE"
      });
      Review.hasMany(models.HelpfulVote, {
        foreignKey: "review_id",
        as: "votes",
        onDelete: "CASCADE"
      });
    }
  }

  Review.init(
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      design_quality_rating: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      punctuality_rating: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      professionalism_rating: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      helpful_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      video_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      video_thumbnail: {
        type: DataTypes.STRING,
        allowNull: true
      },
      photos: {
        type: DataTypes.JSON,
        allowNull: true
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: "Review",
      tableName: "Reviews",
      timestamps: true,
      underscored: true
    }
  );

  return Review;
};