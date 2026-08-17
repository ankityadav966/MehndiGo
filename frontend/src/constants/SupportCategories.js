// Centralized Support Categories for Admin Frontend

export const CUSTOMER_SUPPORT_CATEGORIES = [
  "Booking Issue",
  "Payment Issue",
  "Refund",
  "Artist Related",
  "Cancellation",
  "Rescheduling",
  "Account Issue",
  "App Issue",
  "Notification Issue",
  "Other"
];

export const ARTIST_SUPPORT_CATEGORIES = [
  "Booking Issue",
  "Payment / Settlement",
  "Customer Related",
  "Wallet Issue",
  "KYC Issue",
  "Profile Issue",
  "Portfolio Issue",
  "Availability Issue",
  "App Issue",
  "Notification Issue",
  "Other"
];

export const ALL_SUPPORT_CATEGORIES = Array.from(new Set([
  ...CUSTOMER_SUPPORT_CATEGORIES,
  ...ARTIST_SUPPORT_CATEGORIES
]));

export const TICKET_PRIORITY_META = {
  LOW: { label: "Low", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  MEDIUM: { label: "Medium", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  HIGH: { label: "High", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" }
};

export const TICKET_STATUS_META = {
  OPEN: { label: "Open", color: "#D97706", bg: "#FEF3C7", border: "#FCD34D", dot: "#F59E0B" },
  IN_PROGRESS: { label: "In Progress", color: "#2563EB", bg: "#DBEAFE", border: "#BFDBFE", dot: "#3B82F6" },
  WAITING_FOR_USER: { label: "Waiting for User", color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE", dot: "#8B5CF6" },
  RESOLVED: { label: "Resolved", color: "#059669", bg: "#D1FAE5", border: "#A7F3D0", dot: "#10B981" },
  CLOSED: { label: "Closed", color: "#4B5563", bg: "#F3F4F6", border: "#E5E7EB", dot: "#6B7280" }
};

export default {
  CUSTOMER_SUPPORT_CATEGORIES,
  ARTIST_SUPPORT_CATEGORIES,
  ALL_SUPPORT_CATEGORIES,
  TICKET_PRIORITY_META,
  TICKET_STATUS_META
};
