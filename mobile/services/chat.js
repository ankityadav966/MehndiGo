import apiRequest, { BASE_URL } from "./api";

// Fetch chat room listings for active bookings
export async function getChatList() {
  const res = await apiRequest("GET", "/chat/list", null, true);
  return res?.data || res;
}

// Fetch historical messages of a specific booking chat
export async function getChatHistory(bookingId, limit = 50, offset = 0) {
  const res = await apiRequest("GET", `/chat/${bookingId}?limit=${limit}&offset=${offset}`, null, true);
  return res?.data || res;
}

// Edit a chat message (within 15 minutes)
export async function editMessage(messageId, message) {
  const res = await apiRequest("PUT", "/chat/message/edit", { messageId, message }, true);
  return res?.data || res;
}

// Delete message (for me or everyone)
export async function deleteMessage(messageId, deleteType = "me") {
  const res = await apiRequest("DELETE", `/chat/message/${messageId}`, { delete_type: deleteType }, true);
  return res?.data || res;
}

// Upload file to Cloudinary via REST API
export async function uploadChatMedia(fileUri, fileType, fileName) {
  let cleanUri = fileUri || "";
  if (cleanUri.startsWith("/")) {
    cleanUri = `file://${cleanUri}`;
  }

  let type = "image/jpeg";
  if (fileType === "video") type = "video/mp4";
  else if (fileType === "pdf") type = "application/pdf";
  else if (fileType === "voice") type = "audio/m4a";

  const url = `${BASE_URL}/mehndigo/chat/upload`;
  console.log(`[API REQUEST] POST (FormData) -> ${url}`);

  const token = await require("../utils/storage").secureStorage.getAccessToken();

  const formData = new FormData();
  formData.append("file", {
    uri: cleanUri,
    name: fileName || `file_${Date.now()}.${type.split("/")[1] || "jpg"}`,
    type: type
  });

  const response = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  let responseData;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    responseData = await response.json();
  } else {
    const text = await response.text();
    try { responseData = JSON.parse(text); } catch { responseData = { message: text }; }
  }

  if (!response.ok) {
    throw new Error(responseData?.message || `Upload failed with status ${response.status}`);
  }

  return responseData?.data || responseData;
}

// Fetch media history attachments
export async function getMediaHistory(bookingId) {
  const res = await apiRequest("GET", `/chat/media?bookingId=${bookingId}`, null, true);
  return res?.data || res;
}

// Report a chat user
export async function reportUser(bookingId, reportedId, reason) {
  const res = await apiRequest("POST", "/chat/report", { bookingId, reportedId, reason }, true);
  return res?.data || res;
}

// Block/Unblock a user
export async function blockUser(blockedId) {
  const res = await apiRequest("POST", "/chat/block", { blockedId }, true);
  return res?.data || res;
}

// Pin/Archive a room preference
export async function pinOrArchiveRoom(bookingId, action, value) {
  const res = await apiRequest("PUT", "/chat/room/pin-archive", { bookingId, action, value }, true);
  return res?.data || res;
}
