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
  let data = notification?.data || notification?.request?.content?.data || {};
  
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch(e) {}
  }

  let { type, event, bookingId, leadId, refundId } = data;

  // Smart Dynamic Fallback Parser if type or event metadata is missing
  if (!type || !event) {
    const titleText = (notification?.title || "").toLowerCase();
    const msgText = (notification?.message || "").toLowerCase();
    const notifType = (notification?.type || "").toUpperCase();

    // 1. Resolve Type
    if (notifType === "BOOKING" || titleText.includes("booking") || msgText.includes("booking")) {
      type = "booking";
    } else if (notifType === "PAYMENT" || titleText.includes("payment") || msgText.includes("payment") || msgText.includes("paid")) {
      type = "payment";
    } else if (notifType === "PROMOTION" || titleText.includes("coupon") || msgText.includes("coupon") || titleText.includes("promo")) {
      type = "promo";
    } else if (titleText.includes("message") || msgText.includes("message") || titleText.includes("chat") || msgText.includes("chat")) {
      type = "chat";
    } else {
      type = "system";
    }

    // 2. Resolve Event
    if (type === "booking") {
      if (titleText.includes("confirm") || msgText.includes("confirm")) event = "booking_confirmed";
      else if (titleText.includes("accept") || msgText.includes("accept")) event = "booking_accepted";
      else if (titleText.includes("reject") || msgText.includes("reject")) event = "booking_rejected";
      else if (titleText.includes("way") || msgText.includes("way")) event = "artist_on_the_way";
      else if (titleText.includes("arrive") || msgText.includes("arrive")) event = "artist_arrived";
      else if (titleText.includes("complete") || msgText.includes("complete")) event = "booking_completed";
      else if (titleText.includes("cancel") || msgText.includes("cancel")) event = "booking_cancelled";
      else event = "booking_confirmed";
    } else if (type === "payment") {
      if (titleText.includes("fail") || msgText.includes("fail")) event = "payment_failed";
      else if (titleText.includes("refund") || msgText.includes("refund")) event = "refund_initiated";
      else event = "payment_success";
    } else if (type === "promo") {
      event = "new_coupon";
    } else if (type === "chat") {
      event = "new_message";
    } else {
      event = "system_notification";
    }

    // 3. Regex ID Extractor
    const numberMatch = msgText.match(/(?:booking|lead|refund|id|#)\s*:?\s*#?\s*([0-9]+)/i);
    const resolvedNumId = numberMatch ? numberMatch[1] : null;

    if (resolvedNumId) {
      if (type === "booking" || type === "chat") bookingId = resolvedNumId;
      else if (type === "payment" && event.includes("refund")) refundId = resolvedNumId;
      else leadId = resolvedNumId;
    }
  }

  const fallbackCenter = role === "artist" ? "Notifications" : "NotificationCenter";

  if (!type || !event) {
    return { screen: fallbackCenter };
  }

  const typeRoutes = NOTIFICATION_ROUTES[type];
  if (!typeRoutes) return { screen: fallbackCenter };

  const roleRoutes = typeRoutes[role];
  if (!roleRoutes) return { screen: fallbackCenter };

  const route = roleRoutes[event];
  if (!route) return { screen: fallbackCenter };

  const resolvedParams = { ...route.params };
  
  if (resolvedParams.id) {
    if (!bookingId && !leadId && !refundId) {
      return { screen: role === "artist" ? "Bookings" : "MyBookings" };
    }
    resolvedParams.id = resolvedParams.id.replace(":bookingId", bookingId || "");
    resolvedParams.id = resolvedParams.id.replace(":leadId", leadId || "");
    resolvedParams.id = resolvedParams.id.replace(":refundId", refundId || "");
  }
  if (resolvedParams.bookingId) {
    if (!bookingId) {
      return { screen: role === "artist" ? "Bookings" : "MyBookings" };
    }
    resolvedParams.bookingId = resolvedParams.bookingId.replace(":bookingId", bookingId || "");
  }

  return { screen: route.screen, params: resolvedParams };
}

export function handleNotificationNavigation(notification, navigation, role) {
  try {
    const route = resolveNotificationRoute(notification, role);
    if (route && route.screen) {
      if (route.params) {
        navigation.navigate(route.screen, route.params);
      } else {
        navigation.navigate(route.screen);
      }
    } else {
      navigation.navigate(role === "artist" ? "Notifications" : "NotificationCenter");
    }
  } catch (err) {
    console.log("Failed to navigate from notification:", err.message);
    navigation.navigate(role === "artist" ? "Notifications" : "NotificationCenter");
  }
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
