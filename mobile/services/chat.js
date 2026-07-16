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
  const { File, Paths } = require("expo-file-system");
  const name = fileName || fileUri.split("/").pop();
  let type = "image/jpeg";
  if (fileType === "video") type = "video/mp4";
  else if (fileType === "pdf") type = "application/pdf";
  else if (fileType === "voice") type = "audio/m4a";

  let finalUri = fileUri;
  const tempName = `upload_${Date.now()}_${name}`;

  let destFile = null;
  try {
    const srcFile = new File(fileUri);
    destFile = new File(Paths.cache, tempName);
    await srcFile.copy(destFile.uri);
    finalUri = destFile.uri;
    console.log("[FileSystem] Successfully copied file to readable local path using SDK 56 File API:", finalUri);
  } catch (err) {
    console.warn("[FileSystem] Copy failed, attempting direct upload of original URI:", err.message);
  }

  const url = `${BASE_URL}/mehndigo/chat/upload`;
  const token = await require("../utils/storage").secureStorage.getAccessToken();

  const formData = new FormData();
  formData.append("file", {
    uri: finalUri,
    type: type,
    name: name
  });

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  } finally {
    try {
      if (destFile && finalUri !== fileUri) {
        await destFile.delete();
        console.log("[FileSystem] Cleaned up temporary copied file using SDK 56 File API:", finalUri);
      }
    } catch (cleanErr) {
      console.warn("[FileSystem] Failed to clean up temp file:", cleanErr.message);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    let parsedError;
    try {
      parsedError = JSON.parse(errorText);
    } catch {
      parsedError = { message: errorText };
    }
    throw new Error(parsedError?.message || `Upload failed with status ${response.status}`);
  }

  const data = await response.json();
  return data?.data || data;
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
