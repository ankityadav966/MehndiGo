class NotificationTriggers {
  // ========================
  // CUSTOMER NOTIFICATIONS
  // ========================

  static async bookingRequestSubmitted({ bookingId, artistId, artistName, serviceName, date }) {
    return this._send({
      userId: artistId,
      type: "booking",
      event: "new_booking_request",
      title: "New Booking Request",
      body: `${artistName} sent a booking request for ${serviceName} on ${date}`,
      data: { bookingId, artistId },
    });
  }

  static async bookingAccepted({ bookingId, customerId, artistName, date }) {
    return this._send({
      userId: customerId,
      type: "booking",
      event: "booking_accepted",
      title: "Booking Accepted 🎉",
      body: `${artistName} accepted your booking for ${date}`,
      data: { bookingId },
    });
  }

  static async bookingRejected({ bookingId, customerId, artistName }) {
    return this._send({
      userId: customerId,
      type: "booking",
      event: "booking_rejected",
      title: "Booking Rejected",
      body: `${artistName} couldn't accept your booking. Browse other artists.`,
      data: { bookingId },
    });
  }

  static async artistOnTheWay({ bookingId, customerId, artistName, eta }) {
    return this._send({
      userId: customerId,
      type: "booking",
      event: "artist_on_the_way",
      title: "Artist On The Way 🚗",
      body: `${artistName} is on the way${eta ? `, ETA ${eta}` : ""}`,
      data: { bookingId },
    });
  }

  static async artistArrived({ bookingId, customerId, artistName }) {
    return this._send({
      userId: customerId,
      type: "booking",
      event: "artist_arrived",
      title: "Artist Arrived 📍",
      body: `${artistName} has arrived at your location`,
      data: { bookingId },
    });
  }

  static async bookingCompleted({ bookingId, customerId, artistName }) {
    return this._send({
      userId: customerId,
      type: "booking",
      event: "booking_completed",
      title: "Booking Completed ✅",
      body: `Your session with ${artistName} is complete. Please leave a review!`,
      data: { bookingId },
    });
  }

  static async paymentSuccess({ bookingId, customerId, amount }) {
    return this._send({
      userId: customerId,
      type: "payment",
      event: "payment_success",
      title: "Payment Successful 💰",
      body: `Payment of ₹${amount} was successful`,
      data: { bookingId },
    });
  }

  static async paymentFailed({ bookingId, customerId, amount, reason }) {
    return this._send({
      userId: customerId,
      type: "payment",
      event: "payment_failed",
      title: "Payment Failed ❌",
      body: `Payment of ₹${amount} failed${reason ? `: ${reason}` : ""}`,
      data: { bookingId },
    });
  }

  static async refundInitiated({ customerId, refundId, amount }) {
    return this._send({
      userId: customerId,
      type: "payment",
      event: "refund_initiated",
      title: "Refund Initiated ↩️",
      body: `Refund of ₹${amount} has been initiated`,
      data: { refundId },
    });
  }

  static async refundCompleted({ customerId, refundId, amount }) {
    return this._send({
      userId: customerId,
      type: "payment",
      event: "refund_completed",
      title: "Refund Completed ✅",
      body: `Refund of ₹${amount} has been credited to your wallet`,
      data: { refundId },
    });
  }

  static async newCoupon({ customerId, couponCode, discount }) {
    return this._send({
      userId: customerId,
      type: "promo",
      event: "new_coupon",
      title: "New Coupon Available 🎁",
      body: `Get ${discount}% off with code: ${couponCode}`,
      data: { couponCode },
    });
  }

  static async promotionalOffer({ customerId, title, description }) {
    return this._send({
      userId: customerId,
      type: "promo",
      event: "promotional_offer",
      title: title || "Special Offer 🔥",
      body: description || "Check out our latest offers!",
    });
  }

  static async reviewReminder({ customerId, bookingId, artistName }) {
    return this._send({
      userId: customerId,
      type: "review",
      event: "review_reminder",
      title: "Review Reminder ⭐",
      body: `How was your experience with ${artistName}? Share your review!`,
      data: { bookingId },
    });
  }

  static async walletCredit({ userId, amount, reason }) {
    return this._send({
      userId,
      type: "wallet",
      event: "wallet_credit",
      title: "Wallet Credited 💵",
      body: `₹${amount} credited to your wallet${reason ? `: ${reason}` : ""}`,
    });
  }

  static async walletDebit({ userId, amount, reason }) {
    return this._send({
      userId,
      type: "wallet",
      event: "wallet_debit",
      title: "Wallet Debited",
      body: `₹${amount} debited from your wallet${reason ? `: ${reason}` : ""}`,
    });
  }

  // ========================
  // ARTIST NOTIFICATIONS
  // ========================

  static async newLead({ artistId, leadId, customerName, serviceName }) {
    return this._send({
      userId: artistId,
      type: "booking",
      event: "new_lead",
      title: "New Lead 📩",
      body: `${customerName} is interested in ${serviceName}`,
      data: { leadId },
    });
  }

  static async newBookingRequest({ artistId, bookingId, customerName, serviceName, date }) {
    return this._send({
      userId: artistId,
      type: "booking",
      event: "new_booking_request",
      title: "New Booking Request 📅",
      body: `${customerName} sent a booking request for ${serviceName} on ${date}`,
      data: { bookingId },
    });
  }

  static async bookingCancelled({ artistId, bookingId, customerName }) {
    return this._send({
      userId: artistId,
      type: "booking",
      event: "booking_cancelled",
      title: "Booking Cancelled",
      body: `${customerName} cancelled their booking`,
      data: { bookingId },
    });
  }

  static async paymentReceived({ artistId, bookingId, amount }) {
    return this._send({
      userId: artistId,
      type: "payment",
      event: "payment_received",
      title: "Payment Received 💰",
      body: `Payment of ₹${amount} received for booking`,
      data: { bookingId },
    });
  }

  static async withdrawalApproved({ artistId, amount }) {
    return this._send({
      userId: artistId,
      type: "payment",
      event: "withdrawal_approved",
      title: "Withdrawal Approved ✅",
      body: `Your withdrawal of ₹${amount} has been approved`,
    });
  }

  static async withdrawalRejected({ artistId, amount, reason }) {
    return this._send({
      userId: artistId,
      type: "payment",
      event: "withdrawal_rejected",
      title: "Withdrawal Rejected ❌",
      body: `Your withdrawal of ₹${amount} was rejected${reason ? `: ${reason}` : ""}`,
    });
  }

  static async newReview({ artistId, reviewId, customerName, rating }) {
    return this._send({
      userId: artistId,
      type: "review",
      event: "new_review",
      title: "New Review ⭐",
      body: `${customerName} left a ${rating}-star review`,
      data: { reviewId },
    });
  }

  static async kycApproved({ artistId }) {
    return this._send({
      userId: artistId,
      type: "profile",
      event: "kyc_approved",
      title: "KYC Approved ✅",
      body: "Your KYC verification has been approved",
    });
  }

  static async kycRejected({ artistId, reason }) {
    return this._send({
      userId: artistId,
      type: "profile",
      event: "kyc_rejected",
      title: "KYC Rejected ❌",
      body: `Your KYC verification was rejected${reason ? `: ${reason}` : ""}`,
    });
  }

  static async profileApproved({ artistId }) {
    return this._send({
      userId: artistId,
      type: "profile",
      event: "profile_approved",
      title: "Profile Approved ✅",
      body: "Your artist profile has been approved and is now live",
    });
  }

  static async profileRejected({ artistId, reason }) {
    return this._send({
      userId: artistId,
      type: "profile",
      event: "profile_rejected",
      title: "Profile Rejected ❌",
      body: `Your profile was rejected${reason ? `: ${reason}` : ""}. Please reupload documents.`,
    });
  }

  static async _send({ userId, type, event, title, body, data }) {
    console.log(`[NotificationTriggers] ${type}/${event}:`, { title, body });
    return { userId, type, event, title, body, data };
  }
}

export default NotificationTriggers;
