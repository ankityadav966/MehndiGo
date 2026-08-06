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
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/verify-otp", { email, otp });
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

export async function sendOtp(nameOrEmail, emailParam, phone, role) {
  console.log("Sending OTP request:", { nameOrEmail, emailParam, phone, role });
  let targetEmail = "";
  if (typeof nameOrEmail === "string" && nameOrEmail.includes("@")) {
    targetEmail = nameOrEmail.trim().toLowerCase();
  } else if (emailParam && String(emailParam).trim().length > 0) {
    targetEmail = String(emailParam).trim().toLowerCase();
  } else {
    const sanitized = sanitizePhone(phone);
    targetEmail = sanitized ? `${sanitized}@gmail.com` : "user@mehndigo.com";
  }

  const data = await apiRequest("POST", "/api/v1/mehndigo/user/send-otp", {
    email: targetEmail,
    phone: phone ? sanitizePhone(phone) : null,
    role: role === "CUSTOMER" ? "USER" : role,
  });
  return data;
}

export async function registerSendOtp(name, email, phone, role) {
  console.log("Sending register OTP request:", { name, email, phone, role });
  const sanitized = sanitizePhone(phone);
  const targetEmail = (email && String(email).trim().length > 0)
    ? String(email).trim().toLowerCase()
    : (sanitized ? `${sanitized}@gmail.com` : "user@mehndigo.com");

  const data = await apiRequest("POST", "/api/v1/mehndigo/user/register-send-otp", {
    name: name || "User",
    email: targetEmail,
    phone: sanitized || phone || null,
    role: role === "CUSTOMER" ? "USER" : role,
  });
  return data;
}

export async function registerVerifyOtp(email, otp, name, phone, role) {
  console.log("Verifying register OTP:", { email, otp, name, phone, role });
  const data = await apiRequest("POST", "/api/v1/mehndigo/user/register-verify-otp", {
    email,
    otp,
    name,
    phone,
    role,
  });
  return persistAuthData(data);
}

export async function verifyUserOtp(phoneOrEmail, otp, role, name, email, referralCode = "") {
  let isPhone = false;
  let phone = "";
  let userEmail = "";
  if (typeof phoneOrEmail === "string" && (phoneOrEmail.includes("@") || !phoneOrEmail)) {
    userEmail = phoneOrEmail || email || "";
  } else {
    isPhone = true;
    phone = sanitizePhone(phoneOrEmail);
    userEmail = email || "";
  }

  const payload = {
    otp,
    role: role === "CUSTOMER" ? "USER" : role,
    name: name || "",
    email: userEmail,
    referralCode,
  };
  if (isPhone && phone) {
    payload.phone = phone;
  } else {
    payload.email = userEmail;
  }

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
    email,
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
