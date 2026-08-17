"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SupportTicket extends Model {
    static associate(models) {
      SupportTicket.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      SupportTicket.belongsTo(models.User, {
        foreignKey: "assigned_to",
        as: "assignee"
      });
    }
  }

  SupportTicket.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      dispute_reason: {
        type: DataTypes.STRING,
        allowNull: true
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("OPEN", "ASSIGNED", "CLOSED", "ESCALATED"),
        allowNull: false,
        defaultValue: "OPEN"
      },
      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      replies: {
        type: DataTypes.TEXT, // Holds JSON string list of replies
        allowNull: true
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Other"
      },
      priority: {
        type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
        allowNull: false,
        defaultValue: "LOW"
      },
      attachments: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "SupportTicket",
      tableName: "SupportTickets",
      timestamps: true,
      underscored: true
    }
  );

  return SupportTicket;
};
