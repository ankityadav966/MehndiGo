/**
 * MEHENDIGO CANONICAL DEEP LINKING SERVICE
 * Single authoritative service for deep-link generation, URL resolution, authentication gating,
 * Play Store fallbacks, and notification integration.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Config from "../constants/Config";

export const STORAGE_KEYS = {
  PENDING_DEEP_LINK: "pending_deep_link_route",
  PENDING_REFERRAL_CODE: "pendingReferralCode"
};

// =========================================================================
// 1. CANONICAL LINK GENERATORS
// =========================================================================

export function getPlayStoreFallbackUrl(targetPath = "") {
  if (!targetPath) return Config.PLAY_STORE_URL;
  const encodedPath = encodeURIComponent(targetPath);
  return `${Config.PLAY_STORE_URL}&referrer=utm_source%3Dmehndigo_share%26utm_medium%3Ddeeplink%26utm_content%3D${encodedPath}`;
}

export function createReelDeepLink(reelId, useScheme = false) {
  if (!reelId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(reelId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://reel/${cleanId}`
    : `${Config.PRIMARY_DOMAIN}/reel/${cleanId}`;
}

export function createServiceDeepLink(serviceId, useScheme = false) {
  if (!serviceId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(serviceId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://service/${cleanId}`
    : `${Config.PRIMARY_DOMAIN}/service/${cleanId}`;
}

export function createArtistDeepLink(artistId, useScheme = false) {
  if (!artistId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(artistId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://artist/${cleanId}`
    : `${Config.PRIMARY_DOMAIN}/artist/${cleanId}`;
}

export function createArtistServiceDeepLink(artistId, serviceId, useScheme = false) {
  if (!artistId || !serviceId) return getPlayStoreFallbackUrl();
  const cleanArtistId = encodeURIComponent(String(artistId).trim());
  const cleanServiceId = encodeURIComponent(String(serviceId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://artist/${cleanArtistId}/service/${cleanServiceId}`
    : `${Config.PRIMARY_DOMAIN}/artist/${cleanArtistId}/service/${cleanServiceId}`;
}

export function createDesignDeepLink(artistId, designId, useScheme = false) {
  if (!artistId || !designId) return getPlayStoreFallbackUrl();
  const cleanArtistId = encodeURIComponent(String(artistId).trim());
  const cleanDesignId = encodeURIComponent(String(designId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://artist/${cleanArtistId}/design/${cleanDesignId}`
    : `${Config.PRIMARY_DOMAIN}/artist/${cleanArtistId}/design/${cleanDesignId}`;
}

export function createCustomDesignDeepLink(artistId, useScheme = false) {
  if (!artistId) return getPlayStoreFallbackUrl();
  const cleanArtistId = encodeURIComponent(String(artistId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://artist/${cleanArtistId}/custom-design`
    : `${Config.PRIMARY_DOMAIN}/artist/${cleanArtistId}/custom-design`;
}

export function createPortfolioDeepLink(artistId, useScheme = false) {
  if (!artistId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(artistId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://portfolio/${cleanId}`
    : `${Config.PRIMARY_DOMAIN}/portfolio/${cleanId}`;
}

export function createBookingDeepLink(bookingId, useScheme = false) {
  if (!bookingId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(bookingId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://booking/${cleanId}`
    : `${Config.PRIMARY_DOMAIN}/booking/${cleanId}`;
}

export function createTrackingDeepLink(bookingId, useScheme = false) {
  if (!bookingId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(bookingId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://tracking/${cleanId}`
    : `${Config.PRIMARY_DOMAIN}/tracking/${cleanId}`;
}

export function createReviewDeepLink(bookingId, useScheme = false) {
  if (!bookingId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(bookingId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://review/${cleanId}`
    : `${Config.PRIMARY_DOMAIN}/review/${cleanId}`;
}

export function createSupportDeepLink(ticketId = null, useScheme = false) {
  if (ticketId) {
    const cleanId = encodeURIComponent(String(ticketId).trim());
    return useScheme
      ? `${Config.APP_SCHEME}://support/${cleanId}`
      : `${Config.PRIMARY_DOMAIN}/support/${cleanId}`;
  }
  return useScheme
    ? `${Config.APP_SCHEME}://support`
    : `${Config.PRIMARY_DOMAIN}/support`;
}

export function createReferralDeepLink(referralCode, useScheme = false) {
  if (!referralCode) return getPlayStoreFallbackUrl();
  const cleanCode = encodeURIComponent(String(referralCode).trim().toUpperCase());
  return useScheme
    ? `${Config.APP_SCHEME}://invite?ref=${cleanCode}`
    : `${Config.PRIMARY_DOMAIN}/invite?ref=${cleanCode}`;
}

export function createInviteDeepLink(referralCode, useScheme = false) {
  return createReferralDeepLink(referralCode, useScheme);
}

export function createCategoryDeepLink(categoryId, useScheme = false) {
  if (!categoryId) return getPlayStoreFallbackUrl();
  const cleanId = encodeURIComponent(String(categoryId).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://category/${cleanId}`
    : `${Config.PRIMARY_DOMAIN}/category/${cleanId}`;
}

export function createSearchDeepLink(query, useScheme = false) {
  if (!query) return getPlayStoreFallbackUrl();
  const cleanQ = encodeURIComponent(String(query).trim());
  return useScheme
    ? `${Config.APP_SCHEME}://search?q=${cleanQ}`
    : `${Config.PRIMARY_DOMAIN}/search?q=${cleanQ}`;
}

export function createCouponsDeepLink(useScheme = false) {
  return useScheme
    ? `${Config.APP_SCHEME}://coupons`
    : `${Config.PRIMARY_DOMAIN}/coupons`;
}

export function createWalletDeepLink(useScheme = false) {
  return useScheme
    ? `${Config.APP_SCHEME}://wallet`
    : `${Config.PRIMARY_DOMAIN}/wallet`;
}

// =========================================================================
// 2. CANONICAL LINK RESOLVER
// =========================================================================

/**
 * Parses and validates any incoming deep link URL (custom scheme or HTTPS domain).
 * Returns structured navigation intent with strict entity validation and auth requirements.
 */
export function resolveDeepLink(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, type: "UNKNOWN", error: "Empty or invalid URL" };
  }

  const trimmed = rawUrl.trim();
  let normalizedUrl = trimmed;

  // Normalize custom schemes (e.g. mehendigoo://, mehndigo://, exp+sonu-yadav://)
  let isCustomScheme = false;
  let schemeUsed = "";

  for (const scheme of Config.SUPPORTED_SCHEMES) {
    if (trimmed.startsWith(`${scheme}://`)) {
      isCustomScheme = true;
      schemeUsed = scheme;
      break;
    }
  }

  const isHttp = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  if (!isCustomScheme && !isHttp) {
    return { isValid: false, type: "UNKNOWN", error: "URL protocol or scheme not recognized", rawUrl };
  }

  let pathname = "";
  let queryParams = {};

  try {
    if (isCustomScheme) {
      const withoutScheme = trimmed.substring(`${schemeUsed}://`.length);
      const [pathPart, queryPart] = withoutScheme.split("?");
      pathname = pathPart ? (pathPart.startsWith("/") ? pathPart : `/${pathPart}`) : "/";
      if (queryPart) {
        queryPart.split("&").forEach((pair) => {
          const [k, v] = pair.split("=");
          if (k) queryParams[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
        });
      }
    } else {
      // Standard HTTP/HTTPS URL
      let urlObj;
      try {
        urlObj = new URL(trimmed);
      } catch (e) {
        return { isValid: false, type: "UNKNOWN", error: `Invalid web URL: ${e.message}`, rawUrl };
      }

      if (urlObj) {
        pathname = urlObj.pathname || "/";
        urlObj.searchParams.forEach((val, key) => {
          queryParams[key] = val;
        });
      }
    }
  } catch (err) {
    return { isValid: false, type: "UNKNOWN", error: `Failed to parse URL: ${err.message}` };
  }

  // Remove trailing slashes
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const segments = cleanPath.split("/").filter(Boolean);

  // Helper for numeric or alphanumeric ID validation
  const isValidEntityId = (id) => {
    if (!id || typeof id !== "string") return false;
    const clean = id.trim();
    if (!clean || clean === "null" || clean === "undefined") return false;
    return /^[a-zA-Z0-9_-]+$/.test(clean);
  };

  // 1. Reels & Short Videos (/reel/:reelId or /reels/:reelId or /reels)
  if (segments[0] === "reel" || segments[0] === "reels") {
    const reelId = segments[1];
    if (!reelId || !isValidEntityId(reelId)) {
      return {
        isValid: true,
        type: "REELS_FEED",
        screen: "CustomerTabs",
        tab: "Reels",
        params: {},
        requiresAuth: false,
        rawUrl
      };
    }
    const cleanId = isNaN(Number(reelId)) ? reelId : Number(reelId);
    return {
      isValid: true,
      type: "REEL",
      screen: "CustomerTabs",
      tab: "Reels",
      params: { reelId: cleanId, id: cleanId },
      requiresAuth: false,
      rawUrl
    };
  }

  // 2. Services (/service/:serviceId or /services/:serviceId)
  if (segments[0] === "service" || segments[0] === "services") {
    const serviceId = segments[1];
    if (!serviceId || !isValidEntityId(serviceId)) {
      return { isValid: false, type: "SERVICE", error: "Invalid service ID" };
    }
    const cleanId = isNaN(Number(serviceId)) ? serviceId : Number(serviceId);
    return {
      isValid: true,
      type: "SERVICE",
      screen: "SelectService",
      params: { serviceId: cleanId, id: cleanId },
      requiresAuth: false,
      rawUrl
    };
  }

  // 3. Artist Profile & Sub-resources
  if ((segments[0] === "artist" || segments[0] === "artists") && segments[1]) {
    const artistId = segments[1];
    if (!isValidEntityId(artistId)) {
      return { isValid: false, type: "ARTIST", error: "Invalid artist ID" };
    }
    const cleanArtistId = isNaN(Number(artistId)) ? artistId : Number(artistId);

    // 3a. Artist Service Catalog (/artist/:artistId/service/:serviceId)
    if ((segments[2] === "service" || segments[2] === "services") && segments[3]) {
      const serviceId = segments[3];
      const cleanServiceId = isNaN(Number(serviceId)) ? serviceId : Number(serviceId);
      return {
        isValid: true,
        type: "ARTIST_SERVICE_CATALOG",
        screen: "ArtistServiceCatalog",
        params: { artistId: cleanArtistId, serviceId: cleanServiceId },
        requiresAuth: false,
        rawUrl
      };
    }

    // 3b. Design Details (/artist/:artistId/design/:designId)
    if ((segments[2] === "design" || segments[2] === "designs") && segments[3]) {
      const designId = segments[3];
      const cleanDesignId = isNaN(Number(designId)) ? designId : Number(designId);
      return {
        isValid: true,
        type: "DESIGN_DETAILS",
        screen: "DesignDetails",
        params: { artistId: cleanArtistId, designId: cleanDesignId },
        requiresAuth: false,
        rawUrl
      };
    }

    // 3c. Custom Design Request (/artist/:artistId/custom-design)
    if (segments[2] === "custom-design" || segments[2] === "custom") {
      return {
        isValid: true,
        type: "CUSTOM_DESIGN",
        screen: "CustomDesignRequest",
        params: { artistId: cleanArtistId },
        requiresAuth: false,
        rawUrl
      };
    }

    return {
      isValid: true,
      type: "ARTIST",
      screen: "ArtistProfile",
      params: { artistId: cleanArtistId },
      requiresAuth: false,
      rawUrl
    };
  }

  // 4. Artist Portfolio (/portfolio/:artistId)
  if (segments[0] === "portfolio" && segments[1]) {
    const artistId = segments[1];
    if (!isValidEntityId(artistId)) {
      return { isValid: false, type: "PORTFOLIO", error: "Invalid artist ID for portfolio" };
    }
    const cleanId = isNaN(Number(artistId)) ? artistId : Number(artistId);
    return {
      isValid: true,
      type: "PORTFOLIO",
      screen: "Portfolio",
      params: { artistId: cleanId },
      requiresAuth: false,
      rawUrl
    };
  }

  // 5. Booking Details (/booking/:id)
  if (segments[0] === "booking" && segments[1]) {
    const bookingId = segments[1];
    if (!isValidEntityId(bookingId)) {
      return { isValid: false, type: "BOOKING", error: "Invalid booking ID" };
    }
    const cleanId = isNaN(Number(bookingId)) ? bookingId : Number(bookingId);
    return {
      isValid: true,
      type: "BOOKING",
      screen: "BookingDetails",
      params: { id: cleanId, bookingId: cleanId },
      requiresAuth: true,
      rawUrl
    };
  }

  // 6. Live Tracking (/tracking/:id)
  if (segments[0] === "tracking" && segments[1]) {
    const bookingId = segments[1];
    if (!isValidEntityId(bookingId)) {
      return { isValid: false, type: "TRACKING", error: "Invalid tracking booking ID" };
    }
    const cleanId = isNaN(Number(bookingId)) ? bookingId : Number(bookingId);
    return {
      isValid: true,
      type: "TRACKING",
      screen: "LiveTracking",
      params: { id: cleanId, bookingId: cleanId },
      requiresAuth: true,
      rawUrl
    };
  }

  // 7. Review Submission (/review/:id)
  if (segments[0] === "review" && segments[1]) {
    const bookingId = segments[1];
    if (!isValidEntityId(bookingId)) {
      return { isValid: false, type: "REVIEW", error: "Invalid review booking ID" };
    }
    const cleanId = isNaN(Number(bookingId)) ? bookingId : Number(bookingId);
    return {
      isValid: true,
      type: "REVIEW",
      screen: "ReviewSubmission",
      params: { id: cleanId, bookingId: cleanId },
      requiresAuth: true,
      rawUrl
    };
  }

  // 8. Support Ticket (/support/:ticketId or /support)
  if (segments[0] === "support") {
    if (segments[1]) {
      const ticketId = segments[1];
      if (!isValidEntityId(ticketId)) {
        return { isValid: false, type: "SUPPORT", error: "Invalid support ticket ID" };
      }
      const cleanId = isNaN(Number(ticketId)) ? ticketId : Number(ticketId);
      return {
        isValid: true,
        type: "SUPPORT",
        screen: "SupportTicketDetails",
        params: { ticketId: cleanId },
        requiresAuth: true,
        rawUrl
      };
    }
    return {
      isValid: true,
      type: "SUPPORT",
      screen: "Support",
      params: {},
      requiresAuth: true,
      rawUrl
    };
  }

  // 9. Referral / Invite (/invite?ref=:code or /invite/:code or /referral/:code)
  if (segments[0] === "invite" || segments[0] === "referral") {
    let refCode = queryParams.ref || queryParams.referralCode || queryParams.code || (segments[1] || "");
    refCode = (refCode || "").trim().toUpperCase();

    return {
      isValid: true,
      type: "REFERRAL",
      screen: "ReferralDashboard",
      params: { ref: refCode, referralCode: refCode },
      referralCode: refCode || null,
      requiresAuth: false,
      rawUrl
    };
  }

  // 10. Festival / Seasonal Offers (/festival/:code or /festivals/:code)
  if (segments[0] === "festival" || segments[0] === "festivals") {
    const festivalCode = (segments[1] || queryParams.code || "").trim();
    return {
      isValid: true,
      type: "FESTIVAL",
      screen: "Coupons",
      params: { prefilledCode: festivalCode, festivalCode },
      requiresAuth: false,
      rawUrl
    };
  }

  // Also check query param ?ref= on any root link
  if (queryParams.ref || queryParams.referralCode) {
    const refCode = (queryParams.ref || queryParams.referralCode || "").trim().toUpperCase();
    return {
      isValid: true,
      type: "REFERRAL",
      screen: "ReferralDashboard",
      params: { ref: refCode, referralCode: refCode },
      referralCode: refCode,
      requiresAuth: false,
      rawUrl
    };
  }

  // 11. Category Filter (/category/:categoryId)
  if (segments[0] === "category" && segments[1]) {
    const categoryId = segments[1];
    if (!isValidEntityId(categoryId)) {
      return { isValid: false, type: "CATEGORY", error: "Invalid category ID" };
    }
    const cleanId = isNaN(Number(categoryId)) ? categoryId : Number(categoryId);
    return {
      isValid: true,
      type: "CATEGORY",
      screen: "ArtistListing",
      params: { categoryId: cleanId },
      requiresAuth: false,
      rawUrl
    };
  }

  // 12. Categories List (/categories)
  if (segments[0] === "categories") {
    return {
      isValid: true,
      type: "CATEGORIES",
      screen: "Categories",
      params: {},
      requiresAuth: false,
      rawUrl
    };
  }

  // 13. Search Query (/search?q=:query or /search/:query)
  if (segments[0] === "search") {
    const q = queryParams.q || queryParams.query || segments[1] || "";
    return {
      isValid: true,
      type: "SEARCH",
      screen: "ArtistListing",
      params: { searchQuery: q },
      requiresAuth: false,
      rawUrl
    };
  }

  // 14. Coupons & Offers (/coupons)
  if (segments[0] === "coupons") {
    return {
      isValid: true,
      type: "COUPONS",
      screen: "Coupons",
      params: {},
      requiresAuth: false,
      rawUrl
    };
  }

  // 15. Wallet (/wallet)
  if (segments[0] === "wallet") {
    return {
      isValid: true,
      type: "WALLET",
      screen: "Wallet",
      params: {},
      requiresAuth: true,
      rawUrl
    };
  }

  // 16. Notifications (/notifications or /notification/:id)
  if (segments[0] === "notifications" || segments[0] === "notification") {
    if (segments[1]) {
      const notifId = segments[1];
      const cleanId = isNaN(Number(notifId)) ? notifId : Number(notifId);
      return {
        isValid: true,
        type: "NOTIFICATIONS",
        screen: "NotificationDetails",
        params: { id: cleanId },
        requiresAuth: true,
        rawUrl
      };
    }
    return {
      isValid: true,
      type: "NOTIFICATIONS",
      screen: "NotificationCenter",
      params: {},
      requiresAuth: true,
      rawUrl
    };
  }

  // 17. Customer My Bookings (/bookings or /my-bookings)
  if (segments[0] === "bookings" || segments[0] === "my-bookings") {
    return {
      isValid: true,
      type: "MY_BOOKINGS",
      screen: "MyBookings",
      params: {},
      requiresAuth: true,
      rawUrl
    };
  }

  // 18. Home Dashboard (/home or root)
  if (segments.length === 0 || segments[0] === "home") {
    return {
      isValid: true,
      type: "HOME",
      screen: "CustomerTabs",
      tab: "Home",
      params: {},
      requiresAuth: false,
      rawUrl
    };
  }

  return {
    isValid: false,
    type: "UNKNOWN",
    error: `Unsupported deep link route: ${cleanPath}`,
    rawUrl
  };
}

// =========================================================================
// 3. AUTHENTICATION GATING & PERSISTENCE
// =========================================================================

export async function setPendingDeepLink(routeObj) {
  if (!routeObj) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_DEEP_LINK, JSON.stringify(routeObj));
    if (__DEV__) console.log("[DeepLink Gate] Pending deep link preserved:", routeObj.screen);
  } catch (err) {
    if (__DEV__) console.log("[DeepLink Gate] Error preserving deep link:", err.message);
  }
}

export async function getPendingDeepLink() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_DEEP_LINK);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    if (__DEV__) console.log("[DeepLink Gate] Error reading pending deep link:", err.message);
    return null;
  }
}

export async function clearPendingDeepLink() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_DEEP_LINK);
  } catch (err) {
    if (__DEV__) console.log("[DeepLink Gate] Error clearing pending deep link:", err.message);
  }
}

/**
 * Consumes and navigates to the stored pending deep link after login/signup succeeds.
 */
export async function consumePendingDeepLink(navigation, isAuthenticated) {
  if (!navigation || !isAuthenticated) return false;
  try {
    const pending = await getPendingDeepLink();
    if (pending && pending.screen) {
      await clearPendingDeepLink();
      if (__DEV__) console.log("[DeepLink Gate] Resuming pending deep link destination:", pending.screen, pending.tab, pending.params);
      if (pending.screen === "CustomerTabs" && pending.tab) {
        navigation.navigate("CustomerStack", {
          screen: "CustomerTabs",
          params: {
            screen: pending.tab,
            params: pending.params || {}
          }
        });
      } else if (pending.params && Object.keys(pending.params).length > 0) {
        navigation.navigate(pending.screen, pending.params);
      } else {
        navigation.navigate(pending.screen);
      }
      return true;
    }
  } catch (err) {
    if (__DEV__) console.log("[DeepLink Gate] Failed to resume pending deep link:", err.message);
  }
  return false;
}

// =========================================================================
// 4. UNIVERSAL DEEP LINK DISPATCHER
// =========================================================================

/**
 * Handles incoming URL navigation with strict validation, referral preservation, and auth gating.
 */
export async function handleDeepLinkNavigation(url, navigation, isAuthenticated = false, role = "CUSTOMER") {
  if (!url || !navigation) return;

  try {
    const resolved = resolveDeepLink(url);

    if (!resolved.isValid) {
      if (__DEV__) console.log(`[DeepLink Dispatcher] Skipped invalid URL: ${url} (${resolved.error})`);
      return;
    }

    // Capture referral code into storage regardless of current auth status
    if (resolved.referralCode) {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_REFERRAL_CODE, resolved.referralCode);
        if (__DEV__) console.log(`[DeepLink Dispatcher] Captured referral code: ${resolved.referralCode}`);
      } catch (e) {}
    }

    // If resource requires authentication and user is logged out:
    if (resolved.requiresAuth && !isAuthenticated) {
      if (__DEV__) console.log(`[DeepLink Dispatcher] Target ${resolved.screen} requires auth. Redirecting to Login.`);
      await setPendingDeepLink(resolved);
      navigation.navigate("Login");
      return;
    }

    // Direct navigation to target
    if (resolved.screen === "CustomerTabs" && resolved.tab) {
      if (__DEV__) console.log(`[DeepLink Dispatcher] Navigating to Tab ${resolved.tab} with params:`, resolved.params);
      navigation.navigate("CustomerStack", {
        screen: "CustomerTabs",
        params: {
          screen: resolved.tab,
          params: resolved.params || {}
        }
      });
      return;
    }

    if (resolved.screen) {
      if (__DEV__) console.log(`[DeepLink Dispatcher] Navigating to ${resolved.screen} with params:`, resolved.params);
      if (resolved.params && Object.keys(resolved.params).length > 0) {
        navigation.navigate(resolved.screen, resolved.params);
      } else {
        navigation.navigate(resolved.screen);
      }
    }
  } catch (err) {
    console.error("[DeepLink Dispatcher] Unhandled navigation error:", err.message);
  }
}

// =========================================================================
// 5. NOTIFICATION INTEGRATION
// =========================================================================

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

  if (!type && data.type) type = data.type;
  if (type) type = type.toLowerCase();

  const normalizedRole = String(role || "").toLowerCase();
  const fallbackScreen = normalizedRole === "artist" ? "Notifications" : "NotificationCenter";

  if (type && !event) {
    if (type === "booking" || type.startsWith("booking_")) {
      if (type === "booking_created") event = "new_booking_request";
      else if (type === "booking_accepted") event = "booking_accepted";
      else if (type === "booking_rejected") event = "booking_rejected";
      else if (type === "booking_completed") event = "booking_completed";
      else if (type === "artist_on_the_way") event = "artist_on_the_way";
      else if (type === "artist_arrived") event = "artist_arrived";
      else event = normalizedRole === "artist" ? "new_booking_request" : "booking_confirmed";
    } else if (type === "payment" || type.startsWith("payment_")) {
      event = normalizedRole === "artist" ? "payment_received" : "payment_success";
    } else if (type === "wallet") {
      event = "wallet_credit";
    } else if (type === "review") {
      event = normalizedRole === "artist" ? "new_review" : "review_reminder";
    } else if (type === "chat" || type === "new_chat_message") {
      event = "new_message";
    }
  }

  const rawType = String(data?.type || notification?.type || "").toUpperCase();
  if (
    rawType.startsWith("SUPPORT_TICKET") ||
    rawType === "SUPPORT" ||
    String(notification?.title || "").toLowerCase().includes("support") ||
    String(notification?.message || notification?.body || "").toLowerCase().includes("support")
  ) {
    const tMatch = (String(notification?.title || "") + " " + String(notification?.message || notification?.body || "")).match(/#(\d+)/);
    const ticketId = data?.ticketId || data?.ticket_id || (tMatch ? parseInt(tMatch[1], 10) : null);
    if (ticketId) {
      return { screen: "SupportTicketDetails", params: { ticketId } };
    }
    return { screen: "Support" };
  }

  if (data?.bookingId || data?.booking_id || data?.id) {
    const resolvedBid = data.bookingId || data.booking_id || data.id;
    if (rawType.includes("ARRIVED") || rawType.includes("ON_THE_WAY") || event === "artist_on_the_way" || event === "artist_arrived") {
      return { screen: "LiveTracking", params: { id: resolvedBid } };
    }
    if (rawType.includes("COMPLETED") || event === "booking_completed") {
      return { screen: normalizedRole === "artist" ? "BookingDetails" : "ReviewSubmission", params: { id: resolvedBid } };
    }
    if (rawType.includes("CHAT") || event === "new_message") {
      return { screen: "ChatRoom", params: { bookingId: resolvedBid } };
    }
    return { screen: "BookingDetails", params: { id: resolvedBid } };
  }

  if (!type || !event) {
    const titleText = (notification?.title || "").toLowerCase();
    const msgText = (notification?.message || notification?.body || "").toLowerCase();
    const notifType = (notification?.type || "").toUpperCase();

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

    const bkMatch = msgText.match(/(BK-[0-9]+)/i) || titleText.match(/(BK-[0-9]+)/i);
    const numberMatch = msgText.match(/(?:booking|lead|refund|id|#)\s*:?\s*#?\s*([0-9]+)/i);

    if (bkMatch) {
      bookingId = bkMatch[1];
    } else if (numberMatch) {
      const resolvedNumId = numberMatch[1];
      if (type === "booking" || type === "chat" || type === "payment") bookingId = resolvedNumId;
      else if (type === "payment" && event.includes("refund")) refundId = resolvedNumId;
      else leadId = resolvedNumId;
    }
  }

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
    const bid = bookingId || data.bookingId || data.id || data.booking_id || "";
    const lid = leadId || data.leadId || data.id || "";
    const rid = refundId || data.refundId || data.id || "";
    if (!bid && !lid && !rid) {
      return { screen: normalizedRole === "artist" ? "Bookings" : "MyBookings" };
    }
    resolvedParams.id = resolvedParams.id.replace(":bookingId", bid);
    resolvedParams.id = resolvedParams.id.replace(":leadId", lid);
    resolvedParams.id = resolvedParams.id.replace(":refundId", rid);
  }
  if (resolvedParams.bookingId) {
    const bid = bookingId || data.bookingId || data.id || data.booking_id || "";
    if (!bid) {
      return { screen: normalizedRole === "artist" ? "Bookings" : "MyBookings" };
    }
    resolvedParams.bookingId = resolvedParams.bookingId.replace(":bookingId", bid);
  }

  return { screen: route.screen, params: resolvedParams };
}

export function handleNotificationNavigation(notification, navigation, role) {
  if (!notification || !navigation) return;

  try {
    const route = resolveNotificationRoute(notification, role);
    if (route && route.screen) {
      if (route.params) {
        navigation.navigate(route.screen, route.params);
      } else {
        navigation.navigate(route.screen);
      }
    } else {
      const normalizedRole = String(role || "").toLowerCase();
      navigation.navigate(normalizedRole === "artist" ? "Notifications" : "NotificationCenter");
    }
  } catch (err) {
    console.error("Centralized notification navigation failed:", err.message);
    const normalizedRole = String(role || "").toLowerCase();
    navigation.navigate(normalizedRole === "artist" ? "Notifications" : "NotificationCenter");
  }
}

// =========================================================================
// 6. REACT NAVIGATION LINKING CONFIG
// =========================================================================

export const linkingConfig = {
  prefixes: [
    "mehendigoo://",
    "mehndigo://",
    "exp+sonu-yadav://",
    "https://mehendigoo.com",
    "https://www.mehendigoo.com",
    "https://mehndigo.com",
    "https://www.mehndigo.com",
    "https://mehendigo.app",
    "https://www.mehendigo.app",
    "https://mehndigo.in",
    "https://www.mehndigo.in"
  ],
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
              Reels: "reel/:reelId",
              Wishlist: "wishlist",
              Bookings: "bookings",
              Wallet: "wallet",
              Profile: "profile",
            },
          },
          ArtistProfile: "artist/:artistId",
          Portfolio: "portfolio/:artistId",
          SelectService: "service/:serviceId",
          ArtistListing: "category/:categoryId",
          Categories: "categories",
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
          SupportTicketDetails: "support/:ticketId",
          Settings: "settings",
          ReferralDashboard: "invite",
          ChatRoom: "chat/:bookingId",
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
          ArtistProfile: "artist/profile-view/:artistId",
          PublicProfile: "artist/public/:artistId",
          BookingDetails: "artist/booking/:id",
          LeadDetails: "artist/lead/:id",
          Notifications: "artist/notifications",
          NotificationCenter: "artist/notifications-center",
          NotificationDetails: "artist/notification/:id",
          Wallet: "artist/my-wallet",
          Support: "artist/help-support",
          SupportTicketDetails: "artist/support/:ticketId",
          Settings: "artist/my-settings",
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

export default {
  Config,
  getPlayStoreFallbackUrl,
  createReelDeepLink,
  createServiceDeepLink,
  createArtistDeepLink,
  createPortfolioDeepLink,
  createBookingDeepLink,
  createTrackingDeepLink,
  createReviewDeepLink,
  createSupportDeepLink,
  createReferralDeepLink,
  createInviteDeepLink,
  createCategoryDeepLink,
  createSearchDeepLink,
  createCouponsDeepLink,
  createWalletDeepLink,
  resolveDeepLink,
  setPendingDeepLink,
  getPendingDeepLink,
  clearPendingDeepLink,
  consumePendingDeepLink,
  handleDeepLinkNavigation,
  resolveNotificationRoute,
  handleNotificationNavigation,
  linkingConfig
};
