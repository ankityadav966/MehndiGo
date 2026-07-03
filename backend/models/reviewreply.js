"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReviewReply extends Model {
    static associate(models) {
      ReviewReply.belongsTo(models.Review, {
        foreignKey: "review_id",
        as: "review"
      });
      ReviewReply.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist"
      });
    }
  }

  ReviewReply.init(
    {
      review_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      reply_text: {
        type: DataTypes.TEXT,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "ReviewReply",
      tableName: "ReviewReplies",
      timestamps: true,
      underscored: true
    }
  );

  return ReviewReply;
};
