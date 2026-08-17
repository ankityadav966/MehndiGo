// Centralized Support Categories for MehendiGo (Customer & Artist)

export const CUSTOMER_SUPPORT_CATEGORIES = [
  { id: "booking", label: "Booking Issue", icon: "calendar-outline", color: "#F7146B" },
  { id: "payment", label: "Payment Issue", icon: "card-outline", color: "#10B981" },
  { id: "refund", label: "Refund", icon: "cash-outline", color: "#3B82F6" },
  { id: "artist_related", label: "Artist Related", icon: "person-outline", color: "#8B5CF6" },
  { id: "cancellation", label: "Cancellation", icon: "close-circle-outline", color: "#EF4444" },
  { id: "rescheduling", label: "Rescheduling", icon: "time-outline", color: "#F59E0B" },
  { id: "account", label: "Account Issue", icon: "person-circle-outline", color: "#6366F1" },
  { id: "app_issue", label: "App Issue", icon: "phone-portrait-outline", color: "#64748B" },
  { id: "notification", label: "Notification Issue", icon: "notifications-outline", color: "#EC4899" },
  { id: "other", label: "Other", icon: "help-circle-outline", color: "#6B7280" },
];

export const ARTIST_SUPPORT_CATEGORIES = [
  { id: "booking", label: "Booking Issue", icon: "calendar-outline", color: "#F7146B" },
  { id: "settlement", label: "Payment / Settlement", icon: "cash-outline", color: "#10B981" },
  { id: "customer_related", label: "Customer Related", icon: "people-outline", color: "#8B5CF6" },
  { id: "wallet", label: "Wallet Issue", icon: "wallet-outline", color: "#3B82F6" },
  { id: "kyc", label: "KYC Issue", icon: "shield-checkmark-outline", color: "#F59E0B" },
  { id: "profile", label: "Profile Issue", icon: "person-circle-outline", color: "#6366F1" },
  { id: "portfolio", label: "Portfolio Issue", icon: "images-outline", color: "#EC4899" },
  { id: "availability", label: "Availability Issue", icon: "timer-outline", color: "#14B8A6" },
  { id: "app_issue", label: "App Issue", icon: "phone-portrait-outline", color: "#64748B" },
  { id: "notification", label: "Notification Issue", icon: "notifications-outline", color: "#A855F7" },
  { id: "other", label: "Other", icon: "help-circle-outline", color: "#6B7280" },
];

export const TICKET_PRIORITIES = [
  { value: "LOW", label: "Low", color: "#10B981", badgeBg: "#ECFDF5" },
  { value: "MEDIUM", label: "Medium", color: "#F59E0B", badgeBg: "#FFFBEB" },
  { value: "HIGH", label: "High", color: "#EF4444", badgeBg: "#FEF2F2" },
];

export const TICKET_STATUSES = {
  OPEN: { label: "Open", color: "#F59E0B", bg: "#FFFBEB", icon: "alert-circle-outline" },
  IN_PROGRESS: { label: "In Progress", color: "#3B82F6", bg: "#EFF6FF", icon: "sync-outline" },
  WAITING_FOR_USER: { label: "Waiting for User", color: "#8B5CF6", bg: "#F5F3FF", icon: "time-outline" },
  RESOLVED: { label: "Resolved", color: "#10B981", bg: "#ECFDF5", icon: "checkmark-circle-outline" },
  CLOSED: { label: "Closed", color: "#6B7280", bg: "#F3F4F6", icon: "lock-closed-outline" },
};

export const getCategoryListForRole = (role) => {
  const isArtist = String(role || "").toLowerCase().includes("artist");
  return isArtist ? ARTIST_SUPPORT_CATEGORIES : CUSTOMER_SUPPORT_CATEGORIES;
};

export default {
  CUSTOMER_SUPPORT_CATEGORIES,
  ARTIST_SUPPORT_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  getCategoryListForRole
};
