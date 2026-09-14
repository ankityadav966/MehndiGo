import { Linking, Platform } from "react-native";
import Constants from "expo-constants";
import { BASE_URL } from "./api";

export const APP_PACKAGE_NAME =
  Constants.expoConfig?.android?.package ||
  Constants.manifest2?.extra?.expoClient?.android?.package ||
  "com.sonuy123.mehendigoo";

/**
 * Get the currently installed app version string
 */
export const getCurrentAppVersion = () => {
  return (
    Constants.expoConfig?.version ||
    Constants.nativeAppVersion ||
    Constants.manifest2?.extra?.expoClient?.version ||
    Constants.manifest?.version ||
    "1.1.3"
  );
};

/**
 * Compare two semantic version strings.
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v1 is older)
 *   0 if v1 === v2
 */
export const compareVersions = (v1, v2) => {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;

  const sanitize = (v) =>
    String(v)
      .trim()
      .replace(/^v/i, "")
      .split("-")[0]
      .split("+")[0];

  const s1 = sanitize(v1);
  const s2 = sanitize(v2);

  const parts1 = s1.split(".").map((p) => parseInt(p, 10) || 0);
  const parts2 = s2.split(".").map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] !== undefined ? parts1[i] : 0;
    const p2 = parts2[i] !== undefined ? parts2[i] : 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
};

/**
 * Fetch the latest version available on Google Play Store
 */
export const fetchPlayStoreVersion = async (packageName = APP_PACKAGE_NAME) => {
  // 1. Direct Google Play Store Fetch
  try {
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${packageName}&hl=en&gl=US`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

    const response = await fetch(playStoreUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: controller ? controller.signal : undefined,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();

      // Targeted match 1: Google Play internal proto key "141" containing software version
      const m141 = html.match(/"141":\s*\[\[\["([0-9]+(?:\.[0-9]+)+)"\]\]/);
      if (m141 && m141[1]) {
        return m141[1].trim();
      }

      // Generic match 2: [[[ "X.Y.Z" ]]]
      const mGeneric = html.match(/\[\[\["([0-9]+(?:\.[0-9]+)+)"\]\]/);
      if (mGeneric && mGeneric[1]) {
        return mGeneric[1].trim();
      }

      // Match 3: itemprop="softwareVersion"
      const mProp = html.match(/itemprop="softwareVersion"[^>]*>\s*([0-9.]+)/i);
      if (mProp && mProp[1]) {
        return mProp[1].trim();
      }

      // Match 4: Array structure ["X.Y.Z"]
      const mArray = html.match(/\["([0-9]+\.[0-9]+\.[0-9]+)"\]/);
      if (mArray && mArray[1]) {
        return mArray[1].trim();
      }
    }
  } catch (err) {
    if (__DEV__) {
      console.log("[AppUpdate] Direct Play Store fetch failed, trying fallback:", err.message);
    }
  }

  // 2. Secondary Fallback: Backend Version API Endpoint
  try {
    const fallbackUrl = `${BASE_URL.replace(/\/+$/, "")}/app/version`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    const response = await fetch(fallbackUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller ? controller.signal : undefined,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.latestVersion) {
        return String(data.latestVersion).trim();
      }
    }
  } catch (err) {
    if (__DEV__) {
      console.log("[AppUpdate] Fallback version endpoint unreachable:", err.message);
    }
  }

  return null;
};

/**
 * Open the MehndiGo Google Play Store page
 */
export const openPlayStore = async (packageName = APP_PACKAGE_NAME) => {
  const marketUrl = `market://details?id=${packageName}`;
  const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;

  try {
    const canOpen = await Linking.canOpenURL(marketUrl);
    if (canOpen) {
      await Linking.openURL(marketUrl);
      return;
    }
  } catch (e) {
    if (__DEV__) console.log("[AppUpdate] market:// link not supported directly:", e.message);
  }

  try {
    await Linking.openURL(webUrl);
  } catch (e) {
    if (__DEV__) console.error("[AppUpdate] Failed to open Play Store link:", e.message);
  }
};

/**
 * Display the update popup modal
 */
export const showUpdatePopup = async ({ onUpdate, onLater } = {}) => {
  // Wait briefly if global confirmation modal is still initializing on app start
  let attempts = 0;
  while (!global.showConfirmationModal && attempts < 15) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }

  const handleUpdate = () => {
    if (typeof onUpdate === "function") {
      onUpdate();
    } else {
      openPlayStore();
    }
  };

  const handleLater = () => {
    if (typeof onLater === "function") {
      onLater();
    }
  };

  if (global.showConfirmationModal) {
    global.showConfirmationModal({
      title: "New Update Available",
      description: "A new version of MehndiGo is available. Update now for the best experience.",
      confirmText: "Update Now",
      cancelText: "Later",
      type: "update",
      dismissible: true,
      onConfirm: handleUpdate,
      onCancel: handleLater,
    });
  } else {
    // Standard React Native Alert fallback
    const { Alert } = require("react-native");
    Alert.alert(
      "New Update Available",
      "A new version of MehndiGo is available. Update now for the best experience.",
      [
        { text: "Later", style: "cancel", onPress: handleLater },
        { text: "Update Now", onPress: handleUpdate },
      ],
      { cancelable: true }
    );
  }
};

/**
 * Main update checker to be called when the app opens.
 * Compares installed app version with latest version on Google Play Store.
 * If an update is available, displays the update popup.
 * If no update is available or the network fails, does nothing.
 */
export const checkForAppUpdate = async () => {
  try {
    // Only check on mobile platforms
    if (Platform.OS !== "android" && Platform.OS !== "ios") {
      return;
    }

    const currentVersion = getCurrentAppVersion();
    const playStoreVersion = await fetchPlayStoreVersion();

    if (!playStoreVersion) {
      if (__DEV__) console.log("[AppUpdate] No Play Store version resolved. Skipping check.");
      return;
    }

    if (__DEV__) {
      console.log(
        `[AppUpdate] Installed: ${currentVersion} | Play Store: ${playStoreVersion}`
      );
    }

    const isNewer = compareVersions(playStoreVersion, currentVersion) > 0;
    if (isNewer) {
      if (__DEV__) {
        console.log(`[AppUpdate] Newer version available (${playStoreVersion} > ${currentVersion}). Showing update popup.`);
      }
      await showUpdatePopup();
    } else {
      if (__DEV__) {
        console.log("[AppUpdate] Installed version is up to date. No popup shown.");
      }
    }
  } catch (error) {
    // Graceful silent failure on network issues or unexpected errors
    if (__DEV__) {
      console.log("[AppUpdate] Update check encountered error:", error.message);
    }
  }
};

export default {
  APP_PACKAGE_NAME,
  getCurrentAppVersion,
  compareVersions,
  fetchPlayStoreVersion,
  openPlayStore,
  showUpdatePopup,
  checkForAppUpdate,
};
