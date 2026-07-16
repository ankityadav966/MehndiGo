import apiRequest, { BASE_URL } from "./api";
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
  const response = await fetch(`${BASE_URL}/api/v1/mehndigo/artist/profile`, {
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
  const { File, Paths } = require("expo-file-system");

  const isLocal = (url) => url && (url.startsWith("file://") || url.startsWith("content://"));
  const hasLocalMedia = isLocal(itemData.image_url) || isLocal(itemData.video_url);

  if (hasLocalMedia) {
    const isVideo = itemData.video_url && isLocal(itemData.video_url);
    const mediaUri = isVideo ? itemData.video_url : itemData.image_url;
    
    const params = {};
    Object.entries(itemData).forEach(([key, value]) => {
      const shouldExclude = key === "video_url" || (key === "image_url" && isLocal(value));
      if (!shouldExclude && value !== undefined && value !== null) {
        params[key] = String(value);
      }
    });

    const name = mediaUri.split("/").pop() || "media_file";
    const mimeType = isVideo ? "video/mp4" : "image/jpeg";

    let finalUri = mediaUri;
    const tempName = `upload_portfolio_${Date.now()}_${name}`;

    let destFile = null;
    try {
      const srcFile = new File(mediaUri);
      destFile = new File(Paths.cache, tempName);
      await srcFile.copy(destFile.uri);
      finalUri = destFile.uri;
      console.log("[FileSystem] Portfolio file copied successfully:", finalUri);
    } catch (err) {
      console.warn("[FileSystem] Copy failed for portfolio item:", err.message);
    }

    const token = await secureStorage.getAccessToken();
    const formData = new FormData();
    formData.append("portfolio_image", {
      uri: finalUri,
      type: mimeType,
      name: name
    });
    Object.entries(params).forEach(([key, value]) => {
      formData.append(key, value);
    });

    let response;
    try {
      response = await fetch(`${BASE_URL}/api/v1/mehndigo/artist/portfolio`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
    } finally {
      try {
        if (destFile && finalUri !== mediaUri) {
          await destFile.delete();
          console.log("[FileSystem] Portfolio temp file deleted:", finalUri);
        }
      } catch (cleanErr) {
        console.warn("[FileSystem] Failed to clean up portfolio temp file:", cleanErr.message);
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
      throw new Error(parsedError?.message || `Failed to create portfolio item: ${response.status}`);
    }

    const data = await response.json();
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
  const { File, Paths } = require("expo-file-system");
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
      let finalUri = uri;
      const tempName = `upload_portfolio_media_${Date.now()}_${name}`;

      let destFile = null;
      try {
        const srcFile = new File(uri);
        destFile = new File(Paths.cache, tempName);
        await srcFile.copy(destFile.uri);
        finalUri = destFile.uri;
        console.log("[FileSystem] Portfolio media file copied successfully:", finalUri);
      } catch (err) {
        console.warn("[FileSystem] Copy failed for portfolio media:", err.message);
      }

      const formData = new FormData();
      formData.append("media", {
        uri: finalUri,
        type: type,
        name: name
      });

      let response;
      try {
        response = await fetch(`${BASE_URL}/api/v1/mehndigo/artist/portfolio/upload`, {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
      } finally {
        try {
          if (destFile && finalUri !== uri) {
            await destFile.delete();
            console.log("[FileSystem] Portfolio media temp file deleted:", finalUri);
          }
        } catch (cleanErr) {
          console.warn("[FileSystem] Failed to clean up portfolio media temp file:", cleanErr.message);
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
      results.push(data?.data || data);
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
