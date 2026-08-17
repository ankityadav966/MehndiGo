import { Constants } from "expo-constants";

const DEFAULT_API_URL = "https://api.mehndigo.in/api/v1";

let rawApiUrl = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
if (!rawApiUrl || rawApiUrl.includes("globalrns.com")) {
  rawApiUrl = DEFAULT_API_URL;
}

// Ensure API URL ends cleanly without trailing slash
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

export const ENV = {
  API_BASE_URL,
  IS_DEV: __DEV__,
  TIMEOUT_MS: 15000,
};

if (__DEV__) {
  console.log("[Mobile Env Config] Active API Base URL:", API_BASE_URL);
}
