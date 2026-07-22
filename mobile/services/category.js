import apiRequest from "./api";

export async function getLiveCategories() {
  const res = await apiRequest("GET", "/category", null, false);
  return res?.data || res || [];
}
