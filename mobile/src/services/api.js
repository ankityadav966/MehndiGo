import { secureStorage } from "../utils/storage";

/**
 * ENVIRONMENT SWITCHING GUIDE:
 * - Local Development: Expo CLI automatically loads the `.env.local` file when you start the project
 *   using `npx expo start`. It resolves requests to: http://98.70.11.123:3000/api/v1
 * - Production Build: Expo's builder (or eas-cli) automatically loads `.env.production` during the
 *   bundling phase. It resolves requests to: https://api.mehndigo.in/api/v1
 * 
 * You do NOT need to modify the source code to change environments. Simply start development or bundle
 * for release and the correct URL will be resolved automatically.
 */
const getBaseUrl = () => {
  let envUrl = process.env.EXPO_PUBLIC_API_URL || "https://api.mehndigo.in/api/v1";
  if (!envUrl || envUrl.includes("globalrns.com")) {
    envUrl = "https://api.mehndigo.in/api/v1";
  }
  return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
};

export const BASE_URL = getBaseUrl();

// Dynamically construct the SOCKET_URL from the base URL (extracting protocol, host, and port)
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
  if (!endpoint) return "";
  let path = String(endpoint).trim();

  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }

  let base = BASE_URL.replace(/\/+$/, "");

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

async function apiRequest(method, endpoint, body = null, auth = false, customTimeoutMs = 12000) {
  const url = getNormalizedUrl(endpoint);
  if (__DEV__) {
    if (__DEV__) console.log(`[API REQUEST] ${method} -> ${url}`);
  }

  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = await secureStorage.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      if (__DEV__) console.log(`[API REQUEST] Skipped ${method} ${endpoint}: No access token available`);
      const err = new Error("No authentication token available");
      err.response = { data: { message: "No authentication token available" }, status: 401, statusText: "Unauthorized" };
      throw err;
    }
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), customTimeoutMs) : null;

  const options = { method, headers };
  if (controller) {
    options.signal = controller.signal;
  }
  if (body) {
    options.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(url, options);
    if (timeoutId) clearTimeout(timeoutId);

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
      if (headers.Authorization) {
        await secureStorage.clearAll();
        if (global.logoutHandler) {
          global.logoutHandler();
        }
      }
    }

    if (!response.ok) {
      const err = new Error(data?.message || data?.error || response.statusText || "Something went wrong");
      err.response = { data, status: response.status, statusText: response.statusText };
      throw err;
    }

    return data;
  } catch (error) {
    const isAborted = error?.name === "AbortError" || String(error?.message || "").toLowerCase().includes("canceled") || String(error?.message || "").toLowerCase().includes("aborted");
    if (!isAborted) {
      console.warn(`[API ERROR] ${method} ${endpoint} (Status: ${error.response?.status || "NETWORK_ERROR"}):`, error.message);
    }
    throw error;
  }
}

export { apiRequest };
export default apiRequest;
