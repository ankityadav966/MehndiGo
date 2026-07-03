"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class WithdrawRequest extends Model {
    static associate(models) {
      WithdrawRequest.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist"
      });
    }
  }

  WithdrawRequest.init(
    {
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PENDING"
      },
      rejection_reason: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "WithdrawRequest",
      tableName: "WithdrawRequests",
      timestamps: true,
      underscored: true
    }
  );

  return WithdrawRequest;
};
