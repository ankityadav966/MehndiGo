const NOTIFICATION_ROUTES = {
  booking: {
    customer: {
      booking_confirmed: { screen: "BookingDetails", params: { id: ":bookingId" } },
      booking_accepted: { screen: "BookingDetails", params: { id: ":bookingId" } },
      booking_rejected: { screen: "MyBookings" },
      artist_on_the_way: { screen: "LiveTracking", params: { id: ":bookingId" } },
      artist_arrived: { screen: "LiveTracking", params: { id: ":bookingId" } },
      booking_completed: { screen: "ReviewSubmission", params: { id: ":bookingId" } },
    },
    artist: {
      new_lead: { screen: "LeadDetails", params: { id: ":leadId" } },
      new_booking_request: { screen: "BookingDetails", params: { id: ":bookingId" } },
      booking_cancelled: { screen: "Bookings" },
    },
  },
  payment: {
    customer: {
      payment_success: { screen: "BookingSuccess" },
      payment_failed: { screen: "PaymentFailed" },
      refund_initiated: { screen: "RefundStatus", params: { id: ":refundId" } },
      refund_completed: { screen: "RefundStatus", params: { id: ":refundId" } },
    },
    artist: {
      payment_received: { screen: "Wallet" },
      withdrawal_approved: { screen: "WithdrawalSuccess" },
      withdrawal_rejected: { screen: "WithdrawalFailed" },
    },
  },
  wallet: {
    customer: {
      wallet_credit: { screen: "Wallet" },
      wallet_debit: { screen: "Wallet" },
    },
    artist: {
      wallet_credit: { screen: "Wallet" },
      wallet_debit: { screen: "Wallet" },
    },
  },
  review: {
    customer: {
      review_reminder: { screen: "ReviewSubmission", params: { id: ":bookingId" } },
    },
    artist: {
      new_review: { screen: "Reviews" },
    },
  },
  profile: {
    artist: {
      kyc_approved: { screen: "Profile" },
      kyc_rejected: { screen: "ReuploadDocuments" },
      profile_approved: { screen: "Profile" },
      profile_rejected: { screen: "ReuploadDocuments" },
    },
  },
  promo: {
    customer: {
      new_coupon: { screen: "Coupons" },
      promotional_offer: { screen: "Coupons" },
    },
  },
  chat: {
    customer: {
      new_message: { screen: "ChatRoom", params: { bookingId: ":bookingId" } },
    },
    artist: {
      new_message: { screen: "ChatRoom", params: { bookingId: ":bookingId" } },
    },
  },
};

export function resolveNotificationRoute(notification, role) {
  const data = notification?.data || notification?.request?.content?.data || {};

  let { type, event, bookingId, leadId, refundId } = data;

  // Normalize socket.io notification structures
  if (!type && data.type) type = data.type;
  
  // Map type to lowercase to match config keys (e.g. "BOOKING" -> "booking")
  if (type) type = type.toLowerCase();

  const normalizedRole = String(role || "").toLowerCase();

  // If event is missing, map it using type
  if (type && !event) {
    if (type === "booking") {
      event = normalizedRole === "artist" ? "new_booking_request" : "booking_confirmed";
    } else if (type === "payment") {
      event = normalizedRole === "artist" ? "payment_received" : "payment_success";
    } else if (type === "wallet") {
      event = "wallet_credit";
    } else if (type === "review") {
      event = normalizedRole === "artist" ? "new_review" : "review_reminder";
    } else if (type === "chat") {
      event = "new_message";
    }
  }

  // Fallback to Notifications/NotificationCenter
  const fallbackScreen = normalizedRole === "artist" ? "Notifications" : "NotificationCenter";

  if (!type || !event) {
    return { screen: fallbackScreen };
  }

  const typeRoutes = NOTIFICATION_ROUTES[type];
  if (!typeRoutes) return { screen: fallbackScreen };

  const roleRoutes = typeRoutes[normalizedRole];
  if (!roleRoutes) return { screen: fallbackScreen };

  const route = roleRoutes[event];
  if (!route) return { screen: fallbackScreen };

  const resolvedParams = { ...route.params };
  if (resolvedParams.id) {
    // Fallback to id or booking_id keys if bookingId is missing
    const bid = bookingId || data.bookingId || data.id || data.booking_id || "";
    resolvedParams.id = resolvedParams.id.replace(":bookingId", bid);
    resolvedParams.id = resolvedParams.id.replace(":leadId", leadId || data.leadId || data.id || "");
    resolvedParams.id = resolvedParams.id.replace(":refundId", refundId || data.refundId || data.id || "");
  }
  if (resolvedParams.bookingId) {
    const bid = bookingId || data.bookingId || data.id || data.booking_id || "";
    resolvedParams.bookingId = resolvedParams.bookingId.replace(":bookingId", bid);
  }

  return { screen: route.screen, params: resolvedParams };
}

export const linkingConfig = {
  prefixes: ["mehendigoo://", "https://mehendigoo.com", "https://mehendigo.app", "https://www.mehendigo.app"],
  config: {
    screens: {
      Splash: "splash",
      Login: "auth/login",
      Register: "auth/register",
      Otp: "auth/otp",
      CustomerStack: {
        screens: {
          CustomerTabs: {
            screens: {
              Home: "home",
              Wishlist: "wishlist",
              Bookings: "bookings",
              Wallet: "wallet",
              Profile: "profile",
            },
          },
          BookingDetails: "booking/:id",
          LiveTracking: "tracking/:id",
          ReviewSubmission: "review/:id",
          PaymentFailed: "payment/failed",
          BookingSuccess: "booking/success",
          RefundStatus: "refund/:id",
          NotificationCenter: "notifications",
          NotificationDetails: "notification/:id",
          Coupons: "coupons",
          Support: "support",
          Settings: "settings",
          ReferralDashboard: "invite",
          ArtistProfile: "artist/:artistId",
          ChatRoom: "chat/:roomId",
        },
      },
      ArtistStack: {
        screens: {
          ArtistTabs: {
            screens: {
              Dashboard: "artist/home",
              Leads: "artist/leads",
              Bookings: "artist/bookings",
              Wallet: "artist/wallet",
              Profile: "artist/profile",
            },
          },
          BookingDetails: "artist/booking/:id",
          LeadDetails: "artist/lead/:id",
          Notifications: "artist/notifications",
          NotificationDetails: "artist/notification/:id",
          WithdrawalSuccess: "artist/withdrawal/success",
          WithdrawalFailed: "artist/withdrawal/failed",
          ReuploadDocuments: "artist/documents/reupload",
        },
      },
      ArtistFlowStack: {
        screens: {
          PersonalDetails: "artist/onboarding/personal",
          AadhaarVerification: "artist/onboarding/aadhaar",
          PANVerification: "artist/onboarding/pan",
          ProfilePhoto: "artist/onboarding/photo",
          WorkSamples: "artist/onboarding/samples",
          ApprovalPending: "artist/onboarding/pending",
        },
      },
    },
  },
};
