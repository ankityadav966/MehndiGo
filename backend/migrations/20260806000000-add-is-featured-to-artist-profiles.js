"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("artist_profiles", "is_featured", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }).catch(() => {});
    await queryInterface.addColumn("artist_profiles", "featured_priority", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    }).catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("artist_profiles", "is_featured").catch(() => {});
    await queryInterface.removeColumn("artist_profiles", "featured_priority").catch(() => {});
  }
};
