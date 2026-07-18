import apiRequest, { BASE_URL, getNormalizedUrl } from "./api";
import { secureStorage } from "../utils/storage";

export async function createPortfolio(formData) {
  const token = await secureStorage.getAccessToken();
  const response = await fetch(getNormalizedUrl("/api/v1/mehndigo/artist/service"), {
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
  const response = await fetch(getNormalizedUrl(`/api/v1/mehndigo/artist/service/${id}`), {
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
