import { Platform } from "react-native";
import { secureStorage } from "../utils/storage";
import apiRequest from "./api";



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



export async function sendOtp(arg1, arg2, arg3, arg4) {
  let name = "";
  let email = "";
  let phone = "";
  let role = "USER";

  if (typeof arg1 === "object" && arg1 !== null) {
    name = arg1.name || "";
    email = arg1.email || arg1.identifier || "";
    phone = arg1.phone || "";
    role = arg1.role || "USER";
  } else if (typeof arg1 === "string" && arg1.includes("@")) {
    email = arg1;
    role = arg2 || "USER";
  } else if (typeof arg2 === "string" && arg2.includes("@")) {
    name = arg1;
    email = arg2;
    role = arg3 || "USER";
  } else {
    email = String(arg1 || "").trim();
    phone = String(arg2 || "").trim();
    role = arg3 || "USER";
  }

  email = String(email || "").trim();
  const targetRole = role === "CUSTOMER" ? "USER" : (role || "USER");

  const payload = { email, role: targetRole };
  if (name) payload.name = name;

  const data = await apiRequest("POST", "/api/v1/mehndigo/user/send-otp", payload);
  return data;
}

export async function registerSendOtp(name, email, phone, role) {
  const payload = {
    name: name || "User",
    email: String(email || "").trim(),
    role: role === "CUSTOMER" ? "USER" : (role || "USER"),
  };
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/register-send-otp", payload);
  return data;
}

export async function verifyUserOtp(arg1, arg2, arg3) {
  let email = "";
  let phone = "";
  let otp = "";

  if (typeof arg1 === "object" && arg1 !== null) {
    email = arg1.email || arg1.identifier || "";
    phone = arg1.phone || "";
    otp = arg1.otp || "";
  } else if (typeof arg1 === "string" && arg1.includes("@")) {
    email = arg1;
    otp = arg2 || "";
  } else {
    phone = arg1;
    otp = arg2;
  }

  const payload = { otp: String(otp) };
  if (email) payload.email = String(email).trim();

  const data = await apiRequest("POST", "/api/v1/mehndigo/user/verify-otp", payload);
  return persistAuthData(data);
}

export async function registerVerifyOtp(arg1, arg2, arg3) {
  let email = "";
  let phone = "";
  let otp = "";

  if (typeof arg1 === "object" && arg1 !== null) {
    email = arg1.email || arg1.identifier || "";
    phone = arg1.phone || "";
    otp = arg1.otp || "";
  } else if (typeof arg1 === "string" && arg1.includes("@")) {
    email = arg1;
    otp = arg2 || "";
  } else {
    phone = arg1;
    otp = arg2;
  }

  const payload = { otp: String(otp) };
  if (email) payload.email = String(email).trim();

  const data = await apiRequest("POST", "/api/v1/mehndigo/user/register-verify-otp", payload);
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

export const authService = {
  register: (data) => apiRequest("POST", "/api/v1/mehndigo/user/register-send-otp", data),
  verifyEmailOtp: (data) => apiRequest("POST", "/api/v1/mehndigo/user/verify-otp", data),
  login: (data) => apiRequest("POST", "/api/v1/mehndigo/user/send-otp", data),
  verifyOtp: (data) => apiRequest("POST", "/api/v1/mehndigo/user/verify-otp", data),
  forgotPassword: (data) => apiRequest("POST", "/api/v1/mehndigo/user/forgot-password", data),
  verifyForgotPasswordOtp: (data) => apiRequest("POST", "/api/v1/mehndigo/user/verify-forgot-password-otp", data),
  resetPassword: (data) => apiRequest("POST", "/api/v1/mehndigo/user/reset-password", data),
  resendOtp: (data) => apiRequest("POST", "/api/v1/mehndigo/user/send-otp", data),
};
