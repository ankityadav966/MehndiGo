import apiRequest, { getNormalizedUrl } from "./api";
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
  const data = await apiRequest("GET", `/api/v1/mehndigo/artist/artistdetails?_t=${Date.now()}`, null, true);
  return data?.data || data;
}

export async function getArtistVerificationStatus() {
  const data = await apiRequest("GET", `/api/v1/mehndigo/artist/artistdetails?_t=${Date.now()}`, null, true);
  const profile = data?.data || data;
  const rawStatus = profile?.verification_status || profile?.status || "PENDING";
  const canonicalStatus = String(rawStatus).toUpperCase();
  return {
    status: canonicalStatus,
    verification_status: canonicalStatus,
    is_approved: canonicalStatus === "APPROVED",
    is_rejected: canonicalStatus === "REJECTED",
    is_pending: canonicalStatus === "PENDING",
    rejection_reason: profile?.rejection_reason || null,
    profile
  };
}

export async function createArtistProfile(profileData) {
  const isLocalUri = (val) => {
    if (!val) return false;
    if (typeof val === "string") {
      return (
        val.startsWith("file://") ||
        val.startsWith("content://") ||
        val.startsWith("ph://") ||
        val.startsWith("assets-library://") ||
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

    if (uri && uri.startsWith("/")) {
      return `file://${uri}`;
    }
    return uri;
  };

  const payload = { ...profileData };

  // Upload local images to secure Cloudinary storage if present
  const imageKeys = ["aadhaar_front", "aadhaar_back", "selfie_image", "profile_image", "cover_image"];
  for (const key of imageKeys) {
    const val = payload[key];
    if (val && isLocalUri(val)) {
      const uri = getSafeUri(val);
      const uploadResult = await uploadPortfolioMedia([{ uri }]);
      if (uploadResult && uploadResult.length > 0 && uploadResult[0].url) {
        payload[key] = uploadResult[0].url;
      } else {
        throw new Error(`Failed to upload ${key} to secure storage`);
      }
    }
  }

  // Normalize aliases
  if (payload.fullName && !payload.name) payload.name = payload.fullName;
  if (payload.experienceYears !== undefined && payload.experience_years === undefined) {
    payload.experience_years = Number(payload.experienceYears);
  }
  if (payload.startingPrice !== undefined && payload.starting_price === undefined) {
    payload.starting_price = Number(payload.startingPrice);
  }
  if (payload.homeService !== undefined && payload.home_service === undefined) {
    payload.home_service = Boolean(payload.homeService);
  }
  if (payload.salonService !== undefined && payload.salon_service === undefined) {
    payload.salon_service = Boolean(payload.salonService);
  }
  if (payload.aadhaarNumber && !payload.aadhaar_number) {
    payload.aadhaar_number = payload.aadhaarNumber;
  }

  const res = await apiRequest("POST", "/api/v1/mehndigo/artist/profile", payload, true);
  return res?.data || res;
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

async function prepareSafeLocalUri(rawUri) {
  if (!rawUri) throw new Error("No local file URI provided");
  let uri = rawUri;
  if (!uri.startsWith("file://") && !uri.startsWith("content://") && !uri.startsWith("ph://")) {
    uri = `file://${uri}`;
  }

  const FileSystem = require("expo-file-system/legacy");
  try {
    const destDir = `${FileSystem.cacheDirectory}uploads/`;
    const dirInfo = await FileSystem.getInfoAsync(destDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    }

    const cleanFilename = (uri.split("/").pop() || `upload_${Date.now()}.jpg`).split("?")[0];
    const safeDest = `${destDir}${Date.now()}_${cleanFilename}`;

    await FileSystem.copyAsync({ from: uri, to: safeDest });
    const checkCopied = await FileSystem.getInfoAsync(safeDest);
    if (checkCopied.exists) {
      return safeDest;
    }
  } catch (copyErr) {
    console.warn("[prepareSafeLocalUri] Cache copy fallback error:", copyErr.message);
  }

  return uri;
}

async function uploadDirectToCloudinary(localUri, mimeType, isVideo, onProgress) {
  try {
    const safeUri = await prepareSafeLocalUri(localUri);
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
        safeUri,
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
      if (!responseData?.secure_url) {
        throw new Error("Image upload failed: Cloudinary secure_url missing in response");
      }
      return responseData.secure_url;
    } else {
      const response = await FileSystem.uploadAsync(url, safeUri, uploadOptions);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Cloudinary direct upload failed with status ${response.status}: ${response.body}`);
      }
      const responseData = JSON.parse(response.body);
      if (!responseData?.secure_url) {
        throw new Error("Image upload failed: Cloudinary secure_url missing in response");
      }
      return responseData.secure_url;
    }
  } catch (error) {
    console.error("[uploadDirectToCloudinary] Error:", error.message || error);
    throw error;
  }
}

async function uploadToServerMultipart(localUri, mimeType, isVideo = false) {
  try {
    const safeUri = await prepareSafeLocalUri(localUri);
    const { getNormalizedUrl } = require("./api");
    const { secureStorage } = require("../utils/storage");
    const FileSystem = require("expo-file-system/legacy");

    const endpoint = getNormalizedUrl("/api/v1/mehndigo/artist/portfolio/upload");
    const token = await secureStorage.getAccessToken();

    const response = await FileSystem.uploadAsync(endpoint, safeUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "media",
      mimeType: mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
      parameters: {
        type: isVideo ? "video" : "image",
        is_video: isVideo ? "true" : "false"
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Server file upload failed with status ${response.status}: ${response.body}`);
    }

    const responseData = JSON.parse(response.body);
    const uploadedUrl = responseData?.data?.[0]?.url || responseData?.data?.[0]?.secure_url || responseData?.data?.url;
    if (!uploadedUrl) {
      throw new Error("Image upload failed: No media URL returned from server upload");
    }
    return uploadedUrl;
  } catch (err) {
    console.error("[uploadToServerMultipart] Error:", err.message || err);
    throw err;
  }
}

async function uploadMediaWithFallback(localUri, mimeType, isVideo, onProgress) {
  try {
    return await uploadDirectToCloudinary(localUri, mimeType, isVideo, onProgress);
  } catch (err) {
    console.warn("[uploadMediaWithFallback] Direct Cloudinary upload failed, using backend server fallback:", err.message);
    return await uploadToServerMultipart(localUri, mimeType, isVideo);
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
      if (__DEV__) console.log("[VIDEO UPLOAD RESPONSE]", { videoUrl });
    }

    // 2. Upload Image if it is local and distinct from video
    if (imageUrl && isLocal(imageUrl)) {
      const isVideoFile = (itemData.video_url && imageUrl === itemData.video_url) || /\.(mp4|mov|3gp|mkv)$/i.test(imageUrl);
      if (isVideoFile) {
        imageUrl = videoUrl;
      } else {
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
    }

    if (!imageUrl && videoUrl) {
      imageUrl = videoUrl;
    }

    if (onProgress) onProgress(0.9);

    const finalItemData = {
      ...itemData,
      image_url: imageUrl,
      video_url: videoUrl
    };

    console.log("[PORTFOLIO SAVE PAYLOAD]", {
      image_url: finalItemData.image_url,
      video_url: finalItemData.video_url,
      title: finalItemData.title
    });

    if (onProgress) onProgress(0.95);
    const data = await apiRequest("POST", "/api/v1/mehndigo/artist/portfolio", finalItemData, true);
    console.log("[VIDEO SAVED URL]", {
      id: data?.data?.id || data?.id,
      image_url: data?.data?.image_url || data?.image_url,
      video_url: data?.data?.video_url || data?.video_url
    });
    if (onProgress) onProgress(1.0);
    return data?.data || data;
  } catch (err) {
    console.error("[createPortfolioItem] Error:", err);
    throw err;
  }
}

export async function updatePortfolioItem(id, updateData) {
  const data = await apiRequest("PUT", `/artist/portfolio/${id}`, updateData, true);
  return data?.data || data;
}

export async function deletePortfolioItem(id) {
  const data = await apiRequest("DELETE", `/artist/portfolio/${id}`, null, true);
  return data?.data || data;
}

export async function reorderPortfolioItems(items) {
  const data = await apiRequest("PUT", "/artist/portfolio/reorder", { items }, true);
  return data?.data || data;
}

export async function setArtistCoverImage(coverData) {
  const data = await apiRequest("PUT", "/artist/profile/cover", coverData, true);
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
    const isVideo = (file?.type === "video" || file?.type?.startsWith("video") || (file?.mimeType && file?.mimeType.startsWith("video")) || /\.(mp4|mov|3gp|mkv|webm|avi|flv)$/i.test(uri));
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

      if (!secureUrl || typeof secureUrl !== "string" || (!secureUrl.startsWith("http://") && !secureUrl.startsWith("https://"))) {
        throw new Error("Image upload failed: Cloudinary secure_url missing");
      }

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
  const notifMap = new Map();
  try {
    const res = await apiRequest("GET", "/admin/notifications", null, false).catch(() => ({}));
    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    list.forEach(n => { if (n && n.id) notifMap.set(n.id, n); });
  } catch (_) {}

  try {
    const res = await apiRequest("GET", "/notifications", null, true).catch(() => ({}));
    const list = Array.isArray(res?.notifications) ? res.notifications : (Array.isArray(res?.data?.notifications) ? res.data.notifications : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])));
    list.forEach(n => { if (n && n.id) notifMap.set(n.id, n); });
  } catch (_) {}

  try {
    const res = await apiRequest("GET", "/artist/notifications", null, true).catch(() => ({}));
    const list = Array.isArray(res?.notifications) ? res.notifications : (Array.isArray(res?.data?.notifications) ? res.data.notifications : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])));
    list.forEach(n => { if (n && n.id) notifMap.set(n.id, n); });
  } catch (_) {}

  const combined = Array.from(notifMap.values());
  return { notifications: combined, data: { notifications: combined } };
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

export async function getArtistAvailability() {
  const res = await apiRequest("GET", "/artist/availability", null, true);
  return res?.data || res;
}

export async function updateArtistAvailability(data) {
  const res = await apiRequest("PUT", "/artist/availability", data, true);
  return res?.data || res;
}

export async function addBlockedDate(date) {
  const res = await apiRequest("POST", "/artist/availability/blocked-dates", { date }, true);
  return res?.data || res;
}

export async function removeBlockedDate(date) {
  const res = await apiRequest("DELETE", "/artist/availability/blocked-dates", { date }, true);
  return res?.data || res;
}

export async function createServicePackage(serviceId, packageData) {
  const res = await apiRequest("POST", `/artist/services/${serviceId}/packages`, packageData, true);
  return res?.data || res;
}

export async function updateServicePackage(packageId, packageData) {
  const res = await apiRequest("PUT", `/artist/packages/${packageId}`, packageData, true);
  return res?.data || res;
}

export async function deleteServicePackage(packageId) {
  const res = await apiRequest("DELETE", `/artist/packages/${packageId}`, null, true);
  return res?.data || res;
}

export const artistService = {
  getArtistDetails,
  getArtistVerificationStatus,
  getArtists: async () => {
    const res = await apiRequest("GET", "/customer/nearby-artists", null, true).catch(() => ({ data: [] }));
    return res?.data || res;
  },
  getArtistsNearby: async () => {
    const res = await apiRequest("GET", "/customer/nearby-artists", null, true).catch(() => ({ data: [] }));
    return res?.data || res;
  }
};
