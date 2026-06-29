"use strict";

const { Model } = require("sequelize");

module.exports = (
  sequelize,

  DataTypes,
) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(
        models.User,

        {
          foreignKey: "sender_id",

          as: "sender",
        },
      );

      Message.belongsTo(
        models.User,

        {
          foreignKey: "receiver_id",

          as: "receiver",
        },
      );
    }
  }

  Message.init(
    {
      sender_id: {
        type: DataTypes.INTEGER,

        allowNull: false,
      },

      receiver_id: {
        type: DataTypes.INTEGER,

        allowNull: false,
      },

      message: {
        type: DataTypes.TEXT,

        allowNull: false,
      },

      is_read: {
        type: DataTypes.BOOLEAN,

        defaultValue: false,
      },
    },

    {
      sequelize,

      modelName: "Message",

      tableName: "Messages",

      timestamps: true,
    },
  );

  return Message;
};
