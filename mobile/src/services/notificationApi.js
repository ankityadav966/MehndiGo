import apiRequest from "./api";

// Fetch paginated notification history logs
export async function getNotificationHistory(page = 1, limit = 50) {
  const res = await apiRequest("GET", `/notification/history?page=${page}&limit=${limit}`, null, true);
  const payload = res?.data || res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

// Fetch unread notification count
export async function getUnreadNotificationCount() {
  try {
    const res = await apiRequest("GET", "/notifications/unread-count", null, true);
    return res?.data?.count || res?.data?.unread_count || res?.count || 0;
  } catch (err) {
    console.log("Error fetching unread notification count:", err.message);
    return 0;
  }
}

// Mark single notification as read/seen
export async function markNotificationAsRead(id) {
  const res = await apiRequest("PUT", "/notification/read", { id }, true);
  return res?.data || res;
}

// Mark all user notifications as read
export async function markAllNotificationsAsRead() {
  const res = await apiRequest("PUT", "/notification/read-all", null, true);
  return res?.data || res;
}

// Delete an individual notification
export async function deleteNotification(id) {
  const res = await apiRequest("DELETE", `/notification/${id}`, null, true);
  return res?.data || res;
}

// Clear all notification history for the current user
export async function clearAllNotifications() {
  const res = await apiRequest("DELETE", "/notification/clear-all", null, true);
  return res?.data || res;
}
