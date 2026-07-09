export const COLORS = {
  primary: "#E91E63",
  primaryLight: "#F8BBD0",
  primaryDark: "#C2185B",
  background: "#FFF8FA",
  surface: "#FFFFFF",
  text: "#111111",
  textSecondary: "#666666",
  textTertiary: "#999999",
  border: "#EEEEEE",
  borderLight: "#F0F0F0",
  success: "#16A34A",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0, 0, 0, 0.5)",
  shadow: "rgba(0, 0, 0, 0.08)",
};

export const FONTS = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 26,
    title: 20,
    heading: 24,
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 30,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  round: 20,
  full: 999,
};

export const SHADOWS = {
  small: {
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  medium: {
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  large: {
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
};

export const ROLES = {
  CUSTOMER: "customer",
  ARTIST: "artist",
};

export const BOOKING_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
};

export const KYC_STATUS = {
  NOT_SUBMITTED: "not_submitted",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const NOTIFICATION_TYPES = {
  BOOKING: "booking",
  PAYMENT: "payment",
  WALLET: "wallet",
  REVIEW: "review",
  PROFILE: "profile",
  PROMO: "promo",
  REMINDER: "reminder",
  SYSTEM: "system",
};
