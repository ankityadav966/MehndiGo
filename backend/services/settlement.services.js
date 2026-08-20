"use strict";

const db = require("../models");
const AppError = require("../utils/errors/app.error");
const ledgerService = require("./ledger.services");

class SettlementService {
  /**
   * Process booking settlement upon OTP completion
   */
  async processBookingSettlement(bookingId, transaction = null) {
    const options = transaction ? { transaction } : {};

    // 1. Idempotency Check: Prevent duplicate settlement for already settled booking
    const existingSettlement = await db.Settlement.findOne({
      where: { booking_id: bookingId, status: "COMPLETED" },
      ...options
    }).catch(() => null);

    if (existingSettlement) {
      console.log(`[SettlementService] Booking #${bookingId} already settled. Skipping duplicate settlement.`);
      return existingSettlement;
    }

    const booking = await db.Booking.findByPk(bookingId, {
      include: [
        { model: db.ArtistProfile, as: "artist" },
        { model: db.Service, as: "service" }
      ],
      ...options
    });

    if (!booking) {
      throw new AppError("Booking not found for settlement", 404);
    }

    const artistId = booking.artist_id;
    const artistProfile = booking.artist;
    if (!artistProfile) {
      throw new AppError("Artist profile not found for booking settlement", 404);
    }
    const artistUserId = artistProfile.user_id;

    // Get system settings for Commission Rate and GST Rate
    const commissionRate = 0.10; // 10% Platform Commission
    const gstRate = 0.18; // 18% GST on Commission

    const grossAmount = Number(booking.final_amount || booking.total_price || 0);
    const commissionAmount = Math.round(grossAmount * commissionRate * 100) / 100;
    const gstAmount = Math.round(commissionAmount * gstRate * 100) / 100;
    const totalPlatformDeduction = commissionAmount + gstAmount;

    // Check payment method type
    const isFullOnline = booking.payment_method === "RAZORPAY" || booking.payment_method === "ONLINE" || booking.payment_status === "PAID";
    const isAdvanceCash = booking.payment_method === "CASH" || booking.payment_method === "ADVANCE_CASH" || booking.advance_paid > 0;

    // Get Artist Wallet
    let artistWallet = await db.Wallet.findOne({
      where: { user_id: artistUserId },
      ...options
    });
    if (!artistWallet) {
      artistWallet = await db.Wallet.create(
        { user_id: artistUserId, balance: 0, available_balance: 0 },
        options
      );
    }

    if (isFullOnline) {
      // 1. Escrow Release for Full Online Booking
      const netSettledAmount = grossAmount - totalPlatformDeduction;

      // Update Escrow record if exists
      const escrow = await db.EscrowRecord.findOne({
        where: { booking_id: bookingId, status: "HELD" },
        ...options
      });
      if (escrow) {
        await escrow.update({ status: "RELEASED" }, options);
      }

      // Credit Net Settled Amount to Artist Wallet
      const newAvailBalance = Number(artistWallet.available_balance || 0) + netSettledAmount;
      const newLifetime = Number(artistWallet.lifetime_earnings || 0) + netSettledAmount;
      const newToday = Number(artistWallet.today_earnings || 0) + netSettledAmount;

      await artistWallet.update(
        {
          balance: newAvailBalance,
          available_balance: newAvailBalance,
          lifetime_earnings: newLifetime,
          today_earnings: newToday
        },
        options
      );

      // Record Settlement
      const settlement = await db.Settlement.create(
        {
          artist_id: artistId,
          booking_id: bookingId,
          total_amount: grossAmount,
          commission_deducted: totalPlatformDeduction,
          settled_amount: netSettledAmount,
          status: "COMPLETED",
          settled_at: new Date()
        },
        options
      );

      // Immutable Ledger Entries
      await ledgerService.recordEntry({
        userId: artistUserId,
        walletId: artistWallet.id,
        bookingId: bookingId,
        entryType: "RELEASE",
        amount: netSettledAmount,
        balanceAfter: newAvailBalance,
        referenceId: `SETTLEMENT-${settlement.id}`,
        description: `Escrow release for completed booking #${booking.booking_code}`
      }, transaction);

      await ledgerService.recordEntry({
        userId: artistUserId,
        walletId: artistWallet.id,
        bookingId: bookingId,
        entryType: "COMMISSION",
        amount: commissionAmount,
        balanceAfter: newAvailBalance,
        referenceId: `COMMISSION-${bookingId}`,
        description: `Platform commission (10%) for booking #${booking.booking_code}`
      }, transaction);

      await ledgerService.recordEntry({
        userId: artistUserId,
        walletId: artistWallet.id,
        bookingId: bookingId,
        entryType: "GST",
        amount: gstAmount,
        balanceAfter: newAvailBalance,
        referenceId: `GST-${bookingId}`,
        description: `GST (18%) on platform commission for booking #${booking.booking_code}`
      }, transaction);

      return { type: "ONLINE_SETTLEMENT", settlement, netSettledAmount };

    } else {
      // 2. Outstanding Commission for Cash Booking (offset against any online advance already paid)
      const advancePaid = Number(booking.advance_paid || 0);
      const totalDue = Math.max(0, totalPlatformDeduction - advancePaid);
      const surplusAdvance = Math.max(0, advancePaid - totalPlatformDeduction);

      let outstandingRec = null;

      if (totalDue > 0) {
        outstandingRec = await db.OutstandingCommission.create(
          {
            artist_id: artistId,
            booking_id: bookingId,
            gross_amount: grossAmount,
            commission_amount: commissionAmount,
            gst_amount: gstAmount,
            total_due: totalDue,
            status: "PENDING"
          },
          options
        );

        // Update Artist Wallet Outstanding Commission Balance
        const newOutstanding = Number(artistWallet.outstanding_commission || 0) + totalDue;
        await artistWallet.update(
          {
            outstanding_commission: newOutstanding
          },
          options
        );
      }

      if (surplusAdvance > 0) {
        const newAvail = Number(artistWallet.available_balance || 0) + surplusAdvance;
        await artistWallet.update(
          {
            balance: newAvail,
            available_balance: newAvail
          },
          options
        );
      }

      // Immutable Ledger Entry for Cash Collection
      await ledgerService.recordEntry({
        userId: artistUserId,
        walletId: artistWallet.id,
        bookingId: bookingId,
        entryType: "CASH_COLLECTION",
        amount: grossAmount,
        balanceAfter: Number(artistWallet.available_balance || 0),
        referenceId: `CASH-${bookingId}`,
        description: `Cash collection by artist for booking #${booking.booking_code}`
      }, transaction);

      if (totalDue > 0) {
        await ledgerService.recordEntry({
          userId: artistUserId,
          walletId: artistWallet.id,
          bookingId: bookingId,
          entryType: "COMMISSION",
          amount: totalDue,
          balanceAfter: Number(artistWallet.available_balance || 0),
          referenceId: `OUTSTANDING-${outstandingRec?.id || bookingId}`,
          description: `Outstanding platform commission due for cash booking #${booking.booking_code}`
        }, transaction);
      }

      return { type: "CASH_SETTLEMENT", outstandingRec, totalDue, surplusAdvance };
    }
  }

  /**
   * Pay Artist Outstanding Commission Dues Online
   */
  async payOutstandingCommission(artistUserId, razorpayData) {
    const t = await db.sequelize.transaction();
    try {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: artistUserId }, transaction: t });
      if (!artist) throw new AppError("Artist profile not found", 404);

      const wallet = await db.Wallet.findOne({ where: { user_id: artistUserId }, lock: t.LOCK.UPDATE, transaction: t });
      if (!wallet) throw new AppError("Artist wallet not found", 404);

      const dueAmount = Number(wallet.outstanding_commission || 0);
      if (dueAmount <= 0) {
        await t.commit();
        return { message: "No outstanding commission due." };
      }

      // Mark all pending outstanding commission records as PAID
      await db.OutstandingCommission.update(
        {
          status: "PAID",
          razorpay_payment_id: razorpayData.razorpay_payment_id,
          paid_at: new Date()
        },
        {
          where: { artist_id: artist.id, status: "PENDING" },
          transaction: t
        }
      );

      // Reset Wallet Outstanding Commission
      await wallet.update(
        {
          outstanding_commission: 0
        },
        { transaction: t }
      );

      // Ledger Entry
      await ledgerService.recordEntry({
        userId: artistUserId,
        walletId: wallet.id,
        entryType: "DEBIT",
        amount: dueAmount,
        balanceAfter: Number(wallet.available_balance || 0),
        referenceId: razorpayData.razorpay_payment_id || `PAY-COMM-${Date.now()}`,
        description: `Online payment of outstanding platform commission dues`
      }, t);

      await t.commit();
      return { success: true, clearedAmount: dueAmount };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new SettlementService();
