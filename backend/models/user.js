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

      User.hasMany(models.XpLog, {
        foreignKey: "user_id",
        as: "xpLogs"
      });

      User.hasMany(models.UserBadge, {
        foreignKey: "user_id",
        as: "badges"
      });

      User.hasMany(models.RewardClaim, {
        foreignKey: "user_id",
        as: "rewardClaims"
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
        allowNull: true,
        unique: true,
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

      is_verified: {
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
      current_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      current_xp: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lifetime_xp: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      ambassador_tier: {
        type: DataTypes.ENUM("BEGINNER", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "ELITE"),
        allowNull: false,
        defaultValue: "BEGINNER"
      },
      ambassador_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      device_uuid: {
        type: DataTypes.STRING,
        allowNull: true
      },
      boost_start_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      boost_expires_at: {
        type: DataTypes.DATE,
        allowNull: true
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