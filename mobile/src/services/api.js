import { secureStorage } from "../utils/storage";

const getBaseUrl = () => {
  let envUrl = process.env.EXPO_PUBLIC_API_URL || "https://api.mehndigo.in/api/v1";
  return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
};

export const BASE_URL = getBaseUrl();

const getSocketUrl = () => {
  if (!BASE_URL) return "";
  try {
    const urlObj = new URL(BASE_URL);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    const apiIndex = BASE_URL.indexOf("/api");
    if (apiIndex !== -1) {
      return BASE_URL.substring(0, apiIndex);
    }
    return BASE_URL;
  }
};

export const SOCKET_URL = getSocketUrl();

export function getNormalizedUrl(endpoint) {
  let base = BASE_URL.replace(/\/+$/, "");
  let path = (endpoint || "").trim();

  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // Ensure base contains /api/v1 if not present
  if (!base.endsWith("/api/v1") && !path.startsWith("/api/v1/")) {
    base = `${base}/api/v1`;
  }

  // If base ends with /api/v1 and path starts with /api/v1/, strip duplicate from path
  if (base.endsWith("/api/v1") && path.startsWith("/api/v1/")) {
    path = path.substring(7);
  }

  return `${base}${path}`;
}

export function resolvePortfolioImage(imageUrl, videoUrl) {
  const url = imageUrl || videoUrl;
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  let resolved = trimmed;
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("file://") &&
    !trimmed.startsWith("content://") &&
    !trimmed.startsWith("data:")
  ) {
    resolved = getNormalizedUrl(trimmed);
  }

  // If it's a Cloudinary video URL, generate Cloudinary image frame thumbnail
  if (resolved.includes("/video/upload/")) {
    return resolved
      .replace("/video/upload/", "/video/upload/so_0,f_jpg/")
      .replace(/\.(mp4|mov|3gp|mkv|webm|avi|flv)$/i, ".jpg");
  }

  return resolved;
}

// Token mask utility for diagnostic logs
export function sanitizeLogData(str) {
  if (typeof str !== "string") return str;
  return str.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, "Bearer ***MASKED***");
}

// Deduplication map for in-flight GET requests
const inflightGetRequests = new Map();

async function apiRequest(method, endpoint, body = null, auth = false) {
  const url = getNormalizedUrl(endpoint);

  // In-flight GET request deduplication
  const requestKey = `${method.toUpperCase()}:${url}:${auth}`;
  if (method.toUpperCase() === "GET" && inflightGetRequests.has(requestKey)) {
    try {
      const cachedResult = await inflightGetRequests.get(requestKey);
      return JSON.parse(JSON.stringify(cachedResult));
    } catch {
      // Fall through if cache read fails
    }
  }

  const fetchPromise = (async () => {
    const headers = { "Content-Type": "application/json" };

    if (auth) {
      const token = await secureStorage.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const makeFetch = async (reqHeaders) => {
      const reqOptions = {
        method: method.toUpperCase(),
        headers: { ...reqHeaders }
      };
      if (body) {
        reqOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      try {
        return await fetch(url, reqOptions);
      } catch (err) {
        if (err && err.message && err.message.includes("NativeRequest")) {
          console.warn("[API] Retrying fetch due to Expo NativeRequest error:", err.message);
          const freshOptions = {
            method: method.toUpperCase(),
            headers: { ...reqHeaders }
          };
          if (body) {
            freshOptions.body = typeof body === "string" ? body : JSON.stringify(body);
          }
          return await fetch(url, freshOptions);
        }
        throw err;
      }
    };

    try {
      const response = await makeFetch(headers);

      let data;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (response.status === 401) {
        const storedRefreshToken = await secureStorage.getRefreshToken();
        if (storedRefreshToken) {
          try {
            const refreshUrl = getNormalizedUrl("/auth/refresh-token");
            const refreshRes = await fetch(refreshUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: storedRefreshToken })
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newAccess = refreshData?.data?.token || refreshData?.token;
              const newRefresh = refreshData?.data?.refreshToken || refreshData?.refreshToken;

              if (newAccess) {
                await secureStorage.saveTokens(newAccess, newRefresh || storedRefreshToken);
                const retryHeaders = { ...headers, Authorization: `Bearer ${newAccess}` };
                const retryResponse = await makeFetch(retryHeaders);
                return await retryResponse.json();
              }
            }
          } catch (refreshErr) {
            if (__DEV__) console.log("[API] Automatic token refresh failed:", refreshErr.message);
          }
        }

        await secureStorage.clearAll();
        if (global.logoutHandler) {
          global.logoutHandler();
        }
        throw new Error(data?.message || "Unauthorized session");
      }

      if (!response.ok) {
        const err = new Error(data?.message || data?.error || response.statusText || "Something went wrong");
        err.response = { data, status: response.status, statusText: response.statusText };
        throw err;
      }

      return data;
    } catch (error) {
      if (__DEV__) {
        console.warn(`[API ERROR] ${method} ${endpoint}:`, error.message);
      }
      throw error;
    } finally {
      if (method.toUpperCase() === "GET") {
        inflightGetRequests.delete(requestKey);
      }
    }
  })();

  if (method.toUpperCase() === "GET") {
    inflightGetRequests.set(requestKey, fetchPromise);
  }

  return fetchPromise;
}

export default apiRequest;
