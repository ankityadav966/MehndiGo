"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. ReferralCampaigns modifications
    await queryInterface.addColumn("ReferralCampaigns", "artist_boost_days", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 7
    });
    await queryInterface.addColumn("ReferralCampaigns", "welcome_boost_days", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 3
    });
    await queryInterface.addColumn("ReferralCampaigns", "customer_benefit", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Priority Support & Exclusive Offers"
    });

    // 2. ReferralHistories modifications
    await queryInterface.addColumn("ReferralHistories", "boost_days_awarded", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("ReferralHistories", "customer_benefit_awarded", {
      type: Sequelize.STRING,
      allowNull: true
    });

    // 3. Users modifications
    await queryInterface.addColumn("Users", "boost_start_at", {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn("Users", "boost_expires_at", {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("ReferralCampaigns", "artist_boost_days");
    await queryInterface.removeColumn("ReferralCampaigns", "welcome_boost_days");
    await queryInterface.removeColumn("ReferralCampaigns", "customer_benefit");

    await queryInterface.removeColumn("ReferralHistories", "boost_days_awarded");
    await queryInterface.removeColumn("ReferralHistories", "customer_benefit_awarded");

    await queryInterface.removeColumn("Users", "boost_start_at");
    await queryInterface.removeColumn("Users", "boost_expires_at");
  }
};
