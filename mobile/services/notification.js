import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import Colors from "../constants/Colors";
import { secureStorage } from "../utils/storage";

let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch (err) {
  console.log("[PushNotification] expo-notifications module not loaded:", err.message);
}

try {
  if (Notifications && typeof Notifications.setNotificationHandler === "function") {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (err) {
  console.log("[PushNotification] Skipped notification handler set:", err.message);
}

// Environment Detection
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

export async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    "2e825d37-ae6b-4083-8fe7-f7a7576722c9";

  const androidPackage = Constants.expoConfig?.android?.package || "com.sonuy123.mehendigoo";
  const hasGoogleServicesConfig = !!Constants.expoConfig?.android?.googleServicesFile;

  // Clear diagnostic logs for build verification
  console.log("[PushNotification Diagnostic]", {
    runningInExpoGo: isExpoGo,
    physicalDevice: Device.isDevice,
    androidPackage,
    easProjectIdValid: !!projectId,
    googleServicesFileConfigured: hasGoogleServicesConfig,
    tokenType: "Expo Push Token (ExponentPushToken)"
  });

  // 1. Skip in Expo Go container (Expo Go does not bundle custom google-services.json)
  if (isExpoGo) {
    console.log(
      "[PushNotification] Environment: Expo Go container detected. Remote FCM push registration skipped. Use Development Build or Standalone APK for push testing."
    );
    return null;
  }

  try {
    // 2. Physical Device check
    if (!Device.isDevice) {
      console.log("[PushNotification] Physical device required for push notifications. Emulator detected.");
      return null;
    }

    // 3. Permission Request
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("[PushNotification] Requesting notification permissions...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    console.log(`[PushNotification] Push permission: ${finalStatus}`);
    if (finalStatus !== "granted") {
      console.log("[PushNotification] Notification permission denied by user.");
      return null;
    }

    // 4. Android Notification Channels (Omit sound: "default" to use native system default sound without loading R.raw.default)
    if (Platform.OS === "android") {
      console.log("[PushNotification] Configuring Android notification channels...");
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.primary,
      });

      await Notifications.setNotificationChannelAsync("bookings", {
        name: "Bookings",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.primary,
      });

      await Notifications.setNotificationChannelAsync("payments", {
        name: "Payments",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.primary,
      });

      await Notifications.setNotificationChannelAsync("promotions", {
        name: "Promotions",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // 5. Fetch Expo Push Token
    console.log("[PushNotification] Fetching Expo Push Token...");
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData?.data;
    if (token) {
      console.log(`[PushNotification] Expo Push Token generated successfully: ${token.substring(0, 25)}...`);
    } else {
      console.log("[PushNotification] Could not generate Expo Push Token.");
    }

    return token;
  } catch (err) {
    console.log("[PushNotification] Push token fetch failed:", err.message);
    return null;
  }
}

import apiRequest from "./api";

export async function sendNotificationTokenToServer(token) {
  if (!token) return;
  try {
    const existingToken = await secureStorage.getNotificationToken();
    if (existingToken === token) {
      console.log("[PushNotification] Push token saved to backend successfully (cached).");
      return;
    }

    console.log("[PushNotification] Registering token on backend...");
    await apiRequest("POST", "/notification/register-token", {
      token,
      device_type: Platform.OS === "ios" ? "IOS" : "ANDROID"
    }, true);

    await secureStorage.setNotificationToken(token);
    console.log("[PushNotification] Push token saved to backend successfully");
  } catch (err) {
    console.log("[PushNotification] Error registering push token on server:", err.message);
  }
}

export async function removeNotificationToken() {
  try {
    const token = await secureStorage.getNotificationToken();
    if (!token) return;

    await apiRequest("DELETE", "/notification/remove-token", { token }, true);
  } catch (err) {
    console.log("[PushNotification] Error removing push token from server:", err.message);
  } finally {
    await secureStorage.removeNotificationToken();
  }
}

export async function scheduleLocalNotification({ title, body, data, delaySeconds = 0 }) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        ...(Platform.OS === "android" && { channelId: data?.channelId || "default" }),
      },
      trigger: delaySeconds > 0
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds }
        : null,
    });
  } catch (err) {
    console.log("[PushNotification] Failed to schedule local notification:", err.message);
  }
}

export function addNotificationReceivedListener(callback) {
  if (!Notifications) return { remove: () => {} };
  try {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      callback(notification);
    });
    return subscription;
  } catch (err) {
    console.log("[PushNotification] Could not register notification received listener:", err.message);
    return { remove: () => {} };
  }
}

export function addNotificationResponseReceivedListener(callback) {
  if (!Notifications) return { remove: () => {} };
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      callback(response);
    });
    return subscription;
  } catch (err) {
    console.log("[PushNotification] Could not register notification response listener:", err.message);
    return { remove: () => {} };
  }
}

export function getLastNotificationResponse() {
  if (!Notifications) return Promise.resolve(null);
  try {
    return Notifications.getLastNotificationResponseAsync();
  } catch (err) {
    return Promise.resolve(null);
  }
}

export async function getBadgeCount() {
  if (!Notifications) return 0;
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (err) {
    return 0;
  }
}

export async function setBadgeCount(count) {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (err) {
    // Fail silently
  }
}

export async function clearBadge() {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (err) {
    // Fail silently
  }
}
