const db = require("../models");
const AppError = require("../utils/errors/app.error");
const razorpay = require("../utils/razorpay");
const crypto = require("crypto");

class PaymentService {
  async createSession(bookingId, userId, amount) {
    let orderAmount = 0;
    let note = '';
    const isRecharge = bookingId === 1 || bookingId === "1" || !bookingId;

    const user = await db.User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const orderId = isRecharge 
      ? `recharge_${userId}_${Date.now()}` 
      : `booking_${bookingId}_${Date.now()}`;

    if (isRecharge) {
      if (!amount) {
        throw new AppError("Amount is required for wallet recharge", 400);
      }
      orderAmount = Number(amount);
      note = `Wallet Recharge for User #${userId}`;
    } else {
      const booking = await db.Booking.findOne({
        where: { id: bookingId, user_id: userId }
      });
      if (!booking) {
        throw new AppError("Booking not found", 404);
      }
      
      if (booking.booking_status === "PENDING" && booking.payment_status === "PENDING") {
        orderAmount = Math.round(booking.final_amount * 0.10);
        note = `Advance Payment (10%) for Booking #${booking.booking_code}`;
      } else if (booking.detailed_status === "WAITING_FOR_USER_PAYMENT") {
        orderAmount = booking.remaining_amount;
        note = `Remaining Payment (90%) for Booking #${booking.booking_code}`;
      } else {
        orderAmount = booking.final_amount;
        note = `Payment for Booking #${booking.booking_code}`;
      }
    }

    let rzpOrder;
    try {
      rzpOrder = await razorpay.createRazorpayOrder({
        customerId: userId,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        orderId: orderId,
        amount: orderAmount,
        note: note
      });
      console.log("[RAZORPAY_ORDER_CREATE] Succeeded. Response ID:", rzpOrder.id);
    } catch (err) {
      console.log("Razorpay SDK order creation failed:", err.message);
      throw new AppError(err.message || "Failed to create Razorpay order", 400);
    }

    // Always log transaction record for security lookup
    await db.Transaction.create({
      user_id: userId,
      booking_id: isRecharge ? null : bookingId,
      razorpay_order_id: rzpOrder.id,
      amount: orderAmount,
      status: "PENDING"
    });

    if (!isRecharge) {
      // Create payment log
      await db.Payment.create({
        booking_id: bookingId,
        transaction_id: rzpOrder.id,
        payment_method: "ONLINE",
        amount: orderAmount,
        status: "PENDING",
        razorpay_order_id: rzpOrder.id,
        gateway: "RAZORPAY",
        currency: "INR"
      });
    }

    return {
      order_id: rzpOrder.id,
      amount: orderAmount
    };
  }

  async verifyPaymentPublic(data) {
    const { razorpay_order_id } = data;
    const tx = await db.Transaction.findOne({
      where: { razorpay_order_id }
    });
    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }
    return await this.verifyPayment(tx.user_id, data);
  }

  async verifyPayment(userId, data) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    const tx = await db.Transaction.findOne({
      where: { razorpay_order_id }
    });
    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }

    if (tx.status === "SUCCESS") {
      console.log(`[VERIFY_PAYMENT] Transaction ${razorpay_order_id} is already SUCCESS. Returning early.`);
      return tx;
    }

    // Verify signature
    const isValid = razorpay.verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      await tx.update({ status: "FAILED" });
      if (tx.booking_id) {
        await db.Payment.update({ status: "FAILED" }, { where: { razorpay_order_id } });
        await db.Booking.update({ payment_status: "FAILED" }, { where: { id: tx.booking_id } });
      }
      throw new AppError("Invalid payment signature", 400);
    }

    // Success transaction
    await tx.update({
      razorpay_payment_id: razorpay_payment_id,
      razorpay_signature: razorpay_signature,
      status: "SUCCESS"
    });

    if (tx.booking_id) {
      const booking = await db.Booking.findByPk(tx.booking_id);
      if (booking) {
        const isAdvance = booking.payment_status === "PENDING";
        const isRemaining = booking.detailed_status === "WAITING_FOR_USER_PAYMENT";

        console.log(`[VERIFY_PAYMENT] Booking #${booking.booking_code} status BEFORE update: booking_status=${booking.booking_status}, payment_status=${booking.payment_status}, detailed_status=${booking.detailed_status}`);

        if (isAdvance) {
          const advancePaid = Math.round(booking.final_amount * 0.10);
          console.log(`[VERIFY_PAYMENT] Processing 10% ADVANCE payment of ₹${advancePaid} for Booking #${booking.booking_code}`);
          
          await booking.update({
            payment_status: "PARTIAL",
            booking_status: "CONFIRMED",
            detailed_status: "CONFIRMED",
            advance_paid: advancePaid
          });

          await db.BookingStatusHistory.create({
            booking_id: booking.id,
            status: "CONFIRMED",
            changed_by: userId,
            notes: `Advance payment of ₹${advancePaid} verified successfully. Booking confirmed.`
          });

          // Create Invoice record
          const invoiceNum = `INV-${Date.now()}`;
          await db.Invoice.create({
            booking_id: booking.id,
            invoice_number: invoiceNum,
            invoice_url: `/payment/receipt/${booking.id}`
          });

          // Credit 10% to Admin Wallet
          try {
            const adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
            if (adminUser) {
              const [adminWallet] = await db.Wallet.findOrCreate({
                where: { user_id: adminUser.id },
                defaults: { balance: 0 }
              });
              await adminWallet.increment("balance", { by: advancePaid });
              await db.WalletTransaction.create({
                wallet_id: adminWallet.id,
                booking_id: booking.id,
                transaction_type: "COMMISSION",
                amount: advancePaid,
                status: "SUCCESS",
                description: `Admin Commission from booking #${booking.booking_code}`
              });
            }
          } catch (adminErr) {
            console.error("Error crediting Admin Wallet:", adminErr.message);
          }

          // Notify customer & artist
          await db.Notification.create({
            user_id: booking.user_id,
            title: "Payment Received Successfully! 🎉",
            message: `Your advance payment of ₹${advancePaid} for booking #${booking.booking_code} was received.`,
            type: "SYSTEM"
          });
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
          } catch (notifErr) {}

        } else if (isRemaining) {
          const remainingPaid = booking.remaining_amount;
          console.log(`[VERIFY_PAYMENT] Processing 90% REMAINING payment of ₹${remainingPaid} for Booking #${booking.booking_code}`);

          await booking.update({
            payment_status: "PAID",
            booking_status: "COMPLETED",
            detailed_status: "COMPLETED",
            remaining_paid_at: new Date()
          });

          await db.BookingStatusHistory.create({
            booking_id: booking.id,
            status: "COMPLETED",
            changed_by: userId,
            notes: `Remaining payment of ₹${remainingPaid} verified successfully. Booking completed.`
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

              // Notify artist
              await db.Notification.create({
                user_id: artistProfile.user_id,
                title: "Remaining Payment Received! 💰",
                message: `You received ₹${remainingPaid} for completed booking #${booking.booking_code}.`,
                type: "SYSTEM"
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
            razorpay_payment_id: razorpay_payment_id,
            razorpay_signature: razorpay_signature,
            paid_at: new Date()
          },
          { where: { razorpay_order_id } }
        );
      }
    } else {
      // Wallet Recharge Flow
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
        description: `Wallet recharge via Razorpay (Order: ${tx.razorpay_order_id})`
      });
      console.log(`[Recharge Success] Credited ₹${tx.amount} to user ID ${tx.user_id} wallet`);
    }

    return tx;
  }

  async handleWebhook(rawBody, signature, timestamp) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");
        
      if (expectedSignature !== signature) {
        console.error("Invalid Razorpay webhook signature");
        return { status: "INVALID_SIGNATURE" };
      }
    }

    try {
      const payload = JSON.parse(rawBody);
      const event = payload.event;
      console.log(`Razorpay Webhook Event Received: ${event}`);

      if (event === "payment.captured" || event === "order.paid") {
        const orderId = payload.payload.payment.entity.order_id;
        const paymentId = payload.payload.payment.entity.id;

        const tx = await db.Transaction.findOne({ where: { razorpay_order_id: orderId } });
        if (tx && tx.status !== "SUCCESS") {
          // We can fallback to verifyPayment logic but it requires user_id. 
          // So we just update status and let verifyPayment handle the heavy lifting when user opens app.
          await tx.update({ status: "SUCCESS", razorpay_payment_id: paymentId });
          await db.Payment.update({ status: "SUCCESS", razorpay_payment_id: paymentId, paid_at: new Date() }, { where: { razorpay_order_id: orderId } });
        }
      }
    } catch (parseErr) {
      console.error("Error parsing webhook:", parseErr.message);
    }
    return { status: "OK" };
  }

  async getPaymentHistory(userId, role) {
    let where = {};
    if (role === "USER" || role === "CUSTOMER") {
      where.user_id = userId;
    } else if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (!artist) return [];
      const bookings = await db.Booking.findAll({ where: { artist_id: artist.id }, attributes: ["id"] });
      const bookingIds = bookings.map((b) => b.id);
      where = { booking_id: { [db.Sequelize.Op.in]: bookingIds } };
    }

    return await db.Transaction.findAll({
      where,
      include: [{
        model: db.Booking,
        as: "booking",
        attributes: ["id", "booking_code", "booking_status", "detailed_status"]
      }],
      order: [["createdAt", "DESC"]]
    });
  }

  async getPaymentById(paymentId) {
    const tx = await db.Transaction.findByPk(paymentId, {
      include: [{
        model: db.Booking,
        as: "booking",
        include: [
          { model: db.User, as: "user", attributes: ["name", "phone"] },
          { model: db.Service, as: "service", attributes: ["specialization_name"] }
        ]
      }]
    });
    if (!tx) throw new AppError("Payment transaction not found", 404);
    return tx;
  }

  async initiateRefund(bookingId, reason, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) throw new AppError("Booking not found", 404);

    const payment = await db.Payment.findOne({
      where: { booking_id: bookingId, status: "SUCCESS" }
    });

    const refundAmount = booking.final_amount;
    let refundId = `ref_mock_${Math.floor(100000 + Math.random() * 900000)}`;

    if (payment && payment.razorpay_payment_id && !payment.razorpay_payment_id.startsWith("wallet_pay_")) {
      try {
        const rzpRefund = await razorpay.initiateRazorpayRefund(
          payment.razorpay_payment_id,
          refundAmount,
          reason || "Booking Cancellation Refund"
        );
        refundId = rzpRefund.id || refundId;
      } catch (err) {
        console.log("Razorpay SDK refund error:", err.message);
      }
    }

    const refundRecord = await db.Refund.create({
      booking_id: bookingId,
      payment_id: payment ? payment.id : null,
      razorpay_refund_id: refundId,
      amount: refundAmount,
      status: "SUCCESS",
      reason: reason || "Cancelled by user"
    });

    await booking.update({
      payment_status: "FAILED",
      detailed_status: "REFUNDED",
      booking_status: "CANCELLED",
      cancel_reason: reason || "Cancelled"
    });

    await db.BookingStatusHistory.create({
      booking_id: bookingId,
      status: "CANCELLED",
      changed_by: userId,
      notes: `Refund initiated successfully. Booking Cancelled: ${reason}`
    });

    // Debit the artist's wallet if they were credited
    try {
      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        await db.sequelize.transaction(async (t) => {
          const artistWallet = await db.Wallet.findOne({ 
            where: { user_id: artistProfile.user_id },
            lock: t.LOCK.UPDATE,
            transaction: t
          });
          if (artistWallet) {
            const artistTx = await db.WalletTransaction.findOne({
              where: {
                wallet_id: artistWallet.id,
                booking_id: bookingId,
                transaction_type: "PAYMENT",
                status: "SUCCESS"
              },
              transaction: t
            });
            if (artistTx) {
              if (artistWallet.balance < artistTx.amount) {
                 throw new AppError("Artist does not have enough wallet balance.", 400);
              }
              await artistWallet.update({ balance: artistWallet.balance - artistTx.amount }, { transaction: t });
              await db.WalletTransaction.create({
                wallet_id: artistWallet.id,
                booking_id: bookingId,
                transaction_type: "WITHDRAWAL",
                amount: artistTx.amount,
                status: "SUCCESS",
                description: `Deduction for refunded booking #${booking.booking_code}`
              }, { transaction: t });
            }
          }
        });
      }
    } catch (debitErr) {
      console.error("Error debiting artist wallet:", debitErr.message);
    }
    return refundRecord;
  }

  async getRefundHistory(userId, role) {
    let where = {};
    if (role === "USER" || role === "CUSTOMER") {
      const bookings = await db.Booking.findAll({ where: { user_id: userId }, attributes: ["id"] });
      where = { booking_id: { [db.Sequelize.Op.in]: bookings.map(b => b.id) } };
    } else if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (!artist) return [];
      const bookings = await db.Booking.findAll({ where: { artist_id: artist.id }, attributes: ["id"] });
      where = { booking_id: { [db.Sequelize.Op.in]: bookings.map(b => b.id) } };
    }
    return await db.Refund.findAll({
      where,
      include: [{ model: db.Booking, as: "booking", attributes: ["id", "booking_code"] }],
      order: [["createdAt", "DESC"]]
    });
  }

  async getInvoiceByBooking(bookingId) {
    const invoice = await db.Invoice.findOne({
      where: { booking_id: bookingId },
      include: [{
        model: db.Booking,
        as: "booking",
        include: [
          { model: db.User, as: "user", attributes: ["name", "phone", "email"] },
          { model: db.Service, as: "service", attributes: ["specialization_name"] }
        ]
      }]
    });
    if (!invoice) throw new AppError("Invoice not found for this booking", 404);
    return invoice;
  }

  async retryPayment(bookingId, userId) {
    return await this.createSession(bookingId, userId);
  }

  async payWithWallet(bookingId, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) throw new AppError("Booking not found", 404);

    let payableAmount = 0;
    if (booking.booking_status === "PENDING" && booking.payment_status === "PENDING") {
      payableAmount = Math.round(booking.final_amount * 0.10);
    } else if (booking.detailed_status === "WAITING_FOR_USER_PAYMENT") {
      payableAmount = booking.remaining_amount;
    } else {
      payableAmount = booking.final_amount;
    }

    const t = await db.sequelize.transaction();
    try {
      let wallet = await db.Wallet.findOne({ 
        where: { user_id: userId },
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      if (!wallet) {
        wallet = await db.Wallet.create({ user_id: userId, balance: 0 }, { transaction: t });
      }

      if (wallet.balance < payableAmount) {
        throw new AppError("Insufficient wallet balance. Please add money to your wallet and try again.", 400);
      }

      const newBalance = wallet.balance - payableAmount;
      await wallet.update({ balance: newBalance }, { transaction: t });

      await db.WalletTransaction.create({
        wallet_id: wallet.id,
        transaction_type: "PAYMENT",
        amount: payableAmount,
        status: "SUCCESS",
        booking_id: booking.id,
        description: `Deducted for booking #${booking.booking_code} (Wallet Checkout)`
      }, { transaction: t });

      await db.Transaction.create({
        user_id: userId,
        booking_id: booking.id,
        amount: payableAmount,
        status: "SUCCESS",
        razorpay_order_id: `wallet_mock_${Date.now()}`,
        razorpay_payment_id: `wallet_pay_${Date.now()}`
      }, { transaction: t });

      if (booking.booking_status === "PENDING" && booking.payment_status === "PENDING") {
        await booking.update({
          payment_status: "PARTIAL",
          booking_status: "CONFIRMED",
          detailed_status: "CONFIRMED",
          advance_paid: payableAmount
        }, { transaction: t });

        let adminWallet = await db.Wallet.findOne({ 
          where: { user_id: 1 },
          lock: t.LOCK.UPDATE,
          transaction: t
        });
        if (!adminWallet) {
          adminWallet = await db.Wallet.create({ user_id: 1, balance: 0 }, { transaction: t });
        }
        await adminWallet.increment("balance", { by: payableAmount, transaction: t });
        
        await db.WalletTransaction.create({
          wallet_id: adminWallet.id,
          transaction_type: "COMMISSION",
          amount: payableAmount,
          status: "SUCCESS",
          booking_id: booking.id,
          description: `Admin Commission for Booking #${booking.booking_code}`
        }, { transaction: t });
      } else {
        await booking.update({
          payment_status: "PAID",
          booking_status: "COMPLETED",
          detailed_status: "COMPLETED_CLOSED",
          remaining_paid_at: new Date()
        }, { transaction: t });

        const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id, { transaction: t });
        if (artistProfile) {
          let artistWallet = await db.Wallet.findOne({ 
            where: { user_id: artistProfile.user_id },
            lock: t.LOCK.UPDATE,
            transaction: t
          });
          if (!artistWallet) {
            artistWallet = await db.Wallet.create({ user_id: artistProfile.user_id, balance: 0 }, { transaction: t });
          }
          await artistWallet.increment("balance", { by: payableAmount, transaction: t });
          
          await db.WalletTransaction.create({
            wallet_id: artistWallet.id,
            transaction_type: "CREDIT",
            amount: payableAmount,
            status: "SUCCESS",
            booking_id: booking.id,
            description: `Settlement for completed booking #${booking.booking_code}`
          }, { transaction: t });
        }
      }

      await db.BookingStatusHistory.create({
        booking_id: booking.id,
        status: booking.booking_status,
        changed_by: userId,
        notes: `Paid ₹${payableAmount} via MehndiGo Wallet.`
      }, { transaction: t });

      const invoiceNum = `INV-${Date.now()}`;
      await db.Invoice.create({
        booking_id: booking.id,
        invoice_number: invoiceNum,
        invoice_url: `/payment/receipt/${booking.id}`
      }, { transaction: t });

      await t.commit();
      return booking;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new PaymentService();
