import { Platform } from "react-native";
import { secureStorage } from "../utils/storage";
import apiRequest from "./api";

export function useGoogleAuth() {
  return {
    request: null,
    response: null,
    promptAsync: async () => {
      const mockIdToken = "mock-google-id-token-" + Date.now();
      return { type: "success", params: { id_token: mockIdToken } };
    },
  };
}

function extractPayload(response) {
  return response?.data || response;
}

function extractToken(payload) {
  return payload.accessToken || payload.access_token || payload.token || null;
}

async function persistAuthData(response) {
  const payload = extractPayload(response);
  const token = extractToken(payload);
  if (token) {
    await secureStorage.setAccessToken(token);
  }
  if (payload.refreshToken) {
    await secureStorage.setRefreshToken(payload.refreshToken);
  }
  if (payload.user) {
    await secureStorage.setUserData(payload.user);
    if (payload.user.role) {
      await secureStorage.setUserRole(payload.user.role);
    }
  }
  return payload;
}

export async function signInWithGoogle(idToken) {
  const data = await apiRequest("POST", "/auth/google", {
    idToken,
    platform: Platform.OS,
  });
  await persistAuthData(data);
  return data;
}

export async function signInWithEmail(email, password) {
  const data = await apiRequest("POST", "/auth/login", { email, password });
  await persistAuthData(data);
  return data;
}

export async function registerUser(userData) {
  const data = await apiRequest("POST", "/auth/register", userData);
  await persistAuthData(data);
  return data;
}

export async function verifyOtp(email, otp) {
  const data = await apiRequest("POST", "/auth/verify-otp", { email, otp });
  await persistAuthData(data);
  return data;
}

export function sanitizePhone(phone) {
  if (!phone) return phone;
  let cleaned = String(phone).trim();
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.substring(3);
  }
  cleaned = cleaned.replace(/[^0-9]/g, "");
  if (cleaned.length > 10) {
    cleaned = cleaned.substring(cleaned.length - 10);
  }
  return cleaned;
}

export async function sendOtp(name, email, phone, role) {
  console.log("Sending OTP request");
  const sanitized = sanitizePhone(phone);
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/send-otp", {
    name,
    email,
    role: role === "CUSTOMER" ? "USER" : role, // Map CUSTOMER role to USER backend enum value
    phone: sanitized,
  });
  return data;
}

export async function verifyUserOtp(phone, otp, role, name, email, referralCode = "") {
  const sanitized = sanitizePhone(phone);
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/verify-otp", {
    phone: sanitized,
    otp,
    role: role === "CUSTOMER" ? "USER" : role, // Map CUSTOMER role to USER backend enum value
    name: name || "",
    email: email || "",
    referralCode,
  });
  return persistAuthData(data);
}

export async function registerUserV1(userData) {
  if (userData && userData.phone) {
    userData.phone = sanitizePhone(userData.phone);
  }
  if (userData && userData.role === "CUSTOMER") {
    userData.role = "USER";
  }
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/register", userData);
  return persistAuthData(data);
}

export async function loginWithPhone(phone, role) {
  const sanitized = sanitizePhone(phone);
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/login", {
    phone: sanitized,
    role: role === "CUSTOMER" ? "USER" : role, // Map CUSTOMER role to USER backend enum value
  });
  return persistAuthData(data);
}

export async function refreshAccessToken() {
  const refreshToken = await secureStorage.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const data = await apiRequest("POST", "/auth/refresh-token", {
    refreshToken,
  });

  const payload = extractPayload(data);
  if (payload.accessToken) {
    await secureStorage.setAccessToken(payload.accessToken);
  }
  if (payload.refreshToken) {
    await secureStorage.setRefreshToken(payload.refreshToken);
  }
  return payload.accessToken;
}

export async function signOut() {
  try {
    const notificationToken = await secureStorage.getNotificationToken();
    if (notificationToken) {
      await apiRequest("POST", "/auth/remove-notification-token", {
        token: notificationToken,
      }, true);
    }
  } catch (_) {}
  await secureStorage.clearAll();
}
