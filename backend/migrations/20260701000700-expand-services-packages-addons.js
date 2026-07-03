"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add extra columns to Services table
    await queryInterface.addColumn("Services", "offer_price", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn("Services", "travel_charges", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn("Services", "minimum_booking_amount", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn("Services", "advance_payment_percentage", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn("Services", "tags", {
      type: Sequelize.STRING,
      allowNull: true
    });

    // 2. Create ServicePackages table
    await queryInterface.createTable("ServicePackages", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      service_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Services",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      package_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      package_price: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      included_designs: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60
      },
      number_of_hands: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      number_of_feet: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      home_visit: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      touch_up_included: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      aftercare_included: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    // 3. Create ServiceAddons table
    await queryInterface.createTable("ServiceAddons", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      service_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Services",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      addon_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      addon_price: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ServiceAddons");
    await queryInterface.dropTable("ServicePackages");
    await queryInterface.removeColumn("Services", "offer_price");
    await queryInterface.removeColumn("Services", "travel_charges");
    await queryInterface.removeColumn("Services", "minimum_booking_amount");
    await queryInterface.removeColumn("Services", "advance_payment_percentage");
    await queryInterface.removeColumn("Services", "tags");
  }
};
