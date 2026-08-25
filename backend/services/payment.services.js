const db = require("../models");
const AppError = require("../utils/errors/app.error");
const razorpayUtil = require("../utils/razorpay");
const crypto = require("crypto");

class PaymentService {
  async createSession(bookingId, userId, amount, paymentMethod = "ADVANCE_CASH") {
    let orderAmount = 0; // Amount in Rupees
    let note = '';
    let isRecharge = false;

    const user = await db.User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!bookingId || bookingId === "recharge" || paymentMethod === "RECHARGE") {
      isRecharge = true;
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
      
      if (booking.detailed_status === "WAITING_FOR_USER_PAYMENT" || paymentMethod === "SETTLEMENT") {
        orderAmount = Math.round(Number(booking.remaining_amount || 0));
        note = `Booking Settlement Payment for Booking #${booking.booking_code}`;
      } else {
        const totalAmt = Number(booking.final_amount !== null && booking.final_amount !== undefined ? booking.final_amount : (booking.total_price || 0));
        const advanceAmt = Math.round(totalAmt * 0.10);
        orderAmount = Math.round(advanceAmt);
        note = `Booking Advance Payment for Booking #${booking.booking_code}`;
      }
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
      amount: orderAmount,
      status: "PENDING",
      gateway: "RAZORPAY"
    });

    if (!isRecharge) {
      // Log payment record
      await db.Payment.create({
        booking_id: bookingId,
        transaction_id: razorpayOrder.order_id,
        razorpay_order_id: razorpayOrder.order_id,
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
    const { razorpay_order_id, order_id } = data;
    const targetOrderId = razorpay_order_id || order_id;

    if (!targetOrderId) {
      throw new AppError("Missing Razorpay order_id parameter", 400);
    }

    const tx = await db.Transaction.findOne({
      where: { razorpay_order_id: targetOrderId }
    });

    if (!tx) {
      throw new AppError(`Transaction for order ID ${targetOrderId} not found`, 404);
    }
    return await this.verifyPayment(tx.user_id, data);
  }

  async verifyPayment(userId, data) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_session_id,
      order_id,
      payment_id,
      signature
    } = data;

    const rOrderId = razorpay_order_id || payment_session_id || order_id;
    const rPaymentId = razorpay_payment_id || payment_id;
    const rSignature = razorpay_signature || signature;

    if (!rOrderId) {
      throw new AppError("Missing Razorpay order_id parameter", 400);
    }

    const tx = await db.Transaction.findOne({
      where: { razorpay_order_id: rOrderId }
    });

    if (!tx) {
      throw new AppError(`Transaction for order ID ${rOrderId} not found`, 404);
    }

    // Authorization & Ownership checks
    if (userId && tx.user_id && Number(userId) !== Number(tx.user_id)) {
      throw new AppError("Order does not belong to the authenticated user", 403);
    }

    if (data.bookingId && tx.booking_id && Number(data.bookingId) !== Number(tx.booking_id)) {
      throw new AppError("Order does not belong to the specified booking", 400);
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
          where: { razorpay_order_id: rOrderId }
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
          where: { razorpay_order_id: rOrderId }
        });
      }
      throw new AppError("Invalid Razorpay payment signature. Verification failed.", 400);
    }

    const verifiedPaymentId = rPaymentId;

    // Mark Transaction SUCCESS
    await tx.update({
      razorpay_payment_id: verifiedPaymentId,
      razorpay_signature: rSignature || null,
      status: "SUCCESS"
    });

    if (tx.booking_id) {
      const booking = await db.Booking.findByPk(tx.booking_id);
      if (booking) {
        const isAdvance = booking.payment_status === "PENDING";
        const isRemaining = booking.detailed_status === "WAITING_FOR_USER_PAYMENT";

        console.log(`[VERIFY_PAYMENT] Booking #${booking.booking_code} status BEFORE update: booking_status=${booking.booking_status}, payment_status=${booking.payment_status}, detailed_status=${booking.detailed_status}`);

        if (isAdvance) {
          const totalAmt = Number(booking.final_amount || booking.total_price || booking.total_amount || 0);
          const advancePaid = Math.round(totalAmt * 0.10);
          const remaining = Math.max(0, totalAmt - advancePaid);
          const platformCommission = Math.round(totalAmt * 0.10);
          console.log(`[VERIFY_PAYMENT] Processing 10% Advance payment of ₹${advancePaid} (Remaining: ₹${remaining}, Platform Commission: ₹${platformCommission}) for Booking #${booking.booking_code}`);
          
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
            paid_at: new Date()
          },
          {
            where: { razorpay_order_id: rOrderId }
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
                const totalAmt = Number(booking.final_amount || booking.total_price || booking.total_amount || 0);
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

  async completeBookingSettlement(bookingId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) return null;

    // Idempotency: only settle once
    const existingSettlement = await db.SettlementHistory.findOne({
      where: { booking_id: booking.id, status: "COMPLETED" }
    });
    if (existingSettlement) {
      console.log(`[SETTLEMENT] Booking #${booking.booking_code} is already settled (Idempotent).`);
      return existingSettlement;
    }

    const totalAmount = Number(booking.final_amount !== null && booking.final_amount !== undefined ? booking.final_amount : (booking.total_price || 0));
    const advancePaid = Number(booking.advance_paid || 0);

    const commissionSetting = await db.SystemSetting.findOne({ where: { key: "COMMISSION_PERCENTAGE" } }).catch(() => null);
    const commissionPercentage = commissionSetting ? parseInt(commissionSetting.value) : 10;
    const totalCommissionDue = Math.round(totalAmount * (commissionPercentage / 100));
    const artistNetShare = totalAmount - totalCommissionDue;

    // 10% platform commission was already collected online in advance
    const uncollectedCommission = Math.max(0, totalCommissionDue - advancePaid);
    const surplusAdvanceToArtist = Math.max(0, advancePaid - totalCommissionDue);

    // Artist Wallet Settlement
    const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
    if (artistProfile) {
      const [artistWallet] = await db.Wallet.findOrCreate({
        where: { user_id: artistProfile.user_id },
        defaults: { balance: 0, available_balance: 0, pending_balance: 0, lifetime_earnings: 0, total_commission_earned: 0, total_withdrawals: 0 }
      });

      if (surplusAdvanceToArtist > 0) {
        await artistWallet.increment("balance", { by: surplusAdvanceToArtist });
        if (artistWallet.available_balance !== undefined) {
          await artistWallet.increment("available_balance", { by: surplusAdvanceToArtist });
        }
      } else if (booking.payment_status === "PAID" || booking.payment_method === "ONLINE") {
        await artistWallet.increment("balance", { by: artistNetShare });
        if (artistWallet.available_balance !== undefined) {
          await artistWallet.increment("available_balance", { by: artistNetShare });
        }
      }

      await artistWallet.increment("lifetime_earnings", { by: artistNetShare });

      // Create SETTLEMENT WalletTransaction entry
      try {
        await db.WalletTransaction.create({
          wallet_id: artistWallet.id,
          booking_id: booking.id,
          transaction_type: "SETTLEMENT",
          amount: artistNetShare,
          status: "SUCCESS",
          description: `Earnings settled for booking #${booking.booking_code}`
        });
      } catch (txErr) {
        console.warn("WalletTransaction record warning:", txErr.message);
      }

      // Release any held escrow to artist wallet balance
      try {
        const escrow = await db.EscrowRecord.findOne({ where: { booking_id: booking.id, status: "HELD" } });
        if (escrow) {
          await artistWallet.decrement("pending_balance", { by: escrow.amount });
          await artistWallet.increment("balance", { by: escrow.amount });
          if (artistWallet.available_balance !== undefined) {
            await artistWallet.increment("available_balance", { by: escrow.amount });
          }
          await escrow.update({ status: "RELEASED", updated_at: new Date() });
        }
      } catch (eErr) {
        console.warn("Escrow release warning:", eErr.message);
      }
    }

    // Record SettlementHistory
    const settlement = await db.SettlementHistory.create({
      booking_id: booking.id,
      artist_id: booking.artist_id,
      total_amount: totalAmount,
      commission_amount: totalCommissionDue,
      artist_amount: artistNetShare,
      status: "COMPLETED"
    });

    return settlement;
  }

  async getPaymentHistory(userId, role) {
    const where = {};
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      where.user_id = userId;
    }

    const transactions = await db.Transaction.findAll({
      where,
      include: [
        {
          model: db.Booking,
          as: "booking",
          required: false,
          attributes: [
            "id",
            "booking_code",
            "service_id",
            "artist_id",
            "total_price",
            "final_amount",
            "advance_paid",
            "remaining_amount",
            "booking_status",
            "payment_status",
            "booking_date",
            "booking_time"
          ],
          include: [
            {
              model: db.Service,
              as: "service",
              required: false,
              attributes: ["id", "specialization_name", "category"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return transactions;
  }

  async getPaymentById(id, userId, role) {
    const tx = await db.Transaction.findByPk(id, {
      include: [
        {
          model: db.Booking,
          as: "booking",
          required: false,
          include: [
            {
              model: db.Service,
              as: "service",
              required: false,
              attributes: ["id", "specialization_name", "category"]
            }
          ]
        }
      ]
    });
    if (!tx) {
      throw new AppError("Transaction not found", 404);
    }

    if (userId && role !== "ADMIN" && role !== "SUPER_ADMIN" && tx.user_id !== userId) {
      throw new AppError("Forbidden: Unauthorized access to transaction record", 403);
    }

    return tx;
  }

  async getRefundHistory(userId, role) {
    const where = {};
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      where.user_id = userId;
    }

    const refunds = await db.Refund.findAll({
      where,
      include: [
        {
          model: db.Booking,
          as: "booking",
          required: false,
          attributes: [
            "id",
            "booking_code",
            "total_price",
            "final_amount",
            "advance_paid",
            "remaining_amount",
            "booking_status",
            "payment_status"
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return refunds;
  }

  async getInvoiceByBooking(bookingId, userId, role) {
    const booking = await db.Booking.findByPk(bookingId, {
      include: [
        { model: db.User, as: "user", attributes: ["id", "name", "email", "phone", "profile_image"] },
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [{ model: db.User, as: "user", attributes: ["id", "name", "email", "phone"] }]
        },
        { model: db.Service, as: "service" }
      ]
    });
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (userId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      const isCustomer = booking.user_id === userId;
      const isArtist = booking.artist && booking.artist.user_id === userId;
      if (!isCustomer && !isArtist) {
        throw new AppError("Forbidden: Unauthorized access to booking invoice", 403);
      }
    }

    let invoice = await db.Invoice.findOne({ where: { booking_id: booking.id } });
    if (!invoice) {
      const invoiceNumber = `INV-${booking.booking_code || booking.id}-${Date.now().toString().slice(-6)}`;
      const invoiceUrl = `/payment/receipt/${booking.id}`;
      invoice = await db.Invoice.create({
        booking_id: booking.id,
        invoice_number: invoiceNumber,
        invoice_url: invoiceUrl
      });
    }

    const totalAmount = Number(booking.final_amount !== null && booking.final_amount !== undefined ? booking.final_amount : (booking.total_price || 0));
    const advancePaid = Number(booking.advance_paid || 0);
    const remainingPaid = Math.max(0, totalAmount - advancePaid);

    return {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_url: invoice.invoice_url,
      booking_id: booking.id,
      booking_code: booking.booking_code,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      customer_name: booking.user?.name || "Customer",
      customer_email: booking.user?.email || "N/A",
      customer_phone: booking.user?.phone || "N/A",
      artist_name: booking.artist?.user?.name || "Mehndi Artist",
      service_title: booking.service?.specialization_name || "Henna Styling",
      total_amount: totalAmount,
      advance_paid: advancePaid,
      remaining_paid: remainingPaid,
      payment_status: booking.payment_status,
      booking_status: booking.booking_status,
      created_at: invoice.createdAt || invoice.created_at
    };
  }

  async retryPayment(bookingId, userId) {
    const booking = await db.Booking.findOne({ where: { id: bookingId, user_id: userId } });
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (booking.payment_status === "PAID") {
      throw new AppError("Booking payment is already completed", 400);
    }

    return await this.createSession(bookingId, userId, null, "ADVANCE_CASH");
  }

  async initiateRefund(bookingId, reason, userId) {
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const advancePaid = Number(booking.advance_paid || 0);
    if (advancePaid <= 0) {
      throw new AppError("No advance payment available for refund", 400);
    }

    const existingRefund = await db.Refund.findOne({ where: { booking_id: bookingId, status: "SUCCESS" } });
    if (existingRefund) {
      return existingRefund;
    }

    const refund = await db.Refund.create({
      booking_id: bookingId,
      user_id: booking.user_id,
      amount: advancePaid,
      reason: reason || "Booking cancelled",
      status: "SUCCESS",
      gateway: "RAZORPAY",
      refund_date: new Date()
    });

    await booking.update({
      booking_status: "CANCELLED",
      detailed_status: "CANCELLED",
      payment_status: "REFUNDED"
    });

    return refund;
  }

  async payWithWallet(bookingId, userId) {
    const booking = await db.Booking.findOne({ where: { id: bookingId, user_id: userId } });
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const payableAmount = booking.detailed_status === "WAITING_FOR_USER_PAYMENT"
      ? Number(booking.remaining_amount || 0)
      : Math.round(Number(booking.final_amount || booking.total_price || 0) * 0.10);

    const userWallet = await db.Wallet.findOne({ where: { user_id: userId } });
    if (!userWallet || Number(userWallet.balance || 0) < payableAmount) {
      throw new AppError("Insufficient wallet balance for this payment", 400);
    }

    await userWallet.decrement("balance", { by: payableAmount });
    if (userWallet.available_balance !== undefined) {
      await userWallet.decrement("available_balance", { by: payableAmount });
    }

    const txId = `txn_w_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const tx = await db.Transaction.create({
      user_id: userId,
      booking_id: bookingId,
      transaction_id: txId,
      amount: payableAmount,
      status: "SUCCESS",
      gateway: "WALLET"
    });

    if (booking.detailed_status === "WAITING_FOR_USER_PAYMENT") {
      await booking.update({
        payment_status: "PAID",
        booking_status: "COMPLETED",
        detailed_status: "COMPLETED",
        remaining_amount: 0,
        remaining_paid_at: new Date()
      });
    } else {
      const totalAmt = Number(booking.final_amount || booking.total_price || 0);
      await booking.update({
        payment_status: "PARTIAL",
        booking_status: "CONFIRMED",
        detailed_status: "CONFIRMED",
        advance_paid: payableAmount,
        remaining_amount: Math.max(0, totalAmt - payableAmount)
      });
    }

    return { success: true, transaction: tx, payableAmount };
  }
}

module.exports = new PaymentService();
