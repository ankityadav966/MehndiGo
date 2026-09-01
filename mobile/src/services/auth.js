import { Platform } from "react-native";
import { secureStorage } from "../utils/storage";
import apiRequest, { BASE_URL } from "./api";
import { removeNotificationToken } from "./notification";

export function useGoogleAuth() {
  return {
    request: null,
    response: null,
    promptAsync: async () => {
      throw new Error("Google Sign-In is not configured for this environment.");
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
    const rawRole = payload.user.role || payload.role;
    const canonicalRole = (String(rawRole).toUpperCase().trim() === "ARTIST") ? "ARTIST" : "CUSTOMER";
    const userWithRole = { ...payload.user, role: canonicalRole };
    await secureStorage.setUserData(userWithRole);
    await secureStorage.setUserRole(canonicalRole);
    return { ...payload, user: userWithRole, role: canonicalRole };
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
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/verify-otp", {
    email: email ? String(email).trim().toLowerCase() : undefined,
    otp: String(otp).trim(),
  });
  await persistAuthData(data);
  return data;
}

export function sanitizePhone(phone) {
  if (!phone) return "";
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

const maskEmail = (emailStr) => {
  if (!emailStr || !emailStr.includes("@")) return "***";
  const [userPart, domainPart] = emailStr.split("@");
  if (userPart.length <= 2) return `${userPart[0]}***@${domainPart}`;
  return `${userPart[0]}***${userPart[userPart.length - 1]}@${domainPart}`;
};

export async function sendOtp(emailOrPhone, emailParam, phone, role) {
  let email = "";
  let cleanPhone = "";

  if (typeof emailOrPhone === "string" && emailOrPhone.includes("@")) {
    email = emailOrPhone.trim().toLowerCase();
  } else if (emailParam && String(emailParam).trim().includes("@")) {
    email = String(emailParam).trim().toLowerCase();
  } else if (typeof emailOrPhone === "string" && emailOrPhone.trim().length > 0) {
    cleanPhone = sanitizePhone(emailOrPhone);
  } else if (phone) {
    cleanPhone = sanitizePhone(phone);
  }

  const endpoint = "/api/v1/mehndigo/user/send-otp";
  const payload = {};
  if (email) payload.email = email;
  if (cleanPhone) payload.phone = cleanPhone;
  if (role) payload.role = role === "CUSTOMER" ? "USER" : role;

  if (__DEV__) console.log("[OTP] REQUEST ENDPOINT:", endpoint, "TARGET:", email ? maskEmail(email) : cleanPhone);
  const data = await apiRequest("POST", endpoint, payload);
  return data;
}

export async function registerSendOtp(name, email, phone, role) {
  const cleanPhone = sanitizePhone(phone);
  const trimmedEmail = email ? String(email).trim().toLowerCase() : "";
  const endpoint = "/api/v1/mehndigo/user/register-send-otp";

  const payload = {
    name: name ? String(name).trim() : "User",
    email: trimmedEmail || undefined,
    phone: cleanPhone || undefined,
    role: role === "CUSTOMER" ? "USER" : (role || "USER"),
  };

  if (__DEV__) console.log("[OTP] REGISTER REQUEST:", endpoint, "EMAIL:", maskEmail(trimmedEmail));
  const data = await apiRequest("POST", endpoint, payload);
  return data;
}

export async function registerVerifyOtp(email, otp, name, phone, role) {
  const cleanPhone = sanitizePhone(phone);
  const trimmedEmail = email ? String(email).trim().toLowerCase() : "";
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/register-verify-otp", {
    email: trimmedEmail || undefined,
    phone: cleanPhone || undefined,
    otp: String(otp).trim(),
    name: name ? String(name).trim() : undefined,
    role: role === "CUSTOMER" ? "USER" : role,
  });
  return persistAuthData(data);
}

export async function verifyUserOtp(phoneOrEmail, otp, role, name, email, referralCode = "") {
  let cleanPhone = "";
  let userEmail = "";
  if (typeof phoneOrEmail === "string" && phoneOrEmail.includes("@")) {
    userEmail = phoneOrEmail.trim().toLowerCase();
  } else if (phoneOrEmail) {
    cleanPhone = sanitizePhone(phoneOrEmail);
  }
  if (email && email.includes("@")) {
    userEmail = email.trim().toLowerCase();
  }

  const payload = {
    otp: String(otp).trim(),
    role: role === "CUSTOMER" ? "USER" : (role || "USER"),
    referralCode: referralCode || undefined,
  };
  if (name) payload.name = name;
  if (userEmail) payload.email = userEmail;
  if (cleanPhone) payload.phone = cleanPhone;

  const data = await apiRequest("POST", "/api/v1/mehndigo/user/verify-otp", payload);
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
    role: role === "CUSTOMER" ? "USER" : role,
  });
  return persistAuthData(data);
}

export async function loginWithEmail(email, role) {
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/login", {
    email: email ? String(email).trim().toLowerCase() : "",
    role: role === "CUSTOMER" ? "USER" : role,
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
  const token = extractToken(payload);
  if (token) {
    await secureStorage.setAccessToken(token);
  }
  if (payload.refreshToken) {
    await secureStorage.setRefreshToken(payload.refreshToken);
  }
  return token;
}

export async function signOut() {
  try {
    await apiRequest("POST", "/auth/logout").catch(() => {});
  } catch (_) {}
  try {
    await removeNotificationToken();
  } catch (_) {}
  await secureStorage.clearAll();
}

