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

// Fetch Leaderboard ranks
export async function getLeaderboard(type = "XP", period = "all-time") {
  const res = await apiRequest("GET", `/referral/leaderboard?type=${type}&period=${period}`, null, true);
  return res?.data || res;
}

// Fetch reward store options
export async function listRewardOptions() {
  const res = await apiRequest("GET", "/reward", null, true);
  return res?.data || res;
}

// Claim reward store item
export async function claimRewardOption(rewardId) {
  const res = await apiRequest("POST", "/reward/claim", { rewardId }, true);
  return res?.data || res;
}
