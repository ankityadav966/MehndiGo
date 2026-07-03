'use strict';
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReadReceipt extends Model {
    static associate(models) {
      ReadReceipt.belongsTo(models.Message, {
        foreignKey: "message_id",
        as: "message",
      });
      ReadReceipt.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  ReadReceipt.init(
    {
      message_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("SENT", "DELIVERED", "READ"),
        allowNull: false,
        defaultValue: "SENT",
      },
    },
    {
      sequelize,
      modelName: "ReadReceipt",
      tableName: "ReadReceipts",
      timestamps: true,
      underscored: true,
    }
  );

  return ReadReceipt;
};
