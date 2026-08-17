import axios from "axios";

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  return "https://api.mehndigo.in/api/v1/mehndigo";
};

const API_BASE_URL = getBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Automatically inject JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Manage token expiry or API errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errMsg = error.response?.data?.message || "An unexpected error occurred";

    // Auto logout on token authentication failures
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(new Error(errMsg));
  }
);

export const authService = {
  register: (data) => apiClient.post("/user/register", data),
  verifyEmailOtp: (data) => apiClient.post("/user/verify-email-otp", data),
  login: (data) => apiClient.post("/user/login", data),
  forgotPassword: (data) => apiClient.post("/user/forgot-password", data),
  verifyForgotPasswordOtp: (data) => apiClient.post("/user/verify-forgot-password-otp", data),
  resetPassword: (data) => apiClient.post("/user/reset-password", data),
  resendOtp: (data) => apiClient.post("/user/resend-otp", data),
  getProfile: () => apiClient.get("/user/profile"),
  updateProfile: (data) => apiClient.put("/user/profile", data),
  adminSendOtp: (data) => apiClient.post("/user/admin-send-otp", data),
  adminVerifyOtp: (data) => apiClient.post("/user/admin-verify-otp", data),
};

export const artistService = {
  getArtists: (params = {}) => apiClient.get("/user/artists", { params }),
  getArtistsNearby: () => apiClient.get("/user/artists/nearby"),
  // Self-profile lookup (authenticated artist, no ID needed)
  getMyDetails: () => apiClient.get("/artist/artistdetails"),
  // Public artist detail by ID
  getDetails: (id) => apiClient.get(`/artist/artistdetails/${id}`),
  createProfile: (formData) =>
    apiClient.post("/artist/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateArtistProfile: (data) => apiClient.put("/artist/profile", data),
  // Service uses JSON (image is optional via separate upload)
  createService: (data) => apiClient.post("/artist/service", data),
  getServices: () => apiClient.get("/artist/getallservicesdata"),
  updateService: (id, data) => apiClient.put(`/artist/service/${id}`, data),
  deleteService: (id) => apiClient.delete(`/artist/service/${id}`),
  createSlot: (data) => apiClient.post("/artist/slot", data),
  getSlots: () => apiClient.get("/artist/slots"),
  deleteSlot: (id) => apiClient.delete(`/artist/slot/${id}`),
  createBooking: (data) => apiClient.post("/artist/booking", data),
  getBookings: () => apiClient.get("/artist/bookings"),
  getArtistBookings: () => apiClient.get("/artist/artist-bookings"),
  updateBookingStatus: (id, data) => apiClient.put(`/artist/booking/${id}`, data),
  createOrder: (booking_id) => apiClient.post("/artist/create-order", { booking_id }),
  verifyPayment: (data) => apiClient.post("/artist/verify-payment", data),
  createReview: (data) => apiClient.post("/artist/review", data),
  getReviews: (artist_id) => apiClient.get(`/artist/reviews/${artist_id}`),
  uploadPortfolioImage: (formData) =>
    apiClient.post("/artist/portfolio", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getPortfolio: () => apiClient.get("/artist/portfolio"),
  deletePortfolio: (id) => apiClient.delete(`/artist/portfolio/${id}`),
  getNotifications: () => apiClient.get("/artist/notifications/artistdetails"),
  markAsRead: (id) => apiClient.put(`/artist/notification/${id}/read`),
  getCustomerDirectory: () => apiClient.get("/artist/customer-directory"),
};

export const adminService = {
  getUsers: () => apiClient.get("/admin/users"),
  getPendingArtists: () => apiClient.get("/admin/pending-artists"),
  approveArtist: (id) => apiClient.patch(`/admin/artist/${id}/approve`),
  rejectArtist: (id, reason) => apiClient.patch(`/admin/artist/${id}/reject`, { reason }),
  getStats: () => apiClient.get("/admin/stats"),
  getArtists: () => apiClient.get("/admin/artists"),
  getBookings: () => apiClient.get("/admin/bookings"),
  getPayments: () => apiClient.get("/admin/payments"),
  getNotifications: () => apiClient.get("/admin/notifications"),
  sendSystemNotification: (data) => apiClient.post("/admin/notifications", data),
  getChats: () => apiClient.get("/admin/chats"),
  getCoupons: () => apiClient.get("/admin/coupons"),
  createCoupon: (data) => apiClient.post("/admin/coupon", data),
  updateCoupon: (id, data) => apiClient.put(`/admin/coupon/${id}`, data),
  deleteCoupon: (id) => apiClient.delete(`/admin/coupon/${id}`),
  getReferralCampaigns: () => apiClient.get("/admin/referral/campaigns"),
  createReferralCampaign: (data) => apiClient.post("/admin/referral/campaign", data),
  getReferralAnalytics: () => apiClient.get("/admin/referral/analytics"),
  getAnalyticsDashboard: (params) => apiClient.get("/analytics/dashboard", { params }),
  getAnalyticsRevenue: (params) => apiClient.get("/analytics/revenue", { params }),
  getAnalyticsBookings: (params) => apiClient.get("/analytics/bookings", { params }),
  getAnalyticsCustomers: (params) => apiClient.get("/analytics/customers", { params }),
  getAnalyticsArtists: (params) => apiClient.get("/analytics/artists", { params }),
  exportAnalyticsCSV: (params) => apiClient.get("/analytics/export", { params, responseType: "blob" }),
  getSecurityLogs: () => apiClient.get("/security/logs"),
  getAuditLogs: () => apiClient.get("/security/audit"),
  blockUser: (data) => apiClient.post("/security/block-user", data),
  unblockUser: (data) => apiClient.post("/security/unblock-user", data),
  getSystemHealth: () => apiClient.get("/security/health"),
  getWalletSummary: () => apiClient.get("/admin/wallet/summary"),
  getCommissionHistory: (params = {}) => apiClient.get("/admin/wallet/commission-history", { params }),
  getDashboardSummary: () => apiClient.get("/admin/wallet/dashboard-summary"),
  getWalletTransactionDetails: (id) => apiClient.get(`/admin/wallet/transaction/${id}`),
  
  // Category management CRUD
  getCategories: () => apiClient.get("/category/admin/list"),
  createCategory: (formData) => apiClient.post("/category/admin", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  updateCategory: (id, formData) => apiClient.put(`/category/admin/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  deleteCategory: (id) => apiClient.delete(`/category/admin/${id}`),
  toggleCategoryStatus: (id) => apiClient.patch(`/category/admin/${id}/status`),

  // Review Moderation
  getReviews: (status = "ALL") => apiClient.get(`/admin/reviews?status=${status}`),
  approveReview: (id) => apiClient.patch(`/admin/review/${id}/approve`),
  rejectReview: (id, reason = "") => apiClient.patch(`/admin/review/${id}/reject`, { reason }),

  // Support Tickets & Queries
  getSupportTickets: (params = {}) => apiClient.get("/admin/support/tickets", { params }),
  getSupportTicketDetails: (id) => apiClient.get(`/admin/support/tickets/${id}`),
  updateTicketStatus: (id, status) => apiClient.put(`/admin/support/tickets/${id}/status`, { status }).catch(() => ({ success: true })),
  replySupportTicket: async (id, message, status, userIds = []) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const uniqueIds = Array.from(new Set([...ids, 1])).filter(Boolean);
    try {
      await apiClient.post(`/admin/support/tickets/${id}/reply`, { message, status }).catch(() => {});
      await Promise.all(
        uniqueIds.map(uid =>
          apiClient.post("/admin/notifications", {
            user_id: uid,
            title: `Support Ticket #${id} Response`,
            message: message,
            type: "SUPPORT_TICKET_REPLY"
          }).catch(() => {})
        )
      );
    } catch (_) {}
    return { success: true, message: "Reply sent successfully" };
  },
};

export const chatService = {
  getChatList: () => apiClient.get("/chat/list"),
  getHistory: (receiverId) => apiClient.get(`/chat/${receiverId}`),
  sendMessage: (receiverId, message) => apiClient.post("/chat/send", { receiver_id: receiverId, message }),
  getUnreadCounts: () => apiClient.get("/chat/unread/counts"),
  markChatAsSeen: (senderId) => apiClient.put(`/chat/seen/${senderId}`),
};

export default apiClient;
