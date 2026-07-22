import apiRequest, { BASE_URL, getNormalizedUrl } from "./api";
import { secureStorage } from "../utils/storage";

async function getUploadBlob(uri, mimeType) {
  try {
    const response = await fetch(uri);
    const originalBlob = await response.blob();
    return new Blob([originalBlob], { type: mimeType });
  } catch (err) {
    console.error("[getUploadBlob] Failed to fetch or convert URI to Blob:", uri, err);
    throw new Error(`Failed to read local media file: ${err.message}`);
  }
}

export async function getArtistDetails() {
  const data = await apiRequest("GET", "/api/v1/mehndigo/artist/artistdetails", null, true);
  return data?.data || data;
}

export async function createArtistProfile(profileData) {
  const formData = new FormData();

  const isLocalUri = (val) => {
    if (!val) return false;
    if (typeof val === "string") {
      return (
        val.startsWith("file://") ||
        val.startsWith("content://") ||
        val.startsWith("ph://") ||
        val.startsWith("assets-library://") ||
        val.startsWith("data:") ||
        val.startsWith("/")
      );
    }
    if (typeof val === "object" && typeof val.uri === "string") {
      return true;
    }
    return false;
  };

  const getSafeUri = (val) => {
    let uri = "";
    if (typeof val === "string") uri = val;
    else if (typeof val === "object" && val !== null) uri = val.uri;

    if (uri.startsWith("/")) {
      return `file://${uri}`;
    }
    return uri;
  };

  for (const [key, value] of Object.entries(profileData)) {
    if (value === null || value === undefined) continue;

    if (isLocalUri(value)) {
      const uri = getSafeUri(value);
      const blob = await getUploadBlob(uri, "image/jpeg");
      formData.append(key, blob, `${key}_${Date.now()}.jpg`);
    } else if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }

  const token = await secureStorage.getAccessToken();
  console.log("createArtistProfile FormData parts:", formData._parts);
  const response = await fetch(getNormalizedUrl("/api/v1/mehndigo/artist/profile"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  let data;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }

  if (!response.ok) {
    const err = new Error(data?.message || data?.error || response.statusText || "Something went wrong");
    err.response = { data, status: response.status, statusText: response.statusText };
    throw err;
  }

  return data?.data || data;
}

// Portfolio Management Methods
export async function getArtistPortfolio() {
  const data = await apiRequest("GET", "/api/v1/mehndigo/artist/portfolio", null, true);
  return data?.data || data;
}

export async function getPortfolioItemById(id) {
  const data = await apiRequest("GET", `/api/v1/mehndigo/artist/portfolio/${id}`, null, true);
  return data?.data || data;
}

async function uploadDirectToCloudinary(localUri, mimeType, isVideo, onProgress) {
  try {
    const sigRes = await apiRequest("GET", "/api/v1/mehndigo/artist/portfolio/upload-signature", null, true);
    const { signature, timestamp, folder, api_key, cloud_name } = sigRes.data || sigRes;

    const resourceType = isVideo ? "video" : "image";
    const url = `https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`;

    const FileSystem = require("expo-file-system/legacy");

    const uploadOptions = {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType: mimeType,
      parameters: {
        signature: signature,
        timestamp: String(timestamp),
        api_key: api_key,
        folder: folder
      }
    };

    if (onProgress) {
      const uploadTask = FileSystem.createUploadTask(
        url,
        localUri,
        uploadOptions,
        (data) => {
          if (data.totalBytesExpectedToSend && data.totalBytesExpectedToSend > 0) {
            const progress = data.totalBytesSent / data.totalBytesExpectedToSend;
            onProgress(progress);
          }
        }
      );
      const result = await uploadTask.uploadAsync();
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Cloudinary direct upload failed with status ${result.status}: ${result.body}`);
      }
      const responseData = JSON.parse(result.body);
      return responseData.secure_url;
    } else {
      const response = await FileSystem.uploadAsync(url, localUri, uploadOptions);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Cloudinary direct upload failed with status ${response.status}: ${response.body}`);
      }
      const responseData = JSON.parse(response.body);
      return responseData.secure_url;
    }
  } catch (error) {
    console.error("[uploadDirectToCloudinary] Error:", error);
    throw error;
  }
}

async function uploadToServerMultipart(localUri, mimeType) {
  try {
    const { getNormalizedUrl } = require("./api");
    const { secureStorage } = require("../utils/storage");
    const FileSystem = require("expo-file-system/legacy");

    const endpoint = getNormalizedUrl("/api/v1/mehndigo/artist/portfolio/upload");
    const token = await secureStorage.getAccessToken();

    let cleanUri = localUri;
    if (cleanUri.startsWith("/")) {
      cleanUri = `file://${cleanUri}`;
    }

    const response = await FileSystem.uploadAsync(endpoint, cleanUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "media",
      mimeType: mimeType || "image/jpeg",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Server file upload failed with status ${response.status}: ${response.body}`);
    }

    const responseData = JSON.parse(response.body);
    const uploadedUrl = responseData?.data?.[0]?.url;
    if (!uploadedUrl) {
      throw new Error("No media URL returned from server upload");
    }
    return uploadedUrl;
  } catch (err) {
    console.error("[uploadToServerMultipart] Error:", err);
    throw err;
  }
}

async function uploadMediaWithFallback(localUri, mimeType, isVideo, onProgress) {
  try {
    return await uploadDirectToCloudinary(localUri, mimeType, isVideo, onProgress);
  } catch (err) {
    console.warn("[uploadMediaWithFallback] Direct Cloudinary upload failed, using backend server fallback:", err.message);
    return await uploadToServerMultipart(localUri, mimeType);
  }
}

export async function createPortfolioItem(itemData, onProgress) {
  const getSafeUri = (uri) => {
    if (!uri) return uri;
    let cleanUri = uri;
    if (cleanUri.startsWith("/")) {
      cleanUri = `file://${cleanUri}`;
    }
    return cleanUri;
  };

  const isLocal = (url) => url && (url.startsWith("file://") || url.startsWith("content://") || url.startsWith("/"));

  let imageUrl = itemData.image_url;
  let videoUrl = itemData.video_url;

  try {
    // 1. Upload Video if it is local
    if (videoUrl && isLocal(videoUrl)) {
      const videoUri = getSafeUri(videoUrl);
      if (onProgress) onProgress(0.01);
      videoUrl = await uploadMediaWithFallback(
        videoUri,
        "video/mp4",
        true,
        (progress) => {
          if (onProgress) onProgress(0.01 + progress * 0.79);
        }
      );
    }

    // 2. Upload Image if it is local
    if (imageUrl && isLocal(imageUrl)) {
      const imageUri = getSafeUri(imageUrl);
      imageUrl = await uploadMediaWithFallback(
        imageUri,
        "image/jpeg",
        false,
        (progress) => {
          if (!videoUrl && onProgress) {
            onProgress(0.01 + progress * 0.79);
          }
        }
      );
    }

    if (onProgress) onProgress(0.9);

    const finalItemData = {
      ...itemData,
      image_url: imageUrl,
      video_url: videoUrl
    };

    if (onProgress) onProgress(0.95);
    const data = await apiRequest("POST", "/api/v1/mehndigo/artist/portfolio", finalItemData, true);
    if (onProgress) onProgress(1.0);
    return data?.data || data;
  } catch (err) {
    console.error("[createPortfolioItem] Error:", err);
    throw err;
  }
}

export async function updatePortfolioItem(id, updateData) {
  const data = await apiRequest("PUT", `/api/v1/mehndigo/artist/portfolio/${id}`, updateData, true);
  return data?.data || data;
}

export async function deletePortfolioItem(id) {
  const data = await apiRequest("DELETE", `/api/v1/mehndigo/artist/portfolio/${id}`, null, true);
  return data?.data || data;
}

export async function uploadPortfolioMedia(mediaFiles, onProgress) {
  const results = [];

  const getSafeUri = (uri) => {
    if (!uri) return uri;
    let cleanUri = uri;
    if (cleanUri.startsWith("/")) {
      cleanUri = `file://${cleanUri}`;
    }
    return cleanUri;
  };

  const isLocal = (url) => url && (url.startsWith("file://") || url.startsWith("content://") || url.startsWith("/"));

  for (let index = 0; index < mediaFiles.length; index++) {
    const file = mediaFiles[index];
    const uri = typeof file === "string" ? file : file?.uri;
    if (!uri) continue;

    let type = "image/jpeg";
    const isVideo = uri.endsWith(".mp4") || uri.endsWith(".mov") || file?.type?.startsWith("video");
    if (isVideo) {
      type = "video/mp4";
    }

    if (isLocal(uri)) {
      const finalUri = getSafeUri(uri);
      const secureUrl = await uploadMediaWithFallback(
        finalUri,
        type,
        isVideo,
        (progress) => {
          if (onProgress) {
            const totalProgress = (index + progress) / mediaFiles.length;
            onProgress(totalProgress);
          }
        }
      );

      results.push({ url: secureUrl, type: isVideo ? "video" : "image" });
    } else {
      results.push({ url: uri, type: isVideo ? "video" : "image" });
    }
  }

  return results;
}


export async function getArtistDashboardData() {
  const res = await apiRequest("GET", "/artist/dashboard", null, true);
  return res?.data || res;
}

export async function getArtistBookingsData() {
  const res = await apiRequest("GET", "/artist/bookings", null, true);
  return res?.data || res;
}

export async function getArtistEarningsData() {
  const res = await apiRequest("GET", "/artist/earnings", null, true);
  return res?.data || res;
}

export async function getArtistWalletData() {
  const res = await apiRequest("GET", "/artist/wallet", null, true);
  return res?.data || res;
}

export async function getArtistReviewsData() {
  const res = await apiRequest("GET", "/artist/reviews", null, true);
  return res?.data || res;
}

export async function getArtistAnalyticsData() {
  const res = await apiRequest("GET", "/artist/analytics", null, true);
  return res?.data || res;
}

export async function getArtistProfileData() {
  const res = await apiRequest("GET", "/artist/profile", null, true);
  return res?.data || res;
}

export async function updateArtistProfileDetails(profileData) {
  const res = await apiRequest("PUT", "/artist/profile", profileData, true);
  return res?.data || res;
}

export async function getArtistNotificationsData() {
  const res = await apiRequest("GET", "/artist/notifications", null, true);
  return res?.data || res;
}

export async function getArtistServices() {
  const res = await apiRequest("GET", "/artist/services", null, true);
  return res?.data || res;
}

export async function getArtistServiceById(id) {
  const res = await apiRequest("GET", `/artist/services/${id}`, null, true);
  return res?.data || res;
}

export async function createArtistService(serviceData) {
  const res = await apiRequest("POST", "/artist/services", serviceData, true);
  return res?.data || res;
}

export async function updateArtistService(id, serviceData) {
  const res = await apiRequest("PUT", `/artist/services/${id}`, serviceData, true);
  return res?.data || res;
}

export async function deleteArtistService(id) {
  const res = await apiRequest("DELETE", `/artist/services/${id}`, null, true);
  return res?.data || res;
}

export async function updateArtistServiceStatus(id, isActive) {
  const res = await apiRequest("PUT", "/artist/services/status", { id, is_active: isActive }, true);
  return res?.data || res;
}

export async function uploadServiceMedia(id, imageUrl) {
  const res = await apiRequest("POST", "/artist/services/media", { id, image_url: imageUrl }, true);
  return res?.data || res;
}

export async function deleteServiceMedia(id) {
  const res = await apiRequest("DELETE", "/artist/services/media", { id }, true);
  return res?.data || res;
}

export async function getCustomerServices() {
  const res = await apiRequest("GET", "/customer/services", null, true);
  return res?.data || res;
}

export async function getCustomerServiceDetail(id) {
  const res = await apiRequest("GET", `/customer/service/${id}`, null, true);
  return res?.data || res;
}
