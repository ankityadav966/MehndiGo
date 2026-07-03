'use strict';
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MessageMedia extends Model {
    static associate(models) {
      MessageMedia.belongsTo(models.Message, {
        foreignKey: "message_id",
        as: "message",
      });
    }
  }

  MessageMedia.init(
    {
      message_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      file_url: {
        type: DataTypes.STRING(2048),
        allowNull: false,
      },
      file_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      waveform: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MessageMedia",
      tableName: "MessageMedias",
      timestamps: true,
      underscored: true,
    }
  );

  return MessageMedia;
};
