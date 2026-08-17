import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateArtistLocation } from "./booking";

const TRACKING_TASK_NAME = "artist-live-tracking";
const CONFIG_KEY = "@mehndigo_active_tracking_config";
const LAST_LOC_KEY = "@mehndigo_last_sent_location";

let foregroundSubscription = null;
let activeTrackingConfig = null;
let mockInterval = null;

// Haversine formula to calculate distance in KM between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

let lastUpdateTimestamp = Date.now();
let staleCheckInterval = null;

// Handler for processing real-time location updates
async function handleLocationUpdate(location) {
  try {
    if (!activeTrackingConfig) {
      const stored = await AsyncStorage.getItem(CONFIG_KEY);
      if (stored) {
        activeTrackingConfig = JSON.parse(stored);
      }
    }

    if (!activeTrackingConfig) {
      console.log("[TrackingService] No active tracking config. Stopping.");
      stopTracking();
      return;
    }

    const { bookingId, artistId } = activeTrackingConfig;
    const { coords, timestamp } = location;
    const { latitude, longitude, heading, speed, accuracy } = coords;

    lastUpdateTimestamp = timestamp || Date.now();

    // 1. [ARTIST REAL GPS] Log
    console.log("[ARTIST REAL GPS]");
    console.log("latitude:", latitude);
    console.log("longitude:", longitude);
    console.log("accuracy:", accuracy || "High");
    console.log("timestamp:", new Date(lastUpdateTimestamp).toISOString());

    // 2. Send API Update
    const apiRes = await updateArtistLocation({
      bookingId: Number(bookingId),
      artistId: Number(artistId),
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      timestamp: lastUpdateTimestamp
    }).catch(err => {
      console.warn("[ARTIST LOCATION API] Failed:", err.message);
      return { success: false };
    });

    // 3. [ARTIST LOCATION API] Log
    console.log("[ARTIST LOCATION API]");
    console.log("latitude:", latitude);
    console.log("longitude:", longitude);
    console.log("timestamp:", new Date(lastUpdateTimestamp).toISOString());
    console.log("success:", apiRes?.success ?? true);

    // Update last sent location in storage
    await AsyncStorage.setItem(
      LAST_LOC_KEY,
      JSON.stringify({
        latitude,
        longitude,
        timestamp: lastUpdateTimestamp
      })
    );
  } catch (err) {
    console.warn("[TrackingService] handleLocationUpdate failed:", err.message);
  }
}

// Define the background task
TaskManager.defineTask(TRACKING_TASK_NAME, async ({ data: { locations }, error }) => {
  if (error) {
    console.error("[TrackingService] TaskManager background error:", error);
    return;
  }
  if (locations && locations.length > 0) {
    const location = locations[0];
    await handleLocationUpdate(location);
  }
});

/**
 * Start real-time high-accuracy GPS tracking on the Artist side.
 * Production tracking uses REAL device GPS ONLY (No Mock Publisher).
 */
export async function startTracking(bookingId, artistId) {
  try {
    // Duplicate watcher guard: if watcher is already active for this booking, reuse it!
    if (activeTrackingConfig && Number(activeTrackingConfig.bookingId) === Number(bookingId) && foregroundSubscription) {
      console.log(`[TrackingService] Real GPS watcher already active for Booking ${bookingId}. Reusing existing watcher.`);
      return;
    }

    console.log(`[TrackingService] Starting REAL GPS tracking for Booking ${bookingId}...`);

    // 1. Save config
    activeTrackingConfig = { bookingId, artistId };
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(activeTrackingConfig));
    await AsyncStorage.removeItem(LAST_LOC_KEY);

    // Clear any mock intervals if running
    if (mockInterval) {
      clearInterval(mockInterval);
      mockInterval = null;
    }

    // 2. Check and Request Location permissions
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    const providerStatus = await Location.getProviderStatusAsync();

    // [GPS STATUS] Log
    console.log("[GPS STATUS]");
    console.log("permission:", fgStatus);
    console.log("locationServicesEnabled:", providerStatus.locationServicesEnabled || providerStatus.gpsEnabled);

    if (fgStatus !== "granted") {
      throw new Error("Location permission required for live tracking. Please grant permission.");
    }

    if (!providerStatus.gpsEnabled && !providerStatus.locationServicesEnabled) {
      const { Platform } = require("react-native");
      if (Platform.OS === "android") {
        try {
          await Location.enableNetworkProviderAsync();
        } catch (providerErr) {
          console.warn("Failed to enable network provider:", providerErr.message);
        }
      }
      const finalStatus = await Location.getProviderStatusAsync();
      if (!finalStatus.gpsEnabled && !finalStatus.locationServicesEnabled) {
        throw new Error("Please enable Location/GPS services on your device to start live tracking.");
      }
    }

    lastUpdateTimestamp = Date.now();

    // Fetch immediate initial location fix
    try {
      const initialLoc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
      ]).catch(async () => {
        return await Location.getLastKnownPositionAsync({});
      });

      if (initialLoc) {
        await handleLocationUpdate(initialLoc);
      }
    } catch (_) {}

    // 3. Start real-time foreground watcher (updates every 3 seconds)
    if (foregroundSubscription) {
      try {
        if (typeof foregroundSubscription.remove === "function") {
          foregroundSubscription.remove();
        } else if (typeof foregroundSubscription === "function") {
          foregroundSubscription();
        }
      } catch (_) {}
      foregroundSubscription = null;
    }

    foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 0
      },
      async (location) => {
        await handleLocationUpdate(location);
      }
    );

    // Start Stale Location Watcher with proactive auto-recovery
    if (staleCheckInterval) clearInterval(staleCheckInterval);
    staleCheckInterval = setInterval(async () => {
      const elapsed = (Date.now() - lastUpdateTimestamp) / 1000;
      if (elapsed > 15 && activeTrackingConfig) {
        try {
          const freshLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          }).catch(async () => await Location.getLastKnownPositionAsync({}));

          if (freshLoc) {
            await handleLocationUpdate(freshLoc);
          } else if (elapsed > 60) {
            console.log(`[ARTIST GPS INFO] Device stationary for ${Math.round(elapsed)}s.`);
          }
        } catch (_) {}
      }
    }, 10000);

    // 4. Try starting background tracking if permissions allow
    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === "granted") {
        const hasStartedBg = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
        if (hasStartedBg) {
          await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
        }

        await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 0,
          foregroundService: {
            notificationTitle: "MehndiGo Location Sharing",
            notificationBody: "Sharing your live GPS location with customer.",
            notificationColor: "#FF4D6D"
          }
        });
        console.log("[TrackingService] Background real GPS tracking started successfully.");
      }
    } catch (bgErr) {
      console.log("[TrackingService] Running in high-accuracy foreground tracking mode.");
    }
  } catch (err) {
    console.error("[TrackingService] startTracking failed:", err.message);
    throw err;
  }
}

/**
 * Stop location tracking and release resources
 */
export async function stopTracking() {
  try {
    console.log("[TrackingService] Stopping location tracking...");
    activeTrackingConfig = null;
    await AsyncStorage.removeItem(CONFIG_KEY);
    await AsyncStorage.removeItem(LAST_LOC_KEY);

    if (foregroundSubscription) {
      try {
        if (typeof foregroundSubscription.remove === "function") {
          foregroundSubscription.remove();
        } else if (typeof foregroundSubscription === "function") {
          foregroundSubscription();
        }
      } catch (subErr) {
        console.log("[TrackingService] Subscription removal catch:", subErr.message);
      }
      foregroundSubscription = null;
    }

    if (mockInterval) {
      clearInterval(mockInterval);
      mockInterval = null;
    }

    try {
      const hasStartedBg = await TaskManager.isTaskRegisteredAsync(TRACKING_TASK_NAME);
      if (hasStartedBg) {
        await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
        console.log("[TrackingService] Background location updates stopped.");
      }
    } catch (bgStopErr) {
      console.warn("[TrackingService] Failed to stop background updates:", bgStopErr.message);
    }
  } catch (err) {
    console.error("[TrackingService] stopTracking failed:", err.message);
  }
}

/**
 * Check if tracking is currently active in context
 */
export async function isTrackingActive() {
  try {
    const config = await AsyncStorage.getItem(CONFIG_KEY);
    return !!config;
  } catch {
    return false;
  }
}
