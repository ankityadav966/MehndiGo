"use strict";

module.exports = {
  async up(queryInterface) {
    // 1. Index foreign keys in Bookings table
    await queryInterface.addIndex("Bookings", ["user_id"], {
      name: "bookings_user_id_idx"
    });
    await queryInterface.addIndex("Bookings", ["artist_id"], {
      name: "bookings_artist_id_idx"
    });
    await queryInterface.addIndex("Bookings", ["slot_id"], {
      name: "bookings_slot_id_idx"
    });

    // 2. Index foreign key in AvailabilitySlots table
    await queryInterface.addIndex("AvailabilitySlots", ["artist_id"], {
      name: "availability_slots_artist_id_idx"
    });

    // 3. Index foreign key in Payments table
    await queryInterface.addIndex("Payments", ["booking_id"], {
      name: "payments_booking_id_idx"
    });

    // 4. Index foreign key in WalletTransactions table
    await queryInterface.addIndex("WalletTransactions", ["wallet_id"], {
      name: "wallet_transactions_wallet_id_idx"
    });

    // 5. Index foreign key in Reviews table
    await queryInterface.addIndex("Reviews", ["artist_id"], {
      name: "reviews_artist_id_idx"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Reviews", "reviews_artist_id_idx");
    await queryInterface.removeIndex("WalletTransactions", "wallet_transactions_wallet_id_idx");
    await queryInterface.removeIndex("Payments", "payments_booking_id_idx");
    await queryInterface.removeIndex("AvailabilitySlots", "availability_slots_artist_id_idx");
    await queryInterface.removeIndex("Bookings", "bookings_slot_id_idx");
    await queryInterface.removeIndex("Bookings", "bookings_artist_id_idx");
    await queryInterface.removeIndex("Bookings", "bookings_user_id_idx");
  }
};
