import apiRequest from "./api";

// Fetch user's referral dashboard details
export async function getReferralDashboard() {
  const res = await apiRequest("GET", "/referral", null, true);
  return res?.data || res;
}

// Fetch user's invited friends history list
export async function getReferralHistory() {
  const res = await apiRequest("GET", "/referral/history", null, true);
  return res?.data || res;
}

// Fetch referral wallet transactions rewards
export async function getReferralRewardsHistory() {
  const res = await apiRequest("GET", "/referral/rewards", null, true);
  return res?.data || res;
}
