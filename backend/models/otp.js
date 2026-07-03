"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Otp extends Model {
    static associate(models) {
      Otp.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  Otp.init(
    {
      // id: {
      //   type: DataTypes.INTEGER,
      //   autoIncrement: true,
      //   primaryKey: true,
      // },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      phone: {
        type: DataTypes.STRING(15),
        allowNull: false,
      },

      otp: {
        type: DataTypes.STRING(6),
        allowNull: false,
      },

      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Otp",
      tableName: "Otps",
      timestamps: true,
      underscored: true
    }
  );

  return Otp;
};