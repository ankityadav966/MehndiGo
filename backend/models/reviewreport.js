"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReviewReport extends Model {
    static associate(models) {
      ReviewReport.belongsTo(models.Review, {
        foreignKey: "review_id",
        as: "review"
      });
      ReviewReport.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
    }
  }

  ReviewReport.init(
    {
      review_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "ReviewReport",
      tableName: "ReviewReports",
      timestamps: true,
      underscored: true
    }
  );

  return ReviewReport;
};
