import { secureStorage } from "../utils/storage";

/**
 * ENVIRONMENT SWITCHING GUIDE:
 * - Local Development: Expo CLI automatically loads the `.env.local` file when you start the project
 *   using `npx expo start`.
 * - Production Build: Expo's builder (or eas-cli) automatically loads `.env.production` during the
 *   bundling phase.
 */
let verifiedWorkingBaseUrl = null;

const FALLBACK_URLS = [
  "http://192.168.1.36:8000/api/v1",
  "http://192.168.1.20:8000/api/v1",
  "http://10.0.2.2:8000/api/v1",
  "http://localhost:8000/api/v1",
];

const getBaseUrl = () => {
  let envUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.36:8000/api/v1";
  return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
};

export const BASE_URL = getBaseUrl();

// Dynamically construct the SOCKET_URL from the base URL (extracting protocol, host, and port)
const getSocketUrl = () => {
  const targetUrl = verifiedWorkingBaseUrl || BASE_URL;
  if (!targetUrl) return "";
  try {
    const urlObj = new URL(targetUrl);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    const apiIndex = targetUrl.indexOf("/api");
    if (apiIndex !== -1) {
      return targetUrl.substring(0, apiIndex);
    }
    return targetUrl;
  }
};

export const SOCKET_URL = getSocketUrl();

export function getNormalizedUrl(endpoint, customBaseUrl = null) {
  let baseUrl = customBaseUrl || verifiedWorkingBaseUrl || BASE_URL;
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

const apiCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

export function clearApiCache() {
  apiCache.clear();
}

async function apiRequest(method, endpoint, body = null, auth = false) {
  const isGet = method.toUpperCase() === "GET";
  const cacheKey = `${method.toUpperCase()}:${endpoint}:${auth ? "auth" : "anon"}`;

  if (isGet) {
    const cached = apiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  } else {
    // Invalidate cache on mutations
    apiCache.clear();
  }

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

  // Construct prioritized list of candidate base URLs
  const candidateBases = [];
  if (verifiedWorkingBaseUrl) {
    candidateBases.push(verifiedWorkingBaseUrl);
  }
  const defaultBase = getBaseUrl();
  if (!candidateBases.includes(defaultBase)) {
    candidateBases.push(defaultBase);
  }
  for (const fallbackBase of FALLBACK_URLS) {
    if (!candidateBases.includes(fallbackBase)) {
      candidateBases.push(fallbackBase);
    }
  }

  let lastError = null;

  for (const candidateBase of candidateBases) {
    const url = getNormalizedUrl(endpoint, candidateBase);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[API REQUEST] ${method} -> ${url}`);
    }

    // Create an AbortController with a fast 2.5-second timeout per candidate
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 2500);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Remember working base URL for future instant API calls!
      verifiedWorkingBaseUrl = candidateBase;

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

      if (isGet) {
        apiCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      // If it was an HTTP status response error (like 400, 404, 500), don't try other candidate hosts
      if (error.response?.status) {
        console.warn(`[API ERROR] ${method} ${endpoint} (Status: ${error.response.status}):`, error.message);
        throw error;
      }

      const reason = error.name === "AbortError" ? "Request Timed Out (2.5s limit)" : error.message;
      console.warn(`[API NETWORK ATTEMPT FAILED] ${url}: ${reason}. Trying next candidate...`);
    }
  }

  console.warn(`[API ERROR] ${method} ${endpoint} (Status: NETWORK_ERROR):`, lastError?.message);
  throw lastError;
}

export default apiRequest;
