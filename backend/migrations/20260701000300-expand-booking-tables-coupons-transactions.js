"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add extra columns to Bookings table
    await queryInterface.addColumn("Bookings", "detailed_status", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "PENDING"
    });
    await queryInterface.addColumn("Bookings", "travel_charges", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Bookings", "offer_price", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Bookings", "coupon_discount", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Bookings", "platform_fee", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Bookings", "gst", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Bookings", "final_amount", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Bookings", "coupon_code", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Bookings", "reschedule_date", {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn("Bookings", "reschedule_time", {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Bookings", "latitude", {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true
    });
    await queryInterface.addColumn("Bookings", "longitude", {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true
    });
    await queryInterface.addColumn("Bookings", "landmark", {
      type: Sequelize.STRING,
      allowNull: true
    });

    // 2. Create BookingStatusHistories table
    await queryInterface.createTable("BookingStatusHistories", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Bookings",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 3. Create Coupons table
    await queryInterface.createTable("Coupons", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      discount_percentage: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      max_discount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      min_booking_value: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 4. Create Transactions table
    await queryInterface.createTable("Transactions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Bookings",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      razorpay_order_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      razorpay_payment_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      razorpay_signature: {
        type: Sequelize.STRING,
        allowNull: true
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "PENDING" // PENDING, SUCCESS, FAILED
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 5. Create Invoices table
    await queryInterface.createTable("Invoices", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Bookings",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      invoice_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      invoice_url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Invoices");
    await queryInterface.dropTable("Transactions");
    await queryInterface.dropTable("Coupons");
    await queryInterface.dropTable("BookingStatusHistories");

    await queryInterface.removeColumn("Bookings", "detailed_status");
    await queryInterface.removeColumn("Bookings", "travel_charges");
    await queryInterface.removeColumn("Bookings", "offer_price");
    await queryInterface.removeColumn("Bookings", "coupon_discount");
    await queryInterface.removeColumn("Bookings", "platform_fee");
    await queryInterface.removeColumn("Bookings", "gst");
    await queryInterface.removeColumn("Bookings", "final_amount");
    await queryInterface.removeColumn("Bookings", "coupon_code");
    await queryInterface.removeColumn("Bookings", "reschedule_date");
    await queryInterface.removeColumn("Bookings", "reschedule_time");
    await queryInterface.removeColumn("Bookings", "latitude");
    await queryInterface.removeColumn("Bookings", "longitude");
    await queryInterface.removeColumn("Bookings", "landmark");
  }
};
