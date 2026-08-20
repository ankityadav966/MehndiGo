import apiRequest from "./api";

export async function getLiveCategories() {
  try {
    const res = await apiRequest("GET", "/customer/categories", null, true);
    const list = res?.data || res?.categories || (Array.isArray(res) ? res : []);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.log("Failed to fetch live categories:", err.message);
    throw err;
  }
}

export async function getCategories() {
  return getLiveCategories();
}

