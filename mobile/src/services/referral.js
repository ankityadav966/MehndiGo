import { apiRequest } from "./api";

const BASE = "/mehndigo/referral";

// ── Customer ─────────────────────────────────────────────────────────────────

/** Fetch customer referral dashboard stats */
export async function getCustomerReferralDashboard() {
  return apiRequest("GET", `${BASE}/dashboard`, null, true);
}

/** Fetch artist referral dashboard stats */
export async function getArtistReferralDashboard() {
  return apiRequest("GET", `${BASE}/artist-dashboard`, null, true);
}

/** Paginated referral history */
export async function getReferralHistory(page = 1, limit = 20) {
  return apiRequest("GET", `${BASE}/history?page=${page}&limit=${limit}`, null, true);
}

/** Get share link + referral code */
export async function getShareLink() {
  return apiRequest("GET", `${BASE}/share-link`, null, true);
}
