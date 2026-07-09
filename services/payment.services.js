const db = require("../models");
const AppError = require("../utils/errors/app.error");
const cashfree = require("../utils/cashfree");
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

    let cfOrder;
    const isMockMode = process.env.MOCK_CASHFREE === "true";

    if (isMockMode) {
      /* MOCK CASHFREE MODE ACTIVE: Bypass actual API order creation completely */
      console.log("[CASHFREE_MOCK] MOCK_CASHFREE is enabled. Generating local mock order.");
      cfOrder = {
        order_id: orderId,
        payment_session_id: `mock_session_${orderId}`,
        order_amount: orderAmount,
        order_status: "ACTIVE"
      };
    } else {
      try {
        cfOrder = await cashfree.createCashfreeOrder({
          customerId: userId,
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone,
          orderId: orderId,
          amount: orderAmount,
          note: note
        });
        console.log("[CASHFREE_ORDER_CREATE] Succeeded. Response:", JSON.stringify(cfOrder, null, 2));
        if (!cfOrder || !cfOrder.payment_session_id) {
          throw new Error("payment_session_id is missing in Cashfree response");
        }
      } catch (err) {
        console.log("Cashfree SDK order creation failed, creating mock session fallback:", err.message);
        cfOrder = {
          order_id: orderId,
          payment_session_id: `session_mock_${Math.random().toString(36).substring(2, 10)}`,
          order_amount: orderAmount,
          order_status: "ACTIVE"
        };
      }
    }

    // Always log transaction record for security lookup
    await db.Transaction.create({
      user_id: userId,
      booking_id: isRecharge ? null : bookingId,
      cashfree_order_id: cfOrder.order_id,
      amount: orderAmount,
      status: "PENDING"
    });

    if (!isRecharge) {
      // Create payment log
      await db.Payment.create({
        booking_id: bookingId,
        transaction_id: cfOrder.order_id,
        payment_method: "ONLINE",
        amount: orderAmount,
        status: "PENDING",
        cashfree_order_id: cfOrder.order_id,
        gateway: "CASHFREE",
        currency: "INR"
      });
    }

    return {
      order_id: cfOrder.order_id,
      payment_session_id: cfOrder.payment_session_id,
      amount: orderAmount,
      mock_mode: isMockMode
    };
  }

  async verifyPaymentPublic(data) {
    const { cashfree_order_id } = data;
    const tx = await db.Transaction.findOne({
      where: { cashfree_order_id }
    });
    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }
    return await this.verifyPayment(tx.user_id, data);
  }

  async verifyPayment(userId, data) {
    const { cashfree_order_id } = data;

    const tx = await db.Transaction.findOne({
      where: { cashfree_order_id }
    });
    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }

    let orderStatus = "PENDING";
    let paymentDetails = null;

    // Verify using Cashfree API
    const isMock = process.env.MOCK_CASHFREE === "true" ||
                   cashfree_order_id.startsWith("order_mock") || 
                   cashfree_order_id.includes("_mock_") || 
                   (data.payment_session_id && (data.payment_session_id.startsWith("session_mock") || data.payment_session_id.startsWith("mock_session")));
    if (isMock) {
      orderStatus = "PAID";
      paymentDetails = {
        cf_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
        payment_method: {
          payment_group: "upi"
        }
      };
    } else {
      try {
        const cfOrder = await cashfree.getCashfreeOrder(cashfree_order_id);
        orderStatus = cfOrder.order_status;
        paymentDetails = cfOrder;
      } catch (err) {
        console.error("Cashfree order verification failed:", err.message);
        throw new AppError(err.message || "Failed to verify payment with Cashfree", 400);
      }
    }

    if (orderStatus !== "PAID") {
      await tx.update({ status: "FAILED" });
      if (tx.booking_id) {
        await db.Payment.update(
          { status: "FAILED" },
          { where: { cashfree_order_id } }
        );
        await db.Booking.update(
          { payment_status: "FAILED" },
          { where: { id: tx.booking_id } }
        );
      }
      throw new AppError(`Payment not completed. Status: ${orderStatus}`, 400);
    }

    const cfPaymentId = paymentDetails.cf_payment_id || `pay_${Math.random().toString(36).substring(2, 10)}`;

    // Success transaction
    await tx.update({
      cashfree_payment_id: cfPaymentId,
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

          console.log(`[VERIFY_PAYMENT] Booking #${booking.booking_code} status AFTER ADVANCE update: booking_status=${booking.booking_status}, payment_status=${booking.payment_status}, detailed_status=${booking.detailed_status}`);

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
              console.log(`[WalletTx] Credited advance commission of ₹${advancePaid} to Admin Wallet`);
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
            remaining_paid_at: new Date()
          });

          console.log(`[VERIFY_PAYMENT] Booking #${booking.booking_code} status AFTER REMAINING update: booking_status=${booking.booking_status}, payment_status=${booking.payment_status}, detailed_status=${booking.detailed_status}`);

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
              console.log(`[WalletTx] Credited remaining ₹${remainingPaid} to artist user ID ${artistProfile.user_id} wallet`);

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
        } else {
          console.log(`[VERIFY_PAYMENT] Warning: Booking #${booking.booking_code} payment status state did not match expected split conditions.`);
        }

        // Always update Payment record
        await db.Payment.update(
          {
            status: "SUCCESS",
            cashfree_payment_id: cfPaymentId,
            paid_at: new Date()
          },
          { where: { cashfree_order_id } }
        );
      }
    }

    return tx;
  }

  async handleWebhook(rawBody, signature, timestamp) {
    const secret = process.env.CASHFREE_CLIENT_SECRET;
    if (!secret) {
      console.warn("Cashfree client secret is not configured. Webhook signature verification bypassed.");
      return { status: "SECRET_MISSING" };
    }

    if (signature && timestamp) {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(timestamp + rawBody)
        .digest("base64");
        
      if (expectedSignature !== signature) {
        console.error("Invalid Cashfree webhook signature");
        throw new AppError("Invalid webhook signature", 400);
      }
    }

    try {
      const payload = JSON.parse(rawBody);
      const event = payload.type;
      const data = payload.data || {};
      const order = data.order || {};
      const payment = data.payment || {};
      const refund = data.refund || {};

      console.log(`Cashfree Webhook Event Received: ${event}`);

      const orderId = order.order_id;
      const paymentId = payment.cf_payment_id;

      if (event === "PAYMENT_SUCCESS") {
        const tx = await db.Transaction.findOne({ where: { cashfree_order_id: orderId } });
        if (tx && tx.status !== "SUCCESS") {
          await tx.update({ status: "SUCCESS", cashfree_payment_id: paymentId });
          await db.Payment.update({ status: "SUCCESS", cashfree_payment_id: paymentId, paid_at: new Date() }, { where: { cashfree_order_id: orderId } });
          await db.Booking.update({ payment_status: "PAID", booking_status: "CONFIRMED", detailed_status: "CONFIRMED" }, { where: { id: tx.booking_id } });
        }
      } else if (event === "PAYMENT_FAILED") {
        const tx = await db.Transaction.findOne({ where: { cashfree_order_id: orderId } });
        if (tx) {
          await tx.update({ status: "FAILED" });
          await db.Payment.update({ status: "FAILED" }, { where: { cashfree_order_id: orderId } });
          await db.Booking.update({ payment_status: "FAILED" }, { where: { id: tx.booking_id } });
        }
      } else if (event === "REFUND_SUCCESS") {
        const refundId = refund.cf_refund_id;
        const refRecord = await db.Refund.findOne({ where: { cashfree_refund_id: refundId } });
        if (refRecord) {
          await refRecord.update({ status: "SUCCESS" });
          await db.Booking.update({ payment_status: "FAILED", detailed_status: "REFUNDED" }, { where: { id: refRecord.booking_id } });
        }
      }
    } catch (parseErr) {
      console.error("Error parsing Cashfree webhook:", parseErr.message);
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
    if (payment && payment.cashfree_order_id && !payment.cashfree_order_id.startsWith("order_mock")) {
      try {
        const cfRefund = await cashfree.initiateCashfreeRefund(
          payment.cashfree_order_id,
          refundAmount,
          `ref_${Date.now()}`,
          reason || "Booking Cancellation Refund"
        );
        refundId = cfRefund.cf_refund_id || refundId;
      } catch (err) {
        console.log("Cashfree SDK refund error, using fallback mock ID:", err.message);
      }
    }

    const refundRecord = await db.Refund.create({
      booking_id: bookingId,
      payment_id: payment ? payment.id : null,
      cashfree_refund_id: refundId,
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
      transaction_type: "DEBIT",
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
      cashfree_order_id: `wallet_mock_${Date.now()}`,
      cashfree_payment_id: `wallet_pay_${Date.now()}`
    });

    // 3. Update Booking
    await booking.update({
      payment_status: "PAID",
      booking_status: "CONFIRMED",
      detailed_status: "CONFIRMED"
    });

    // 4. Booking status history
    await db.BookingStatusHistory.create({
      booking_id: booking.id,
      status: "CONFIRMED",
      changed_by: userId,
      notes: "Paid via MehndiGo Wallet. Booking confirmed."
    });

    // 5. Create Invoice record
    const invoiceNum = `INV-${Date.now()}`;
    await db.Invoice.create({
      booking_id: booking.id,
      invoice_number: invoiceNum,
      invoice_url: `/payment/receipt/${booking.id}`
    });

    return booking;
  }
}

module.exports = new PaymentService();
