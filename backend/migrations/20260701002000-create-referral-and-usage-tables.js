"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create CouponUsages table
    await queryInterface.createTable("CouponUsages", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      coupon_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Coupons", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Bookings", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      used_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });

    // 2. Create ReferralCodes table
    await queryInterface.createTable("ReferralCodes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });

    // 3. Create ReferralCampaigns table
    await queryInterface.createTable("ReferralCampaigns", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      referrer_reward: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      referred_reward: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });

    // 4. Create ReferralHistories table
    await queryInterface.createTable("ReferralHistories", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      referrer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      referred_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      status: {
        type: Sequelize.ENUM("PENDING", "COMPLETED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING"
      },
      reward_amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      reward_status: {
        type: Sequelize.ENUM("PENDING", "CREDITED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING"
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ReferralHistories");
    await queryInterface.dropTable("ReferralCampaigns");
    await queryInterface.dropTable("ReferralCodes");
    await queryInterface.dropTable("CouponUsages");
  },
};
