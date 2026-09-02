"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Expand ReferralHistories with new referral system fields
    const rhCols = await queryInterface.describeTable("ReferralHistories");

    if (!rhCols.referral_type) {
      await queryInterface.addColumn("ReferralHistories", "referral_type", {
        type: Sequelize.ENUM("CUSTOMER_TO_CUSTOMER", "CUSTOMER_TO_ARTIST", "ARTIST_TO_ARTIST"),
        allowNull: false,
        defaultValue: "CUSTOMER_TO_CUSTOMER"
      });
    }
    if (!rhCols.referral_code) {
      await queryInterface.addColumn("ReferralHistories", "referral_code", {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    if (!rhCols.qualified_at) {
      await queryInterface.addColumn("ReferralHistories", "qualified_at", {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    if (!rhCols.fraud_flag) {
      await queryInterface.addColumn("ReferralHistories", "fraud_flag", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    // Replace old status ENUM with new lifecycle
    // Note: just add new column referral_status alongside old status column
    if (!rhCols.referral_status) {
      await queryInterface.addColumn("ReferralHistories", "referral_status", {
        type: Sequelize.ENUM("PENDING", "REGISTERED", "QUALIFIED"),
        allowNull: false,
        defaultValue: "REGISTERED"
      });
    }

    // 2. Create ReferralRewards table for per-user reward tracking
    await queryInterface.createTable("ReferralRewards", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      reward_type: {
        type: Sequelize.ENUM(
          "CUSTOMER_50_PERCENT_OFFER",  // 50 c2c refs + 3 bookings
          "CUSTOMER_70_PERCENT_OFFER",  // 10 c2a refs
          "ARTIST_FEATURED_PROFILE"     // 20 a2a refs
        ),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM("LOCKED", "UNLOCKED", "REDEEMED"),
        allowNull: false,
        defaultValue: "LOCKED"
      },
      unlocked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      redeemed_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    // Unique constraint: one row per user per reward_type
    await queryInterface.addIndex("ReferralRewards", ["user_id", "reward_type"], {
      unique: true,
      name: "referral_rewards_user_type_unique"
    });

    // 3. Seed default SystemSettings thresholds (skip if already exist)
    const defaults = [
      { key: "REFERRAL_C2C_COUNT",     value: "50" },
      { key: "REFERRAL_C2C_BOOKINGS",  value: "3" },
      { key: "REFERRAL_C2A_COUNT",     value: "10" },
      { key: "REFERRAL_A2A_COUNT",     value: "20" },
    ];
    for (const row of defaults) {
      await queryInterface.sequelize.query(
        `INSERT INTO "SystemSettings" (key, value, created_at, updated_at)
         VALUES (:key, :value, NOW(), NOW())
         ON CONFLICT (key) DO NOTHING`,
        { replacements: row }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("ReferralRewards");

    const rhCols = await queryInterface.describeTable("ReferralHistories");
    if (rhCols.referral_status) await queryInterface.removeColumn("ReferralHistories", "referral_status");
    if (rhCols.fraud_flag)      await queryInterface.removeColumn("ReferralHistories", "fraud_flag");
    if (rhCols.qualified_at)    await queryInterface.removeColumn("ReferralHistories", "qualified_at");
    if (rhCols.referral_code)   await queryInterface.removeColumn("ReferralHistories", "referral_code");
    if (rhCols.referral_type)   await queryInterface.removeColumn("ReferralHistories", "referral_type");
  }
};
