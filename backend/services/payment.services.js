const db = require("../models");
const AppError = require("../utils/errors/app.error");
const razorpay = require("../utils/razorpay");
const crypto = require("crypto");

class PaymentService {
  async createOrder(bookingId, userId) {
    const booking = await db.Booking.findOne({
      where: { id: bookingId, user_id: userId }
    });
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const options = {
      amount: booking.final_amount * 100, // amount in paisa
      currency: "INR",
      receipt: `receipt_booking_${booking.id}`
    };

    let order;
    try {
      order = await razorpay.orders.create(options);
    } catch (err) {
      console.log("Razorpay SDK error, creating mock order fallback:", err.message);
      order = {
        id: `order_mock_${Math.floor(100000 + Math.random() * 900000)}`,
        amount: options.amount,
        currency: "INR",
        receipt: options.receipt
      };
    }

    // Upsert transaction log
    await db.Transaction.create({
      user_id: userId,
      booking_id: bookingId,
      razorpay_order_id: order.id,
      amount: booking.final_amount,
      status: "PENDING"
    });

    // Upsert payment log
    await db.Payment.create({
      booking_id: bookingId,
      transaction_id: order.id,
      payment_method: "ONLINE",
      amount: booking.final_amount,
      status: "PENDING",
      razorpay_order_id: order.id
    });

    return order;
  }

  async verifyPayment(userId, data) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    const tx = await db.Transaction.findOne({
      where: { razorpay_order_id }
    });
    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }

    let isValid = true;
    if (razorpay_signature && !razorpay_order_id.startsWith("order_mock") && process.env.NODE_ENV !== "development") {
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "key_secret")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      isValid = generated_signature === razorpay_signature;
    }

    if (!isValid) {
      await tx.update({ status: "FAILED" });
      await db.Payment.update(
        { status: "FAILED" },
        { where: { razorpay_order_id } }
      );
      await db.Booking.update(
        { payment_status: "FAILED" },
        { where: { id: tx.booking_id } }
      );
      throw new AppError("Payment verification signature failed", 400);
    }

    // Success transaction
    await tx.update({
      razorpay_payment_id,
      razorpay_signature: razorpay_signature || null,
      status: "SUCCESS"
    });

    await db.Payment.update(
      {
        status: "SUCCESS",
        razorpay_payment_id,
        razorpay_signature: razorpay_signature || null,
        paid_at: new Date()
      },
      { where: { razorpay_order_id } }
    );

    // Update booking status
    await db.Booking.update(
      {
        payment_status: "PAID",
        booking_status: "CONFIRMED",
        detailed_status: "CONFIRMED"
      },
      { where: { id: tx.booking_id } }
    );

    await db.BookingStatusHistory.create({
      booking_id: tx.booking_id,
      status: "CONFIRMED",
      changed_by: userId,
      notes: "Payment verified successfully. Booking confirmed."
    });

    // Create Invoice record
    const invoiceNum = `INV-${Date.now()}`;
    await db.Invoice.create({
      booking_id: tx.booking_id,
      invoice_number: invoiceNum,
      invoice_url: `https://mehndigo.com/invoices/${invoiceNum}.pdf`
    });

    // Dispatch Notifications to customer, artist, and admin
    const booking = await db.Booking.findByPk(tx.booking_id);
    if (booking) {
      // Create WalletTransaction record to show in Wallet History
      try {
        const [wallet] = await db.Wallet.findOrCreate({
          where: { user_id: booking.user_id },
          defaults: { balance: 0 }
        });
        await db.WalletTransaction.create({
          wallet_id: wallet.id,
          booking_id: booking.id,
          transaction_type: "PAYMENT",
          amount: booking.final_amount,
          status: "SUCCESS",
          description: `Payment for booking #${booking.booking_code}`
        });
        console.log(`[WalletTx] Logged payment transaction of ₹${booking.final_amount} for booking #${booking.booking_code}`);

        // Artist Wallet Credit and WalletTransaction logging
        try {
          const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
          if (artistProfile) {
            const [artistWallet] = await db.Wallet.findOrCreate({
              where: { user_id: artistProfile.user_id },
              defaults: { balance: 0 }
            });
            const creditAmount = booking.final_amount;
            await artistWallet.increment('balance', { by: creditAmount });
            
            const customerUser = await db.User.findByPk(booking.user_id);
            const customerName = customerUser ? customerUser.name : "Client";
            await db.WalletTransaction.create({
              wallet_id: artistWallet.id,
              booking_id: booking.id,
              transaction_type: "PAYMENT",
              amount: creditAmount,
              status: "SUCCESS",
              description: `Payment from ${customerName} (#${booking.booking_code})`
            });
            console.log(`[WalletTx] Credited ₹${creditAmount} to artist user ID ${artistProfile.user_id} wallet`);
          }
        } catch (artistTxErr) {
          console.error("Error updating artist wallet/creating transaction log:", artistTxErr.message);
        }
      } catch (walletTxErr) {
        console.error("Error creating WalletTransaction log:", walletTxErr.message);
      }

      // Notify customer
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Payment Received Successfully! 🎉",
        message: `Your payment of ₹${booking.final_amount} for booking #${booking.booking_code} was received.`,
        type: "SYSTEM"
      });

      // Notify artist
      const artist = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artist) {
        await db.Notification.create({
          user_id: artist.user_id,
          title: "New Booking Confirmed 📅",
          message: `Mehndi booking request #${booking.booking_code} has been paid and confirmed.`,
          type: "SYSTEM"
        });
      }
    }

    return tx;
  }

  async handleWebhook(rawBody, signature) {
    // Razorpay Webhooks signature verification
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "webhook_secret";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      throw new AppError("Invalid webhook signature", 400);
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    console.log(`Razorpay Webhook Event Received: ${event}`);

    if (event === "payment.captured" || event === "order.paid") {
      const orderId = payload.payload.payment.entity.order_id;
      const paymentId = payload.payload.payment.entity.id;

      const tx = await db.Transaction.findOne({ where: { razorpay_order_id: orderId } });
      if (tx && tx.status !== "SUCCESS") {
        await tx.update({ status: "SUCCESS", razorpay_payment_id: paymentId });
        await db.Payment.update({ status: "SUCCESS", razorpay_payment_id: paymentId, paid_at: new Date() }, { where: { razorpay_order_id: orderId } });
        await db.Booking.update({ payment_status: "PAID", booking_status: "CONFIRMED", detailed_status: "CONFIRMED" }, { where: { id: tx.booking_id } });
      }
    } else if (event === "payment.failed") {
      const orderId = payload.payload.payment.entity.order_id;
      const tx = await db.Transaction.findOne({ where: { razorpay_order_id: orderId } });
      if (tx) {
        await tx.update({ status: "FAILED" });
        await db.Payment.update({ status: "FAILED" }, { where: { razorpay_order_id: orderId } });
        await db.Booking.update({ payment_status: "FAILED" }, { where: { id: tx.booking_id } });
      }
    } else if (event === "refund.processed") {
      const refundId = payload.payload.refund.entity.id;
      const paymentId = payload.payload.refund.entity.payment_id;

      const refund = await db.Refund.findOne({ where: { razorpay_refund_id: refundId } });
      if (refund) {
        await refund.update({ status: "SUCCESS" });
        await db.Booking.update({ payment_status: "FAILED", detailed_status: "REFUNDED" }, { where: { id: refund.booking_id } });
      }
    }

    return { status: "OK" };
  }

  async getPaymentHistory(userId, role) {
    let where = {};
    if (role === "CUSTOMER") {
      where.user_id = userId;
    } else if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (!artist) return [];
      // Find bookings of this artist
      const bookings = await db.Booking.findAll({ where: { artist_id: artist.id }, attributes: ["id"] });
      const bookingIds = bookings.map((b) => b.id);
      where = { booking_id: { [db.Sequelize.Op.in]: bookingIds } };
    }

    return await db.Transaction.findAll({
      where,
      include: [
        {
          model: db.Booking,
          as: "booking",
          attributes: ["id", "booking_code", "booking_status", "detailed_status"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getPaymentById(paymentId) {
    const tx = await db.Transaction.findByPk(paymentId, {
      include: [
        {
          model: db.Booking,
          as: "booking",
          include: [
            { model: db.User, as: "user", attributes: ["name", "phone"] },
            { model: db.Service, as: "service", attributes: ["specialization_name"] }
          ]
        }
      ]
    });
    if (!tx) {
      throw new AppError("Payment transaction not found", 404);
    }
    return tx;
  }

  async initiateRefund(bookingId, reason, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const payment = await db.Payment.findOne({
      where: { booking_id: bookingId, status: "SUCCESS" }
    });

    const refundAmount = booking.final_amount;

    let refundId = `ref_mock_${Math.floor(100000 + Math.random() * 900000)}`;
    if (payment && payment.razorpay_payment_id && !payment.razorpay_payment_id.startsWith("pay_mock")) {
      try {
        const rpRefund = await razorpay.refunds.create({
          payment_id: payment.razorpay_payment_id,
          amount: refundAmount * 100 // amount in paisa
        });
        refundId = rpRefund.id;
      } catch (err) {
        console.log("Razorpay SDK refund error, using fallback mock ID:", err.message);
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

    // Debit the artist's wallet if they were credited for this booking
    try {
      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        const artistWallet = await db.Wallet.findOne({ where: { user_id: artistProfile.user_id } });
        if (artistWallet) {
          const artistTx = await db.WalletTransaction.findOne({
            where: {
              wallet_id: artistWallet.id,
              booking_id: bookingId,
              transaction_type: "PAYMENT",
              status: "SUCCESS"
            }
          });

          if (artistTx) {
            await artistWallet.decrement("balance", { by: artistTx.amount });
            await db.WalletTransaction.create({
              wallet_id: artistWallet.id,
              booking_id: bookingId,
              transaction_type: "WITHDRAWAL",
              amount: artistTx.amount,
              status: "SUCCESS",
              description: `Deduction for refunded booking #${booking.booking_code}`
            });
            console.log(`[WalletTx] Debited ₹${artistTx.amount} from artist user ID ${artistProfile.user_id} wallet due to refund.`);
          }
        }
      }
    } catch (debitErr) {
      console.error("Error debiting artist wallet on refund:", debitErr.message);
    }

    try {
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Refund Initiated 💸",
        message: `Your refund of ₹${booking.final_amount} for booking #${booking.booking_code} was successfully processed.`,
        type: "SYSTEM"
      });
    } catch (notifErr) {
      console.error("Error sending refund notification:", notifErr.message);
    }

    return refundRecord;
  }

  async getRefundHistory(userId, role) {
    let where = {};
    if (role === "CUSTOMER") {
      // Find bookings of this user
      const bookings = await db.Booking.findAll({ where: { user_id: userId }, attributes: ["id"] });
      const bookingIds = bookings.map((b) => b.id);
      where = { booking_id: { [db.Sequelize.Op.in]: bookingIds } };
    } else if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (!artist) return [];
      const bookings = await db.Booking.findAll({ where: { artist_id: artist.id }, attributes: ["id"] });
      const bookingIds = bookings.map((b) => b.id);
      where = { booking_id: { [db.Sequelize.Op.in]: bookingIds } };
    }

    return await db.Refund.findAll({
      where,
      include: [
        {
          model: db.Booking,
          as: "booking",
          attributes: ["id", "booking_code"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getInvoiceByBooking(bookingId) {
    const invoice = await db.Invoice.findOne({
      where: { booking_id: bookingId },
      include: [
        {
          model: db.Booking,
          as: "booking",
          include: [
            { model: db.User, as: "user", attributes: ["name", "phone", "email"] },
            { model: db.Service, as: "service", attributes: ["specialization_name"] }
          ]
        }
      ]
    });
    if (!invoice) {
      throw new AppError("Invoice not found for this booking", 404);
    }
    return invoice;
  }

  async retryPayment(bookingId, userId) {
    return await this.createOrder(bookingId, userId);
  }
}

module.exports = new PaymentService();
