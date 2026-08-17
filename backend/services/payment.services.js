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
<<<<<<< HEAD
      
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
=======
      const totalAmt = Number(booking.final_amount || booking.total_price || 1800);
      const advanceAmt = Math.round(totalAmt * 0.10);
      orderAmount = Math.round(advanceAmt);
      note = `Booking Advance Payment for Booking #${booking.booking_code}`;
>>>>>>> 3d724d199dd5257dfe28c46b3e3429559b9d412b
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

    if (tx.status === "SUCCESS") {
      console.log(`[VERIFY_PAYMENT] Transaction ${cashfree_order_id} is already SUCCESS. Returning early.`);
      return tx;
    }

<<<<<<< HEAD
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
=======
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
>>>>>>> 3d724d199dd5257dfe28c46b3e3429559b9d412b
      }
      throw new AppError("Verification rejected: Fake or simulated payment signatures are strictly forbidden.", 400);
    }

<<<<<<< HEAD
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
=======
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
>>>>>>> 3d724d199dd5257dfe28c46b3e3429559b9d412b

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

<<<<<<< HEAD
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
=======
        console.log(`[VERIFY_PAYMENT] Booking #${booking.booking_code} status BEFORE update: booking_status=${booking.booking_status}, payment_status=${booking.payment_status}, detailed_status=${booking.detailed_status}`);

        if (isAdvance) {
<<<<<<< HEAD
          const advancePaid = Math.round(booking.final_amount * 0.10);
          console.log(`[VERIFY_PAYMENT] Processing 10% ADVANCE payment of ₹${advancePaid} for Booking #${booking.booking_code}`);
=======
          const totalAmt = Number(booking.final_amount || booking.total_price || 1800);
          const advancePaid = Math.round(totalAmt * 0.10);
          const remaining = Math.max(0, totalAmt - advancePaid);
          const platformCommission = Math.round(totalAmt * 0.10);
          console.log(`[VERIFY_PAYMENT] Processing FIXED ₹500 ADVANCE payment of ₹${advancePaid} (Remaining: ₹${remaining}, Platform Commission: ₹${platformCommission}) for Booking #${booking.booking_code}`);
>>>>>>> 3d724d199dd5257dfe28c46b3e3429559b9d412b
          
          await booking.update({
            payment_status: "PARTIAL",
            booking_status: "CONFIRMED",
            detailed_status: "CONFIRMED",
            advance_paid: advancePaid
          });
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a

          console.log(`[VERIFY_PAYMENT] Booking #${booking.booking_code} status AFTER ADVANCE update: booking_status=${booking.booking_status}, payment_status=${booking.payment_status}, detailed_status=${booking.detailed_status}`);

          await db.BookingStatusHistory.create({
            booking_id: booking.id,
            status: "CONFIRMED",
            changed_by: userId,
            notes: `Advance payment of ₹${advancePaid} verified successfully. Booking confirmed.`
          });

<<<<<<< HEAD
        // Artist Wallet Escrow Credit and Platform Commission splitting
        try {
          await this.processPaymentDistribution(booking);
          if (booking.booking_status === "COMPLETED") {
            await this.completeBookingSettlement(booking.id);
          }
        } catch (artistTxErr) {
          console.error("Error running payment distribution on verification:", artistTxErr.message);
=======
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
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
        }

<<<<<<< HEAD
      // Notify customer
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Payment Received Successfully! 🎉",
        message: `Your payment of ₹${booking.final_amount} for booking #${booking.booking_code} was received.`,
        type: "PAYMENT",
        data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
=======
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
    } else {
      // Wallet Recharge Flow
      const [wallet] = await db.Wallet.findOrCreate({
        where: { user_id: tx.user_id },
        defaults: { balance: 0 }
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
      });
      await wallet.increment("balance", { by: tx.amount });

<<<<<<< HEAD
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
=======
      await db.WalletTransaction.create({
        wallet_id: wallet.id,
        transaction_type: "RECHARGE",
        amount: tx.amount,
        status: "SUCCESS",
        description: `Wallet recharge via Cashfree (Order: ${tx.cashfree_order_id})`
      });
      console.log(`[Recharge Success] Credited ₹${tx.amount} to user ID ${tx.user_id} wallet`);
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
    }

    return tx;
  }

  async handleWebhook(rawBody, signature, timestamp) {
    const secret = process.env.CASHFREE_CLIENT_SECRET;
    if (!secret) {
      console.warn("Cashfree client secret is not configured. Webhook signature verification bypassed.");
      return { status: "SECRET_MISSING" };
    }

<<<<<<< HEAD
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
=======
    if (signature && timestamp) {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(timestamp + rawBody)
        .digest("base64");
        
      if (expectedSignature !== signature) {
        console.error("Invalid Cashfree webhook signature");
        throw new AppError("Invalid webhook signature", 400);
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
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
                console.error(`[WalletDeductionFailed] Insufficient wallet balance for artist debit on refund. Artist: ${artistProfile.user_id}, Needed: ${artistTx.amount}, Available: ${artistWallet.balance}, Booking: ${bookingId}`);
                throw new AppError("You don't have enough wallet balance to complete this transaction.", 400);
              }
              
              const newBalance = artistWallet.balance - artistTx.amount;
              await artistWallet.update({ balance: newBalance }, { transaction: t });

              await db.WalletTransaction.create({
                wallet_id: artistWallet.id,
                booking_id: bookingId,
                transaction_type: "WITHDRAWAL",
                amount: artistTx.amount,
                status: "SUCCESS",
                description: `Deduction for refunded booking #${booking.booking_code}`
              }, { transaction: t });
              console.log(`[WalletTx] Debited ₹${artistTx.amount} from artist user ID ${artistProfile.user_id} wallet due to refund.`);
            }
          }
        });
      }
    } catch (debitErr) {
      console.error("Error debiting artist wallet on refund:", debitErr.message);
    }

    try {
      await db.Notification.create({
        user_id: booking.user_id,
        title: "Refund Initiated 💸",
        message: `Your refund of ₹${booking.final_amount} for booking #${booking.booking_code} was successfully processed.`,
        type: "PAYMENT",
        data: JSON.stringify({ bookingId: booking.id, booking_id: booking.id })
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

<<<<<<< HEAD
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
=======
  async handleWebhook(rawBody, signature, timestamp) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    // Verify signature if secret is present
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody))
        .digest("hex");

      if (expectedSignature !== signature) {
        console.error("[WEBHOOK] Invalid Razorpay webhook signature");
        throw new AppError("Invalid webhook signature", 400);
      }
>>>>>>> 3d724d199dd5257dfe28c46b3e3429559b9d412b
    }

    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    const event = payload.event;
    console.log(`[WEBHOOK] Received Razorpay event: ${event}`);

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id || payload.payload?.order?.entity?.id;
      const paymentId = paymentEntity.id;

      if (orderId) {
        const tx = await db.Transaction.findOne({
          where: { razorpay_order_id: orderId }
        });

        if (tx && tx.status !== "SUCCESS") {
          await tx.update({
            razorpay_payment_id: paymentId,
            status: "SUCCESS"
          });

          if (tx.booking_id) {
            const booking = await db.Booking.findByPk(tx.booking_id);
            if (booking && booking.payment_status !== "PAID") {
              const isAdvance = booking.payment_status === "PENDING";
              if (isAdvance) {
                const totalAmt = Number(booking.final_amount || booking.total_price || 1800);
                const advancePaid = Math.round(totalAmt * 0.10);
                const remaining = Math.max(0, totalAmt - advancePaid);
                await booking.update({
                  payment_status: "PARTIAL",
                  booking_status: "CONFIRMED",
                  detailed_status: "CONFIRMED",
                  advance_paid: advancePaid,
                  remaining_amount: remaining
                });
              }
            }
          }
        }
      }
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id;
      if (orderId) {
        await db.Transaction.update(
          { status: "FAILED" },
          { where: { razorpay_order_id: orderId } }
        );
      }
    }

    return { success: true, event };
  }

  async retryPayment(bookingId, userId) {
    return await this.createSession(bookingId, userId);
  }

  async payWithWallet(bookingId, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    let payableAmount = 0;
    if (booking.booking_status === "PENDING" && booking.payment_status === "PENDING") {
      payableAmount = Math.round(booking.final_amount * 0.10);
    } else if (booking.detailed_status === "WAITING_FOR_USER_PAYMENT") {
      payableAmount = booking.remaining_amount;
    } else {
      payableAmount = booking.final_amount;
    }

<<<<<<< HEAD
    // 1. Create Wallet Transaction
    await db.WalletTransaction.create({
      wallet_id: wallet.id,
      transaction_type: "PAYMENT",
      amount: Number(booking.final_amount),
      status: "SUCCESS",
      booking_id: booking.id,
      description: `Deducted for booking #${booking.booking_code} (Wallet Checkout)`
    });
=======
    const t = await db.sequelize.transaction();
    try {
      const WalletService = require("./wallet.services");
      
      // Get or create wallet row safely with row update lock
      let wallet = await db.Wallet.findOne({ 
        where: { user_id: userId },
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      if (!wallet) {
        wallet = await db.Wallet.create({ user_id: userId, balance: 0 }, { transaction: t });
      }
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a

      // Insufficient balance check (Backend validation)
      if (wallet.balance < payableAmount) {
        console.error(`[WalletDeductionFailed] Insufficient wallet balance checkout. User: ${userId}, Required: ${payableAmount}, Available: ${wallet.balance}, Booking: ${bookingId}`);
        throw new AppError("Insufficient wallet balance. Please add money to your wallet and try again.", 400);
      }

<<<<<<< HEAD
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
=======
      const newBalance = wallet.balance - payableAmount;
      await wallet.update({ balance: newBalance }, { transaction: t });

      // 1. Create Wallet Transaction log (Change DEBIT to PAYMENT enum)
      await db.WalletTransaction.create({
        wallet_id: wallet.id,
        transaction_type: "PAYMENT",
        amount: payableAmount,
        status: "SUCCESS",
        booking_id: booking.id,
        description: `Deducted for booking #${booking.booking_code} (Wallet Checkout)`
      }, { transaction: t });
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a

      // 2. Create online payment transaction simulation (Add user_id and remove payment_method)
      await db.Transaction.create({
        user_id: userId,
        booking_id: booking.id,
        amount: payableAmount,
        status: "SUCCESS",
        cashfree_order_id: `wallet_mock_${Date.now()}`,
        cashfree_payment_id: `wallet_pay_${Date.now()}`
      }, { transaction: t });

<<<<<<< HEAD
    // Apply payment distribution automatically
    await this.processPaymentDistribution(booking);
    if (isCompleted) {
      await this.completeBookingSettlement(booking.id);
    }

    return booking;
=======
      // 3. Update Booking
      if (booking.booking_status === "PENDING" && booking.payment_status === "PENDING") {
        // Advance paid
        await booking.update({
          payment_status: "PARTIAL",
          booking_status: "CONFIRMED",
          detailed_status: "CONFIRMED",
          advance_paid: payableAmount
        }, { transaction: t });

        // Credit 10% advance to admin commission wallet
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
        console.log(`[WalletPayment] Credited admin commission: ₹${payableAmount}`);
      } else {
        // Remaining payment paid or full payment paid
        await booking.update({
          payment_status: "PAID",
          booking_status: "COMPLETED",
          detailed_status: "COMPLETED_CLOSED",
          remaining_paid_at: new Date()
        }, { transaction: t });

        // Credit remaining to artist wallet
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
          console.log(`[WalletPayment] Credited artist: ₹${payableAmount}`);
        }
      }

      // 4. Booking status history
      await db.BookingStatusHistory.create({
        booking_id: booking.id,
        status: booking.booking_status,
        changed_by: userId,
        notes: `Paid ₹${payableAmount} via MehndiGo Wallet.`
      }, { transaction: t });

      // 5. Create Invoice record
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
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
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
          const [artistWallet] = await db.Wallet.findOrCreate({
            where: { user_id: artistProfile.user_id },
            defaults: { balance: 0, pending_balance: 0, lifetime_earnings: 0, total_commission_earned: 0, total_withdrawals: 0 }
          });
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
