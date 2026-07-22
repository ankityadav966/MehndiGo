import apiRequest from "./api";

// Fetch paginated notification history logs
export async function getNotificationHistory(page = 1, limit = 20) {
  const res = await apiRequest("GET", `/notification/history?page=${page}&limit=${limit}`, null, true);
  return res?.data || res;
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
