const db = require("../models");
const AppError = require("../utils/errors/app.error");
const razorpayUtil = require("../utils/razorpay");
const crypto = require("crypto");

class PaymentService {
  async createSession(bookingId, userId, amount, paymentMethod = "ADVANCE_CASH") {
    let orderAmount = 0; // Amount in Rupees
    let note = '';
    const isRecharge = bookingId === 1 || bookingId === "1" || !bookingId;

    const user = await db.User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (isRecharge) {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new AppError("Valid amount in Rupees is required for wallet recharge", 400);
      }
      orderAmount = Math.round(Number(amount));
      note = `Wallet Recharge for User #${userId}`;
    } else {
      const booking = await db.Booking.findOne({
        where: { id: bookingId, user_id: userId }
      });
      if (!booking) {
        throw new AppError("Booking not found", 404);
      }
      const totalAmt = Number(booking.final_amount || booking.total_price || 1800);
      const advanceAmt = Math.round(totalAmt * 0.10);
      orderAmount = Math.round(advanceAmt);
      note = `Booking Advance Payment for Booking #${booking.booking_code}`;
    }

    if (orderAmount < 1) {
      throw new AppError("Minimum payable amount must be at least ₹1", 400);
    }

    // Convert Rupees to Paise for Razorpay API (e.g. ₹100 -> 10000 paise)
    const amountInPaise = orderAmount * 100;
    const receipt = isRecharge ? `rcpt_w_${userId}_${Date.now()}` : `rcpt_bk_${bookingId}_${Date.now()}`;

    // Create real Razorpay order
    const razorpayOrder = await razorpayUtil.createRazorpayOrder({
      amount: amountInPaise,
      currency: "INR",
      receipt: receipt,
      notes: {
        booking_id: isRecharge ? null : String(bookingId),
        user_id: String(userId),
        note: note
      }
    });

    console.log(`[RAZORPAY_ORDER_CREATE] Order ${razorpayOrder.order_id} created for ₹${orderAmount} (${amountInPaise} paise).`);

    // Log pending transaction record
    await db.Transaction.create({
      user_id: userId,
      booking_id: isRecharge ? null : bookingId,
      razorpay_order_id: razorpayOrder.order_id,
      cashfree_order_id: razorpayOrder.order_id,
      amount: orderAmount,
      status: "PENDING"
    });

    if (!isRecharge) {
      // Log payment record
      await db.Payment.create({
        booking_id: bookingId,
        transaction_id: razorpayOrder.order_id,
        razorpay_order_id: razorpayOrder.order_id,
        cashfree_order_id: razorpayOrder.order_id,
        payment_method: "ONLINE",
        amount: orderAmount,
        status: "PENDING",
        gateway: "RAZORPAY",
        currency: "INR"
      });
    }

    return {
      success: true,
      order_id: razorpayOrder.order_id,
      payment_session_id: razorpayOrder.order_id,
      amount: amountInPaise, // amount in paise for Razorpay SDK
      amount_in_rupees: orderAmount,
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID
    };
  }

  async verifyPaymentPublic(data) {
    const { razorpay_order_id, cashfree_order_id, order_id } = data;
    const targetOrderId = razorpay_order_id || cashfree_order_id || order_id;

    const tx = await db.Transaction.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { razorpay_order_id: targetOrderId },
          { cashfree_order_id: targetOrderId }
        ]
      }
    });

    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }
    return await this.verifyPayment(tx.user_id, data);
  }

  async verifyPayment(userId, data) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cashfree_order_id,
      payment_session_id,
      order_id,
      payment_id,
      signature
    } = data;

    const rOrderId = razorpay_order_id || cashfree_order_id || payment_session_id || order_id;
    const rPaymentId = razorpay_payment_id || payment_id;
    const rSignature = razorpay_signature || signature;

    if (!rOrderId) {
      throw new AppError("Missing Razorpay order_id parameter", 400);
    }

    const tx = await db.Transaction.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { razorpay_order_id: rOrderId },
          { cashfree_order_id: rOrderId }
        ]
      }
    });

    if (!tx) {
      throw new AppError(`Transaction for order ID ${rOrderId} not found`, 404);
    }

    // IDEMPOTENCY CHECK: If transaction already completed, return early without re-crediting or duplicate processing
    if (tx.status === "SUCCESS") {
      console.log(`[VERIFY_PAYMENT] Transaction ${rOrderId} is already SUCCESS. Returning early (Idempotent).`);
      return {
        success: true,
        message: "Payment already verified and processed.",
        already_processed: true,
        transaction: tx
      };
    }

    // Reject simulated or fake payment payloads
    if (!rPaymentId || !rSignature || String(rPaymentId).includes("sim") || String(rSignature).includes("simulated") || String(rSignature).includes("test")) {
      await tx.update({ status: "FAILED" });
      if (tx.booking_id) {
        await db.Payment.update({ status: "FAILED" }, {
          where: {
            [db.Sequelize.Op.or]: [
              { razorpay_order_id: rOrderId },
              { cashfree_order_id: rOrderId }
            ]
          }
        });
      }
      throw new AppError("Verification rejected: Fake or simulated payment signatures are strictly forbidden.", 400);
    }

    // Verify HMAC SHA256 Signature
    const isValidSignature = razorpayUtil.verifyRazorpaySignature({
      razorpay_order_id: rOrderId,
      razorpay_payment_id: rPaymentId,
      razorpay_signature: rSignature
    });

    if (!isValidSignature) {
      console.error(`[VERIFY_PAYMENT] Razorpay HMAC Signature Mismatch for order ${rOrderId}`);
      await tx.update({ status: "FAILED" });
      if (tx.booking_id) {
        await db.Payment.update({ status: "FAILED" }, {
          where: {
            [db.Sequelize.Op.or]: [
              { razorpay_order_id: rOrderId },
              { cashfree_order_id: rOrderId }
            ]
          }
        });
      }
      throw new AppError("Invalid Razorpay payment signature. Verification failed.", 400);
    }

    const verifiedPaymentId = rPaymentId;

    // Mark Transaction SUCCESS
    await tx.update({
      razorpay_payment_id: verifiedPaymentId,
      razorpay_signature: rSignature || null,
      cashfree_payment_id: verifiedPaymentId,
      status: "SUCCESS"
    });

    if (tx.booking_id) {
      const booking = await db.Booking.findByPk(tx.booking_id);
      if (booking) {
        const isAdvance = booking.payment_status === "PENDING";
        const isRemaining = booking.detailed_status === "WAITING_FOR_USER_PAYMENT";

        console.log(`[VERIFY_PAYMENT] Booking #${booking.booking_code} status BEFORE update: booking_status=${booking.booking_status}, payment_status=${booking.payment_status}, detailed_status=${booking.detailed_status}`);

        if (isAdvance) {
          const totalAmt = Number(booking.final_amount || booking.total_price || 1800);
          const advancePaid = Math.round(totalAmt * 0.10);
          const remaining = Math.max(0, totalAmt - advancePaid);
          const platformCommission = Math.round(totalAmt * 0.10);
          console.log(`[VERIFY_PAYMENT] Processing FIXED ₹500 ADVANCE payment of ₹${advancePaid} (Remaining: ₹${remaining}, Platform Commission: ₹${platformCommission}) for Booking #${booking.booking_code}`);
          
          await booking.update({
            payment_status: "PARTIAL",
            booking_status: "CONFIRMED",
            detailed_status: "CONFIRMED",
            advance_paid: advancePaid,
            remaining_amount: remaining
          });

          await db.BookingStatusHistory.create({
            booking_id: booking.id,
            status: "CONFIRMED",
            changed_by: userId,
            notes: `Advance payment of ₹${advancePaid} verified successfully via Razorpay. Booking confirmed.`
          });

          // Create Invoice record
          const invoiceNum = `INV-${Date.now()}`;
          await db.Invoice.create({
            booking_id: booking.id,
            invoice_number: invoiceNum,
            invoice_url: `/payment/receipt/${booking.id}`
          });

          // Credit 10% Platform Commission to Admin Wallet
          try {
            const adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
            if (adminUser) {
              const [adminWallet] = await db.Wallet.findOrCreate({
                where: { user_id: adminUser.id },
                defaults: { balance: 0 }
              });
              await adminWallet.increment("balance", { by: platformCommission });
              await db.WalletTransaction.create({
                wallet_id: adminWallet.id,
                booking_id: booking.id,
                transaction_type: "COMMISSION",
                amount: platformCommission,
                status: "SUCCESS",
                description: `Admin Platform Commission (10%) from booking #${booking.booking_code}`
              });
            }
          } catch (adminErr) {
            console.error("Error crediting Admin Wallet:", adminErr.message);
          }

          // Notify customer
          await db.Notification.create({
            user_id: booking.user_id,
            title: "Payment Received Successfully! 🎉",
            message: `Your advance payment of ₹${advancePaid} for booking #${booking.booking_code} was received.`,
            type: "SYSTEM"
          });

          // Notify artist
          try {
            const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
            if (artistProfile) {
              await db.Notification.create({
                user_id: artistProfile.user_id,
                title: "New Booking Confirmed 📅",
                message: `Mehndi booking request #${booking.booking_code} has been paid and confirmed.`,
                type: "SYSTEM"
              });
            }
          } catch (notifErr) {
            console.error("Error sending artist notification:", notifErr.message);
          }

        } else if (isRemaining) {
          const remainingPaid = booking.remaining_amount;
          console.log(`[VERIFY_PAYMENT] Processing 90% REMAINING payment of ₹${remainingPaid} for Booking #${booking.booking_code}`);

          await booking.update({
            payment_status: "PAID",
            booking_status: "COMPLETED",
            detailed_status: "COMPLETED",
            remaining_amount: 0,
            remaining_paid_at: new Date()
          });

          await db.BookingStatusHistory.create({
            booking_id: booking.id,
            status: "COMPLETED",
            changed_by: userId,
            notes: `Remaining payment of ₹${remainingPaid} verified successfully via Razorpay. Booking completed.`
          });

          // Credit remaining 90% directly to Artist Wallet
          try {
            const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
            if (artistProfile) {
              const [artistWallet] = await db.Wallet.findOrCreate({
                where: { user_id: artistProfile.user_id },
                defaults: { balance: 0 }
              });
              await artistWallet.increment("balance", { by: remainingPaid });
              
              const customerUser = await db.User.findByPk(booking.user_id);
              const customerName = customerUser ? customerUser.name : "Client";
              await db.WalletTransaction.create({
                wallet_id: artistWallet.id,
                booking_id: booking.id,
                transaction_type: "PAYMENT",
                amount: remainingPaid,
                status: "SUCCESS",
                description: `Remaining payment from ${customerName} (#${booking.booking_code})`
              });
            }
          } catch (artistErr) {
            console.error("Error crediting Artist Wallet:", artistErr.message);
          }

          // Notify customer
          await db.Notification.create({
            user_id: booking.user_id,
            title: "Payment Completed Successfully! 🎉",
            message: `Your remaining payment of ₹${remainingPaid} for booking #${booking.booking_code} was received. Booking is now complete!`,
            type: "SYSTEM"
          });
        }

        // Always update Payment record
        await db.Payment.update(
          {
            status: "SUCCESS",
            razorpay_payment_id: verifiedPaymentId,
            razorpay_signature: rSignature || null,
            cashfree_payment_id: verifiedPaymentId,
            paid_at: new Date()
          },
          {
            where: {
              [db.Sequelize.Op.or]: [
                { razorpay_order_id: rOrderId },
                { cashfree_order_id: rOrderId }
              ]
            }
          }
        );
      }
    } else {
      // Wallet Recharge Flow: Atomically credit user's wallet
      const [wallet] = await db.Wallet.findOrCreate({
        where: { user_id: tx.user_id },
        defaults: { balance: 0 }
      });
      await wallet.increment("balance", { by: tx.amount });

      await db.WalletTransaction.create({
        wallet_id: wallet.id,
        transaction_type: "RECHARGE",
        amount: tx.amount,
        status: "SUCCESS",
        description: `Wallet recharge via Razorpay (Order: ${rOrderId})`,
        razorpay_order_id: rOrderId,
        razorpay_payment_id: verifiedPaymentId,
        razorpay_signature: rSignature || null
      });
      console.log(`[Wallet Recharge Success] Credited ₹${tx.amount} to user ID ${tx.user_id} wallet.`);
    }

    return {
      success: true,
      message: "Payment verified successfully",
      order_id: rOrderId,
      payment_id: verifiedPaymentId
    };
  }

  async payWithWallet(bookingId, userId) {
    const booking = await db.Booking.findOne({
      where: { id: bookingId, user_id: userId }
    });
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const wallet = await db.Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    const isAdvance = booking.payment_status === "PENDING";
    const isRemaining = booking.detailed_status === "WAITING_FOR_USER_PAYMENT";
    const payableAmount = isAdvance
      ? Math.round(booking.final_amount * 0.10)
      : isRemaining
      ? booking.remaining_amount
      : booking.final_amount;

    if (wallet.balance < payableAmount) {
      throw new AppError("Insufficient wallet balance", 400);
    }

    // Deduct from Wallet
    await wallet.decrement("balance", { by: payableAmount });

    // Record Wallet Transaction
    await db.WalletTransaction.create({
      wallet_id: wallet.id,
      booking_id: booking.id,
      transaction_type: "PAYMENT",
      amount: payableAmount,
      status: "SUCCESS",
      description: `Payment for booking #${booking.booking_code} using wallet balance`
    });

    if (isAdvance) {
      const remaining = Math.max(0, booking.final_amount - payableAmount);
      await booking.update({
        payment_status: "PARTIAL",
        booking_status: "CONFIRMED",
        detailed_status: "CONFIRMED",
        advance_paid: payableAmount,
        remaining_amount: remaining
      });
    } else if (isRemaining) {
      await booking.update({
        payment_status: "PAID",
        booking_status: "COMPLETED",
        detailed_status: "COMPLETED",
        remaining_amount: 0,
        remaining_paid_at: new Date()
      });
    }

    return {
      success: true,
      message: "Payment completed using MehndiGo wallet",
      booking_code: booking.booking_code,
      amount_paid: payableAmount
    };
  }

  async retryPayment(bookingId, userId) {
    return await this.createSession(bookingId, userId, null);
  }

  async getPaymentHistory(userId, role) {
    if (role === "ADMIN") {
      return await db.Payment.findAll({
        include: [{ model: db.Booking, as: "booking" }],
        order: [["createdAt", "DESC"]]
      });
    }
    const bookings = await db.Booking.findAll({
      where: { user_id: userId },
      attributes: ["id"]
    });
    const bookingIds = bookings.map(b => b.id);
    return await db.Payment.findAll({
      where: { booking_id: bookingIds },
      include: [{ model: db.Booking, as: "booking" }],
      order: [["createdAt", "DESC"]]
    });
  }

  async getPaymentById(paymentId) {
    const payment = await db.Payment.findByPk(paymentId, {
      include: [{ model: db.Booking, as: "booking" }]
    });
    if (!payment) {
      throw new AppError("Payment record not found", 404);
    }
    return payment;
  }

  async initiateRefund(bookingId, reason, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }
    const refundAmount = booking.advance_paid || booking.final_amount;
    const refund = await db.Refund.create({
      booking_id: bookingId,
      amount: refundAmount,
      reason: reason || "User requested cancellation",
      status: "COMPLETED"
    });
    await booking.update({ payment_status: "REFUNDED", booking_status: "CANCELLED" });
    return refund;
  }

  async getRefundHistory(userId, role) {
    return await db.Refund.findAll({ order: [["createdAt", "DESC"]] });
  }

  async getInvoiceByBooking(bookingId) {
    const invoice = await db.Invoice.findOne({ where: { booking_id: bookingId } });
    if (!invoice) {
      throw new AppError("Invoice not found for this booking", 404);
    }
    return invoice;
  }
}

module.exports = new PaymentService();
