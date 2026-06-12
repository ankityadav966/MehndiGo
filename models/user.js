"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasOne(models.ArtistProfile, {
        foreignKey: "user_id",
        as: "artistProfile",
      });

      User.hasMany(models.Otp, {
        foreignKey: "user_id",
        as: "otps",
      });
    }
  }

  User.init(
    {

      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      phone: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true,
      },

      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },

      role: {
        type: DataTypes.ENUM("USER", "ARTIST","ADMIN"),
        allowNull: false,
        defaultValue: "USER",
      },

      profile_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      gender: {
        type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"),
        allowNull: true,
      },

      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "Users",
      timestamps: true,
      underscored: true
    }
  );

  return User;
};