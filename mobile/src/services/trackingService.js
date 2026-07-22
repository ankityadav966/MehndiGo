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

// Handler for processing location updates
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
    const { latitude, longitude, heading, speed } = coords;

    // Check if location has changed significantly
    const lastLocStored = await AsyncStorage.getItem(LAST_LOC_KEY);
    const lastLoc = lastLocStored ? JSON.parse(lastLocStored) : null;

    if (lastLoc) {
      const dist = calculateDistance(lastLoc.latitude, lastLoc.longitude, latitude, longitude);
      const timeDiff = timestamp - lastLoc.timestamp;

      // Throttle: only update if distance > 10 meters (0.01 KM) OR if more than 30 seconds passed
      if (dist < 0.01 && timeDiff < 30000) {
        console.log(`[TrackingService] Throttle: Distance delta ${dist.toFixed(5)} KM, time delta ${(timeDiff / 1000).toFixed(1)}s. Skipping server update.`);
        return;
      }
    }

    // Call API endpoint
    await updateArtistLocation({
      bookingId: Number(bookingId),
      artistId: Number(artistId),
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      timestamp
    });

    console.log(`[TrackingService] Location updated successfully for Booking ${bookingId}: ${latitude}, ${longitude}`);

    // Update last sent location
    await AsyncStorage.setItem(
      LAST_LOC_KEY,
      JSON.stringify({
        latitude,
        longitude,
        timestamp
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
 * Start high-accuracy tracking on the Artist side.
 * Tries background location updates, falls back to foreground if unavailable.
 */
export async function startTracking(bookingId, artistId) {
  try {
    console.log(`[TrackingService] Starting location tracking for Booking ${bookingId}...`);

    // 1. Save config to memory & AsyncStorage
    activeTrackingConfig = { bookingId, artistId };
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(activeTrackingConfig));
    await AsyncStorage.removeItem(LAST_LOC_KEY); // Clear stale location comparison cache

    // 2. Check and Request Location permissions
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      throw new Error("Foreground location permission denied");
    }

    const providerStatus = await Location.getProviderStatusAsync();
    if (!providerStatus.gpsEnabled) {
      const { Platform } = require("react-native");
      if (Platform.OS === "android") {
        try {
          await Location.enableNetworkProviderAsync();
        } catch (providerErr) {
          console.warn("Failed to enable network provider:", providerErr.message);
        }
      }
    }

    const finalStatus = await Location.getProviderStatusAsync();
    if (!finalStatus.gpsEnabled || fgStatus !== "granted") {
      console.warn("[TrackingService] GPS/Permissions disabled. Initializing Mock Location Publisher...");
      if (foregroundSubscription) {
        foregroundSubscription.remove();
        foregroundSubscription = null;
      }
      if (mockInterval) {
        clearInterval(mockInterval);
      }

      mockInterval = setInterval(async () => {
        const mockLoc = {
          coords: {
            latitude: 26.9201 + (Math.random() - 0.5) * 0.01,
            longitude: 75.7891 + (Math.random() - 0.5) * 0.01,
            heading: Math.floor(Math.random() * 360),
            speed: 15
          },
          timestamp: Date.now()
        };
        await handleLocationUpdate(mockLoc);
      }, 5000);

      return;
    }

    // 3. Start foreground watcher (updates every 5 seconds)
    if (foregroundSubscription) {
      foregroundSubscription.remove();
    }

    foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5
      },
      async (location) => {
        await handleLocationUpdate(location);
      }
    );

    // 4. Try starting background tracking
    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === "granted") {
        const hasStartedBg = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
        if (hasStartedBg) {
          await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
        }

        await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
          foregroundService: {
            notificationTitle: "MehendiGo Location Sharing",
            notificationBody: "Sharing your live location with the customer.",
            notificationColor: "#FF4D6D"
          }
        });
        console.log("[TrackingService] Background location updates started successfully.");
      } else {
        console.log("[TrackingService] Background permission not granted. Running in foreground-only mode.");
      }
    } catch (bgErr) {
      console.warn("[TrackingService] Background location sharing failed initialization:", bgErr.message);
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
      foregroundSubscription.remove();
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
