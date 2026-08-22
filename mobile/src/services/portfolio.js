import apiRequest, { getNormalizedUrl } from "./api";
import { secureStorage } from "../utils/storage";

async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (err && err.message && err.message.includes("NativeRequest")) {
      console.warn("[Portfolio] Retrying fetch due to NativeRequest error:", err.message);
      return await fetch(url, { ...options, headers: { ...options.headers } });
    }
    throw err;
  }
}

export async function createPortfolio(formData) {
  const token = await secureStorage.getAccessToken();
  const url = getNormalizedUrl("/api/v1/mehndigo/artist/service");
  if (__DEV__) console.log(`[API REQUEST] POST (fetch) -> ${url}`);
  const response = await safeFetch(url, {
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

export async function getAllPortfolios() {
  const data = await apiRequest("GET", "/api/v1/mehndigo/artist/getallservicesdata", null, true);
  return data?.data || data;
}

export async function updatePortfolio(id, formData) {
  const token = await secureStorage.getAccessToken();
  const url = getNormalizedUrl(`/api/v1/mehndigo/artist/service/${id}`);
  if (__DEV__) console.log(`[API REQUEST] PUT (fetch) -> ${url}`);
  const response = await safeFetch(url, {
    method: "PUT",
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

export async function deletePortfolio(id) {
  const data = await apiRequest("DELETE", `/api/v1/mehndigo/artist/service/${id}`, null, true);
  return data?.data || data;
}
