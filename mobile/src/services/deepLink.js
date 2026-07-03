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
};

export function resolveNotificationRoute(notification, role) {
  const data = notification?.data || notification?.request?.content?.data || {};

  const { type, event, bookingId, leadId, refundId } = data;

  if (!type || !event) {
    return { screen: "NotificationCenter" };
  }

  const typeRoutes = NOTIFICATION_ROUTES[type];
  if (!typeRoutes) return { screen: "NotificationCenter" };

  const roleRoutes = typeRoutes[role];
  if (!roleRoutes) return { screen: "NotificationCenter" };

  const route = roleRoutes[event];
  if (!route) return { screen: "NotificationCenter" };

  const resolvedParams = { ...route.params };
  if (resolvedParams.id) {
    resolvedParams.id = resolvedParams.id.replace(":bookingId", bookingId || "");
    resolvedParams.id = resolvedParams.id.replace(":leadId", leadId || "");
    resolvedParams.id = resolvedParams.id.replace(":refundId", refundId || "");
  }

  return { screen: route.screen, params: resolvedParams };
}

export const linkingConfig = {
  prefixes: ["mehendigoo://", "https://mehendigoo.com"],
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
