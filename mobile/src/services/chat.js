import apiRequest, { BASE_URL, getNormalizedUrl } from "./api";

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
  const getSafeUri = (uri) => {
    if (!uri) return uri;
    let cleanUri = uri;
    if (cleanUri.startsWith("/")) {
      cleanUri = `file://${cleanUri}`;
    }
    return cleanUri;
  };

  let type = "image/jpeg";
  if (fileType === "video") type = "video/mp4";
  else if (fileType === "pdf") type = "application/pdf";
  else if (fileType === "voice") type = "audio/m4a";

  const finalUri = getSafeUri(fileUri);
  const url = getNormalizedUrl("/api/v1/mehndigo/chat/upload");
  const token = await require("../utils/storage").secureStorage.getAccessToken();

  const FileSystem = require("expo-file-system/legacy");
  const response = await FileSystem.uploadAsync(url, finalUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    mimeType: type,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const responseData = JSON.parse(response.body);

  if (response.status < 200 || response.status >= 300) {
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
