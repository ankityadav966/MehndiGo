"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CustomDesignRequest extends Model {
    static associate(models) {
      CustomDesignRequest.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      CustomDesignRequest.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist",
      });
      CustomDesignRequest.belongsTo(models.Service, {
        foreignKey: "service_id",
        as: "service",
      });
    }
  }

  CustomDesignRequest.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      occasion: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      preferred_style: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reference_images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      group_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      service_coverage: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "BOTH_HANDS",
      },
      budget_preference: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      preferred_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      preferred_time: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      landmark: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("PENDING", "ACCEPTED", "REJECTED", "CONVERTED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      estimated_price: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      artist_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CustomDesignRequest",
      tableName: "custom_design_requests",
      timestamps: true,
      underscored: true,
    }
  );

  return CustomDesignRequest;
};
