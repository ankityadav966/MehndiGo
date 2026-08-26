import apiRequest from "./api";

export const adminService = {
  // Withdrawals & Payouts
  getWithdrawals: async (status = "all") => {
    const query = status && status !== "all" ? `?status=${status}` : "";
    const res = await apiRequest("GET", `/admin/withdrawals${query}`, null, true);
    return res?.data || res || [];
  },

  approveWithdrawal: async (id, payoutData = {}) => {
    const res = await apiRequest("POST", `/admin/withdrawals/${id}/approve`, payoutData, true);
    return res?.data || res;
  },

  rejectWithdrawal: async (id, reason = "") => {
    const res = await apiRequest("POST", `/admin/withdrawals/${id}/reject`, { reason }, true);
    return res?.data || res;
  },

  // Stats & Ledger
  getStats: async () => {
    const res = await apiRequest("GET", "/admin/wallet", null, true);
    return res?.data || res;
  },

  getPayments: async () => {
    const res = await apiRequest("GET", "/admin/wallet", null, true);
    return res?.data?.ledger || res?.ledger || [];
  },

  // Artists Verification & Directory
  getPendingArtists: async () => {
    const res = await apiRequest("GET", "/admin/pending-artists", null, true);
    return res?.data || res || [];
  },

  approveArtist: async (id) => {
    const res = await apiRequest("PUT", `/admin/artists/${id}/approve`, {}, true);
    return res?.data || res;
  },

  rejectArtist: async (id, reason) => {
    const res = await apiRequest("PUT", `/admin/artists/${id}/reject`, { reason }, true);
    return res?.data || res;
  },

  getArtists: async () => {
    const res = await apiRequest("GET", "/admin/artists", null, true);
    return res?.data || res || [];
  },

  // Users & Bookings & Chats
  getUsers: async () => {
    const res = await apiRequest("GET", "/admin/users", null, true);
    return res?.data || res || [];
  },

  getBookings: async () => {
    const res = await apiRequest("GET", "/admin/bookings", null, true);
    return res?.data || res || [];
  },

  getChats: async () => {
    const res = await apiRequest("GET", "/admin/chats", null, true);
    return res?.data || res || [];
  },

  getNotifications: async () => {
    const res = await apiRequest("GET", "/admin/notifications", null, true);
    return res?.data || res || [];
  },

  sendSystemNotification: async (data) => {
    const res = await apiRequest("POST", "/admin/notifications/broadcast", data, true);
    return res?.data || res;
  }
};

export default adminService;
