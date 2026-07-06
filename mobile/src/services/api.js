import { secureStorage } from "../utils/storage";

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }
  return "https://mehandigo-api.globalrns.com/api/v1";
};

export const BASE_URL = getBaseUrl();

export function getNormalizedUrl(endpoint) {
  let baseUrl = BASE_URL;
  let cleanEndpoint = endpoint;

  // Ensure endpoint starts with a slash
  if (!cleanEndpoint.startsWith("/")) {
    cleanEndpoint = "/" + cleanEndpoint;
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

  // Normalize and replace any dev local URL / IP
  if (url.includes("192.168.1.9")) {
    url = url.replace(/http:\/\/192\.168\.1\.9:\d+/g, "https://mehandigo-api.globalrns.com");
    url = url.replace(/192\.168\.1\.9:\d+/g, "mehandigo-api.globalrns.com");
    url = url.replace(/192\.168\.1\.9/g, "mehandigo-api.globalrns.com");
  }

  // Force HTTPS schema
  if (url.startsWith("http://")) {
    url = "https://" + url.substring(7);
  }

  return url;
}

async function apiRequest(method, endpoint, body = null, auth = false) {
  const url = getNormalizedUrl(endpoint);

  // Log the exact URL before request
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
