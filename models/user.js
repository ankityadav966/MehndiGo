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

      User.hasOne(models.Wallet, {
        foreignKey: "user_id",
        as: "wallet"
      });

      User.hasOne(models.BankAccount, {
        foreignKey: "user_id",
        as: "bankAccount"
      });

      User.hasMany(models.Address, {
        foreignKey: "user_id",
        as: "addresses"
      });
    }
  }

  User.init(
    {

      fullName: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },

      password: {
        type: DataTypes.STRING,
        allowNull: true,
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

      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      state: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      pincode: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      isEmailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      hide_last_seen: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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