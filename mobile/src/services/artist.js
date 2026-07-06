import apiRequest, { getNormalizedUrl } from "./api";
import { secureStorage } from "../utils/storage";

export async function getArtistDetails() {
  const data = await apiRequest("GET", "/api/v1/mehndigo/artist/artistdetails", null, true);
  return data?.data || data;
}

function uriToBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      reject(new Error("uriToBlob failed: " + (e?.message || "unknown")));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
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
        val.startsWith("data:")
      );
    }
    if (typeof val === "object" && typeof val.uri === "string") {
      return true;
    }
    return false;
  };

  const getUriString = (val) => {
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) return val.uri;
    return "";
  };

  for (const [key, value] of Object.entries(profileData)) {
    if (value === null || value === undefined) continue;

    if (isLocalUri(value)) {
      const uri = getUriString(value);
      try {
        const blob = await uriToBlob(uri);
        formData.append(key, blob, `${key}_${Date.now()}.jpg`);
      } catch (err) {
        console.log("Failed to convert URI to Blob:", uri, err);
        formData.append(key, {
          uri,
          type: "image/jpeg",
          name: `${key}_${Date.now()}.jpg`,
        });
      }
    } else if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }

  const token = await secureStorage.getAccessToken();
  console.log("createArtistProfile FormData parts:", formData._parts);
  const url = getNormalizedUrl("/api/v1/mehndigo/artist/profile");
  console.log(`[API REQUEST] POST (fetch) -> ${url}`);
  const response = await fetch(url, {
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

export async function createPortfolioItem(itemData) {
  const isLocal = (val) => {
    if (!val) return false;
    return (
      val.startsWith("file://") ||
      val.startsWith("content://") ||
      val.startsWith("ph://") ||
      val.startsWith("assets-library://")
    );
  };

  const hasLocalMedia = (itemData.image_url && isLocal(itemData.image_url)) || (itemData.video_url && isLocal(itemData.video_url));

  if (hasLocalMedia) {
    const FileSystem = require("expo-file-system");
    const { UploadType } = require("expo-file-system");
    const isVideo = itemData.video_url && isLocal(itemData.video_url);
    const mediaUri = isVideo ? itemData.video_url : itemData.image_url;
    
    const params = {};
    Object.entries(itemData).forEach(([key, value]) => {
      const shouldExclude = key === "video_url" || (key === "image_url" && isLocal(value));
      if (!shouldExclude && value !== undefined && value !== null) {
        params[key] = String(value);
      }
    });

    const token = await secureStorage.getAccessToken();
    const url = getNormalizedUrl("/api/v1/mehndigo/artist/portfolio");
    console.log(`[API REQUEST] POST (uploadAsync) -> ${url}`);
    const response = await FileSystem.uploadAsync(
      url,
      mediaUri,
      {
        fieldName: "portfolio_image",
        httpMethod: "POST",
        uploadType: UploadType.MULTIPART,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        parameters: params,
        mimeType: isVideo ? "video/mp4" : "image/jpeg"
      }
    );

    let data;
    try {
      data = JSON.parse(response.body);
    } catch {
      data = { message: response.body };
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(data?.message || "Failed to create portfolio item");
    }
    return data?.data || data;
  } else {
    const data = await apiRequest("POST", "/api/v1/mehndigo/artist/portfolio", itemData, true);
    return data?.data || data;
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

export async function uploadPortfolioMedia(mediaFiles) {
  const FileSystem = require("expo-file-system");
  const { UploadType } = require("expo-file-system");
  const token = await secureStorage.getAccessToken();
  const results = [];
  
  for (let index = 0; index < mediaFiles.length; index++) {
    const file = mediaFiles[index];
    const uri = typeof file === "string" ? file : file?.uri;
    if (!uri) continue;

    let type = "image/jpeg";
    if (uri.endsWith(".mp4") || uri.endsWith(".mov") || file?.type?.startsWith("video")) {
      type = "video/mp4";
    }

    const name = file?.name || `media_${index}_${Date.now()}.${type === "video/mp4" ? "mp4" : "jpg"}`;
    
    if (uri.startsWith("file://") || uri.startsWith("content://")) {
      const url = getNormalizedUrl("/api/v1/mehndigo/artist/portfolio/upload");
      console.log(`[API REQUEST] POST (uploadAsync) -> ${url}`);
      const response = await FileSystem.uploadAsync(
        url,
        uri,
        {
          fieldName: "media",
          httpMethod: "POST",
          uploadType: UploadType.MULTIPART,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          mimeType: type
        }
      );

      let data;
      try {
        data = JSON.parse(response.body);
      } catch {
        data = { message: response.body };
      }

      if (response.status < 200 || response.status >= 300) {
        throw new Error(data?.message || "Failed to upload media file");
      }
      
      const fileList = data?.data || data || [];
      results.push(...(Array.isArray(fileList) ? fileList : [fileList]));
    } else {
      results.push({ url: uri, type: type === "video/mp4" ? "video" : "image" });
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
