"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create Wallets Table
    await queryInterface.createTable("Wallets", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      balance: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    // 2. Create WalletTransactions Table
    await queryInterface.createTable("WalletTransactions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      wallet_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Wallets",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Bookings",
          key: "id"
        },
        onDelete: "SET NULL"
      },
      transaction_type: {
        type: Sequelize.ENUM(
          "RECHARGE",
          "PAYMENT",
          "REFUND",
          "CASHBACK",
          "REFERRAL",
          "SETTLEMENT",
          "COMMISSION",
          "WITHDRAWAL",
          "MANUAL_CREDIT",
          "MANUAL_DEBIT"
        ),
        allowNull: false
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "PENDING"
      },
      description: {
        type: Sequelize.STRING,
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

    // 3. Create WithdrawRequests Table
    await queryInterface.createTable("WithdrawRequests", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      artist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "artist_profiles",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "PENDING" // PENDING, APPROVED, REJECTED, CANCELLED
      },
      rejection_reason: {
        type: Sequelize.STRING,
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

    // 4. Create BankAccounts Table
    await queryInterface.createTable("BankAccounts", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      account_holder_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      account_number: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ifsc_code: {
        type: Sequelize.STRING,
        allowNull: false
      },
      bank_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      upi_id: {
        type: Sequelize.STRING,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("BankAccounts");
    await queryInterface.dropTable("WithdrawRequests");
    await queryInterface.dropTable("WalletTransactions");
    await queryInterface.dropTable("Wallets");
  }
};
