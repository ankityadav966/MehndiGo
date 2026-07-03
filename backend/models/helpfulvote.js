"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class HelpfulVote extends Model {
    static associate(models) {
      HelpfulVote.belongsTo(models.Review, {
        foreignKey: "review_id",
        as: "review"
      });
      HelpfulVote.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
    }
  }

  HelpfulVote.init(
    {
      review_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "HelpfulVote",
      tableName: "HelpfulVotes",
      timestamps: true,
      underscored: true
    }
  );

  return HelpfulVote;
};
