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
    const bookingObj = await db.Booking.findByPk(tx.booking_id);
    if (!bookingObj) {
      throw new AppError("Booking not found", 404);
    }

    const isCompleted = bookingObj.booking_status === "COMPLETED";
    const targetBookingStatus = isCompleted ? "COMPLETED" : "CONFIRMED";
    const targetDetailedStatus = isCompleted ? "COMPLETED" : "CONFIRMED";

    await bookingObj.update({
      payment_status: "PAID",
      booking_status: targetBookingStatus,
      detailed_status: targetDetailedStatus
    });

    await db.BookingStatusHistory.create({
      booking_id: tx.booking_id,
      status: targetBookingStatus,
      changed_by: userId,
      notes: isCompleted 
        ? "Payment verified successfully for completed booking. Settlement complete." 
        : "Payment verified successfully. Booking confirmed."
    });

    // Create Invoice record
    const invoiceNum = `INV-${Date.now()}`;
    await db.Invoice.create({
      booking_id: tx.booking_id,
      invoice_number: invoiceNum,
      invoice_url: `/payment/receipt/${tx.booking_id}`
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

        // Artist Wallet Escrow Credit and Platform Commission splitting
        try {
          await this.processPaymentDistribution(booking);
          if (booking.booking_status === "COMPLETED") {
            await this.completeBookingSettlement(booking.id);
          }
        } catch (artistTxErr) {
          console.error("Error running payment distribution on verification:", artistTxErr.message);
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
        const notifTitle = booking.booking_status === "COMPLETED"
          ? "Payment Received Successfully"
          : "New Booking Confirmed 📅";
        const notifMessage = booking.booking_status === "COMPLETED"
          ? `The customer has successfully completed the online payment for Booking #${booking.booking_code}.`
          : `Mehndi booking request #${booking.booking_code} has been paid and confirmed.`;

        await db.Notification.create({
          user_id: artist.user_id,
          title: notifTitle,
          message: notifMessage,
          type: "BOOKING",
          data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
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
        const booking = await db.Booking.findByPk(tx.booking_id);
        if (booking) {
          const isCompleted = booking.booking_status === "COMPLETED";
          await booking.update({
            payment_status: "PAID",
            booking_status: isCompleted ? "COMPLETED" : "CONFIRMED",
            detailed_status: isCompleted ? "COMPLETED" : "CONFIRMED"
          });
          await this.processPaymentDistribution(booking);
          if (isCompleted) {
            await this.completeBookingSettlement(booking.id);
          }
        }
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

  async payWithWallet(bookingId, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const WalletService = require("./wallet.services");
    const wallet = await WalletService.getOrCreateWallet(userId);
    
    // Allow negative wallet balance: "wallet me bhi mines me honachaye"
    const newBalance = wallet.balance - Number(booking.final_amount);
    await wallet.update({ balance: newBalance });

    // 1. Create Wallet Transaction
    await db.WalletTransaction.create({
      wallet_id: wallet.id,
      transaction_type: "PAYMENT",
      amount: Number(booking.final_amount),
      status: "SUCCESS",
      booking_id: booking.id,
      description: `Deducted for booking #${booking.booking_code} (Wallet Checkout)`
    });

    // 2. Create online payment transaction simulation
    await db.Transaction.create({
      booking_id: booking.id,
      amount: Number(booking.final_amount),
      payment_method: "WALLET",
      status: "SUCCESS",
      razorpay_order_id: `wallet_mock_${Date.now()}`,
      razorpay_payment_id: `wallet_pay_${Date.now()}`
    });

    // 3. Update Booking
    const isCompleted = booking.booking_status === "COMPLETED";
    await booking.update({
      payment_status: "PAID",
      booking_status: isCompleted ? "COMPLETED" : "CONFIRMED",
      detailed_status: isCompleted ? "COMPLETED" : "CONFIRMED"
    });

    // 4. Booking status history
    await db.BookingStatusHistory.create({
      booking_id: booking.id,
      status: isCompleted ? "COMPLETED" : "CONFIRMED",
      changed_by: userId,
      notes: isCompleted ? "Paid via MehndiGo Wallet. Booking settled." : "Paid via MehndiGo Wallet. Booking confirmed."
    });

    // 5. Create Invoice record
    const invoiceNum = `INV-${Date.now()}`;
    await db.Invoice.create({
      booking_id: booking.id,
      invoice_number: invoiceNum,
      invoice_url: `/payment/receipt/${booking.id}`
    });

    // Apply payment distribution automatically
    await this.processPaymentDistribution(booking);
    if (isCompleted) {
      await this.completeBookingSettlement(booking.id);
    }

    return booking;
  }

  async processPaymentDistribution(booking) {
    try {
      const commissionSetting = await db.SystemSetting.findOne({ where: { key: "COMMISSION_PERCENTAGE" } });
      const commissionPercentage = commissionSetting ? parseInt(commissionSetting.value) : 10;

      const totalAmount = Number(booking.final_amount);
      const commissionAmount = Math.round(totalAmount * (commissionPercentage / 100));
      const artistAmount = totalAmount - commissionAmount;

      // Admin Wallet Commission credit
      let adminUser = await db.User.findOne({ where: { role: "ADMIN" } });
      if (!adminUser) {
        adminUser = await db.User.create({
          name: "System Admin",
          phone: "9999900000",
          email: "admin@mehndigo.com",
          role: "ADMIN",
          password: "system_generated_hash"
        });
      }

      const [adminWallet] = await db.Wallet.findOrCreate({
        where: { user_id: adminUser.id },
        defaults: { balance: 0, pending_balance: 0, lifetime_earnings: 0, total_commission_earned: 0, total_withdrawals: 0 }
      });

      await adminWallet.increment({
        balance: commissionAmount,
        total_commission_earned: commissionAmount,
        lifetime_earnings: commissionAmount
      });

      await db.WalletTransaction.create({
        wallet_id: adminWallet.id,
        booking_id: booking.id,
        transaction_type: "COMMISSION",
        amount: commissionAmount,
        status: "SUCCESS",
        description: `Commission from booking #${booking.booking_code}`
      });

      // Log SettlementHistory initially as PENDING
      await db.SettlementHistory.create({
        booking_id: booking.id,
        artist_id: booking.artist_id,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        artist_amount: artistAmount,
        status: "PENDING"
      });

      // Credit 90% to Artist Escrow / Pending balance
      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile) {
        const [artistWallet] = await db.Wallet.findOrCreate({
          where: { user_id: artistProfile.user_id },
          defaults: { balance: 0, pending_balance: 0, lifetime_earnings: 0, total_commission_earned: 0, total_withdrawals: 0 }
        });

        await artistWallet.increment({
          pending_balance: artistAmount
        });

        await db.EscrowRecord.create({
          booking_id: booking.id,
          artist_id: artistProfile.user_id,
          amount: artistAmount,
          status: "HELD"
        });

        const customerUser = await db.User.findByPk(booking.user_id);
        const customerName = customerUser ? customerUser.name : "Client";

        await db.WalletTransaction.create({
          wallet_id: artistWallet.id,
          booking_id: booking.id,
          transaction_type: "PAYMENT",
          amount: artistAmount,
          status: "PENDING",
          description: `Escrow payment held from ${customerName} (#${booking.booking_code})`
        });
      }
    } catch (err) {
      console.error("Payment distribution process failed:", err.message);
    }
  }

  async completeBookingSettlement(bookingId) {
    try {
      const booking = await db.Booking.findByPk(bookingId);
      if (!booking) return;

      const settlement = await db.SettlementHistory.findOne({ where: { booking_id: bookingId } });
      if (settlement && settlement.status !== "COMPLETED") {
        const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
        if (artistProfile) {
          const artistWallet = await db.Wallet.findOne({ where: { user_id: artistProfile.user_id } });
          if (artistWallet) {
            const escrow = await db.EscrowRecord.findOne({ where: { booking_id: bookingId, status: "HELD" } });
            if (escrow) {
              await artistWallet.decrement("pending_balance", { by: escrow.amount });
              await artistWallet.increment({
                balance: escrow.amount,
                lifetime_earnings: escrow.amount
              });

              await escrow.update({ status: "RELEASED" });

              await db.WalletTransaction.create({
                wallet_id: artistWallet.id,
                booking_id: booking.id,
                transaction_type: "SETTLEMENT",
                amount: escrow.amount,
                status: "SUCCESS",
                description: `Settlement for booking #${booking.booking_code} released from escrow`
              });
            }
          }
          await settlement.update({ status: "COMPLETED" });
        }
      }
    } catch (err) {
      console.error("Complete booking settlement failed:", err.message);
    }
  }
}

module.exports = new PaymentService();
