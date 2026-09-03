/**
 * category.js  —  Mobile category API service
 *
 * Primary: GET /customer/categories  (requires auth, returns only ACTIVE categories)
 * Fallback: GET /category            (public endpoint, also only ACTIVE)
 *
 * Returns array of category objects: { id, name, slug, status, ... }
 */

import apiRequest from "./api";

export async function getLiveCategories() {
  // Try authenticated customer endpoint first (returns active only)
  try {
    const res = await apiRequest("GET", "/customer/categories", null, true);
    const list = res?.data || res?.categories || (Array.isArray(res) ? res : []);
    if (Array.isArray(list) && list.length > 0) return list;
  } catch (_) {
    // fall through to public endpoint
  }

  // Fallback: public category endpoint
  try {
    const res = await apiRequest("GET", "/category", null, false);
    const list = res?.data || res?.categories || (Array.isArray(res) ? res : []);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    if (__DEV__) console.log("Failed to fetch categories:", err.message);
    throw err;
  }
}

export async function getCategories() {
  return getLiveCategories();
}
