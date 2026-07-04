import { secureStorage } from "../utils/storage";

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }
  return "http://192.168.1.9:8000";
};

export const BASE_URL = getBaseUrl();

async function apiRequest(method, endpoint, body = null, auth = false) {
  const url = `${BASE_URL}${endpoint}`;

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
