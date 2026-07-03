import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import Colors from "../constants/Colors";
import { secureStorage } from "../utils/storage";

let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch (err) {
  console.log("Push notifications skipped in local Expo Go environment:", err.message);
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
  console.log("Skipped notification handler set:", err.message);
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;
  try {
    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    const token = tokenData.data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.primary,
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("bookings", {
        name: "Bookings",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.primary,
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("payments", {
        name: "Payments",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.primary,
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("promotions", {
        name: "Promotions",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
    }

    return token;
  } catch (err) {
    console.warn("Push notifications not supported in Expo Go container:", err.message);
    return null;
  }
}

import apiRequest from "./api";

export async function sendNotificationTokenToServer(token) {
  try {
    const existingToken = await secureStorage.getNotificationToken();
    if (existingToken === token) return;

    await apiRequest("POST", "/notification/register-token", {
      token,
      device_type: Platform.OS === "ios" ? "IOS" : "ANDROID"
    }, true);

    await secureStorage.setNotificationToken(token);
  } catch (err) {
    console.log("Error registering push token on server:", err.message);
  }
}

export async function removeNotificationToken() {
  try {
    const token = await secureStorage.getNotificationToken();
    if (!token) return;

    await apiRequest("DELETE", "/notification/remove-token", { token }, true);
  } catch (err) {
    console.log("Error removing push token from server:", err.message);
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
        sound: "default",
        ...(Platform.OS === "android" && { channelId: data?.channelId || "default" }),
      },
      trigger: delaySeconds > 0
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds }
        : null,
    });
  } catch (err) {
    console.warn("Failed to schedule local notification:", err.message);
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
    console.warn("Could not register notification received listener:", err.message);
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
    console.warn("Could not register notification response listener:", err.message);
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
