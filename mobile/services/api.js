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
  let baseUrl = BASE_URL;
  let cleanEndpoint = endpoint;

  // Ensure endpoint starts with a slash
  if (!cleanEndpoint.startsWith("/")) {
    cleanEndpoint = "/" + cleanEndpoint;
  }

  // Defensive: Strip trailing /mehndigo from base URL if present to prevent double-prefixing
  if (baseUrl.endsWith("/api/v1/mehndigo")) {
    baseUrl = baseUrl.substring(0, baseUrl.length - 9);
  }

  // Normalize endpoints to avoid double prefixing and handle root vs /api/v1 namespaces
  if (cleanEndpoint.startsWith("/api/v1/")) {
    if (baseUrl.endsWith("/api/v1")) {
      cleanEndpoint = cleanEndpoint.substring(7); // strip /api/v1 from endpoint
    }
  } else {
    // Root level endpoints (e.g. /wallet, /auth/login) shouldn't be prefixed with /api/v1
    if (baseUrl.endsWith("/api/v1")) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 7);
    }
  }

  // Construct URL
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  let url = `${baseUrl}${cleanEndpoint}`;

  return url;
}

async function apiRequest(method, endpoint, body = null, auth = false) {
  const url = getNormalizedUrl(endpoint);
  console.log(`[API REQUEST] ${method} -> ${url}`);

  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = await secureStorage.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(url, options);

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
      await secureStorage.clearAll();
      if (global.logoutHandler) {
        global.logoutHandler();
      }
    }

    if (!response.ok) {
      const err = new Error(data?.message || data?.error || response.statusText || "Something went wrong");
      err.response = { data, status: response.status, statusText: response.statusText };
      throw err;
    }

    return data;
  } catch (error) {
    console.warn(`[API ERROR] ${method} ${endpoint} (Status: ${error.response?.status || "NETWORK_ERROR"}):`, error.message);
    throw error;
  }
}

export default apiRequest;
