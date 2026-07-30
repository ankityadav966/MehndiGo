import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEYS = {
  ACCESS_TOKEN: "token",
  REFRESH_TOKEN: "refresh_token",
  USER_DATA: "user",
  USER_ROLE: "user_role",
  ONBOARDING_COMPLETE: "onboarding_complete",
  ARTIST_PROFILE_COMPLETED: "artistProfileCompleted",
  NOTIFICATION_TOKEN: "notification_token",
  HAS_SEEN_ONBOARDING: "has_seen_onboarding",
};

export const secureStorage = {
  // Access Token
  setAccessToken: async (token) => {
    await AsyncStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
  },

  getAccessToken: async () => {
    return await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
  },

  removeAccessToken: async () => {
    await AsyncStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
  },

  // Save Tokens
  saveTokens: async (accessToken, refreshToken) => {
    const pairs = [];
    if (accessToken) pairs.push([TOKEN_KEYS.ACCESS_TOKEN, accessToken]);
    if (refreshToken) pairs.push([TOKEN_KEYS.REFRESH_TOKEN, refreshToken]);
    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
    }
  },

  // Refresh Token
  setRefreshToken: async (token) => {
    await AsyncStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, token);
  },


  getRefreshToken: async () => {
    return await AsyncStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
  },

  removeRefreshToken: async () => {
    await AsyncStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
  },

  // User Data
  setUserData: async (data) => {
    await AsyncStorage.setItem(TOKEN_KEYS.USER_DATA, JSON.stringify(data));
  },

  getUserData: async () => {
    const raw = await AsyncStorage.getItem(TOKEN_KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  },

  removeUserData: async () => {
    await AsyncStorage.removeItem(TOKEN_KEYS.USER_DATA);
  },

  // User Role
  setUserRole: async (role) => {
    await AsyncStorage.setItem(TOKEN_KEYS.USER_ROLE, role);
  },

  getUserRole: async () => {
    return await AsyncStorage.getItem(TOKEN_KEYS.USER_ROLE);
  },

  removeUserRole: async () => {
    await AsyncStorage.removeItem(TOKEN_KEYS.USER_ROLE);
  },

  // Notification Token
  setNotificationToken: async (token) => {
    await AsyncStorage.setItem(TOKEN_KEYS.NOTIFICATION_TOKEN, token);
  },

  getNotificationToken: async () => {
    return await AsyncStorage.getItem(TOKEN_KEYS.NOTIFICATION_TOKEN);
  },

  removeNotificationToken: async () => {
    await AsyncStorage.removeItem(TOKEN_KEYS.NOTIFICATION_TOKEN);
  },

  // Onboarding
  setHasSeenOnboarding: async (value) => {
    await AsyncStorage.setItem(
      TOKEN_KEYS.HAS_SEEN_ONBOARDING,
      JSON.stringify(value),
    );
  },

  getHasSeenOnboarding: async () => {
    const value = await AsyncStorage.getItem(TOKEN_KEYS.HAS_SEEN_ONBOARDING);
    return value ? JSON.parse(value) : false;
  },

  // Artist Onboarding (legacy, use setArtistProfileCompleted instead)
  setArtistOnboardingDone: async (value) => {
    await AsyncStorage.setItem("artist_onboarding_done", JSON.stringify(value));
  },

  getArtistOnboardingDone: async () => {
    const value = await AsyncStorage.getItem("artist_onboarding_done");
    return value ? JSON.parse(value) : false;
  },

  // Artist Profile Completed
  setArtistProfileCompleted: async (value) => {
    await AsyncStorage.setItem(TOKEN_KEYS.ARTIST_PROFILE_COMPLETED, JSON.stringify(value));
  },

  getArtistProfileCompleted: async () => {
    const value = await AsyncStorage.getItem(TOKEN_KEYS.ARTIST_PROFILE_COMPLETED);
    return value ? JSON.parse(value) : false;
  },

  // Theme preference
  setTheme: async (theme) => {
    await AsyncStorage.setItem("app_theme", theme);
  },

  getTheme: async () => {
    return await AsyncStorage.getItem("app_theme") || "light";
  },

  // Draft Booking State Recovery
  saveDraftBooking: async (draft) => {
    await AsyncStorage.setItem("@mehndigo_draft_booking", JSON.stringify(draft));
  },

  getDraftBooking: async () => {
    const raw = await AsyncStorage.getItem("@mehndigo_draft_booking");
    return raw ? JSON.parse(raw) : null;
  },

  clearDraftBooking: async () => {
    await AsyncStorage.removeItem("@mehndigo_draft_booking");
  },

  // Clear All
  clearAll: async () => {
    const keys = [...Object.values(TOKEN_KEYS), "artist_onboarding_done", "app_theme", "@mehndigo_draft_booking"];
    await AsyncStorage.multiRemove(keys);
  },
};

