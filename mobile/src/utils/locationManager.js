import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Linking, Alert } from "react-native";

export const ACTIVE_ADDRESS_KEY = "@mehndigo_active_address";

const addressSubscribers = new Set();

/**
 * Validate numeric coordinates (latitude: -90 to 90, longitude: -180 to 180, non-zero)
 */
export function isValidCoordinate(latitude, longitude) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Validate 6-digit Indian Pincode format (e.g. 302001, 110001)
 */
export function validateIndianPincode(pincode) {
  if (!pincode) return false;
  const cleanPin = String(pincode).trim().replace(/[^0-9]/g, "");
  return /^[1-9][0-9]{5}$/.test(cleanPin);
}

/**
 * Subscribe to active address changes across the app
 */
export function subscribeActiveAddress(callback) {
  addressSubscribers.add(callback);
  return () => addressSubscribers.delete(callback);
}

function notifySubscribers(address) {
  addressSubscribers.forEach((cb) => {
    try {
      cb(address);
    } catch (e) {
      console.log("Subscriber notification error:", e.message);
    }
  });
}

/**
 * Get active cached service address from AsyncStorage
 */
export async function getActiveAddress() {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_ADDRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidCoordinate(parsed.latitude, parsed.longitude)) {
        return parsed;
      }
    }
  } catch (e) {
    console.log("Error reading active address:", e.message);
  }
  return null;
}

/**
 * Cache and update active service address
 */
export async function setActiveAddress(address) {
  try {
    if (address) {
      const lat = parseFloat(address.latitude);
      const lng = parseFloat(address.longitude);
      const valid = isValidCoordinate(lat, lng);

      const normalized = {
        id: address.id || null,
        label: address.label || address.name || "Service Location",
        fullAddress:
          address.fullAddress ||
          address.address_line_1 ||
          address.addressLine1 ||
          [address.house_flat || address.houseFlat, address.landmark, address.city, address.state]
            .filter(Boolean)
            .join(", "),
        houseFlat: address.house_flat || address.houseFlat || address.address_line_2 || "",
        landmark: address.landmark || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
        latitude: valid ? lat : null,
        longitude: valid ? lng : null,
        accuracy: Number(address.accuracy || address.location_accuracy || 0),
        source: String(address.source || address.location_source || "MANUAL").toUpperCase(),
        isDefault: !!(address.is_default || address.isDefault),
      };

      await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, JSON.stringify(normalized));
      notifySubscribers(normalized);
      return normalized;
    }
  } catch (e) {
    console.log("Error saving active address:", e.message);
  }
  return null;
}

/**
 * Haversine formula to calculate distance between 2 coordinates in kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) return 0;
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Reverse geocode latitude and longitude to a human-readable address
 */
export async function reverseGeocodeCoords(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) {
    return { fullAddress: "", city: "", state: "", pincode: "", latitude: null, longitude: null };
  }

  try {
    const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geocode && geocode.length > 0) {
      const g = geocode[0];
      const nameStr = g.name && g.name !== g.street ? g.name : "";
      const streetStr = g.street || g.district || "";
      const cityStr = g.city || g.subregion || g.region || "";
      const stateStr = g.region || "";
      const pincodeStr = g.postalCode || "";
      const fullAddress = [nameStr, streetStr, cityStr, stateStr, pincodeStr].filter(Boolean).join(", ");

      return {
        fullAddress: fullAddress || [cityStr, stateStr].filter(Boolean).join(", "),
        houseFlat: nameStr,
        landmark: streetStr,
        city: cityStr,
        state: stateStr,
        pincode: pincodeStr,
        latitude,
        longitude,
      };
    }
  } catch (e) {
    console.log("Reverse geocode error:", e.message);
  }

  return {
    fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    city: "",
    state: "",
    pincode: "",
    latitude,
    longitude,
  };
}

/**
 * Capture current GPS location with high accuracy, permissions check, GPS ON check, and accuracy threshold
 */
export async function getCurrentGPSLocationWithAccuracy() {
  console.log("[LOCATION_REQUEST] Source: GPS");

  // Step 1: Check location services enabled
  const enabled = await Location.hasServicesEnabledAsync().catch(() => false);
  if (!enabled) {
    try {
      await Location.enableNetworkProviderAsync().catch(() => {});
    } catch (e) {}
    const recheckEnabled = await Location.hasServicesEnabledAsync().catch(() => false);
    if (!recheckEnabled) {
      throw {
        code: "GPS_DISABLED",
        message: "Device Location / GPS is turned OFF. Please turn on Location services in settings.",
      };
    }
  }

  // Step 2: Request foreground permissions
  const perm = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: "denied", canAskAgain: false }));
  console.log("[LOCATION_PERMISSION] Status:", perm.status);

  if (perm.status !== "granted") {
    if (!perm.canAskAgain) {
      throw {
        code: "PERMISSION_PERMANENTLY_DENIED",
        message: "Location permission is required to use your current location.",
      };
    }
    throw {
      code: "PERMISSION_DENIED",
      message: "Location permission denied. Please allow location access to continue.",
    };
  }

  // Step 3: Fetch high accuracy position
  let pos = null;
  try {
    pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  } catch (e) {
    console.log("High accuracy position fetch failed, trying balanced:", e.message);
    pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
  }

  if (!pos || !pos.coords) {
    pos = await Location.getLastKnownPositionAsync({}).catch(() => null);
  }

  if (!pos || !pos.coords || !isValidCoordinate(pos.coords.latitude, pos.coords.longitude)) {
    throw {
      code: "COORDINATE_FETCH_FAILED",
      message: "Failed to obtain accurate GPS coordinates. Please move to an open area and try again.",
    };
  }

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const accuracy = pos.coords.accuracy || 0;

  console.log(`[GPS_LOCATION] Latitude: ${lat}, Longitude: ${lng}, Accuracy: ${accuracy}m`);

  const lowAccuracy = accuracy > 150; // threshold > 150 meters is low accuracy

  const geocoded = await reverseGeocodeCoords(lat, lng);
  console.log("[GEOCODE_SUCCESS] Address:", geocoded.fullAddress);

  return {
    latitude: lat,
    longitude: lng,
    accuracy,
    source: "GPS",
    lowAccuracy,
    geocoded,
  };
}

/**
 * Forward geocode a manual address string to numeric coordinates
 */
export async function geocodeManualAddress(addressString) {
  if (!addressString || !addressString.trim()) {
    throw new Error("Please enter a valid address to locate on map.");
  }
  try {
    const results = await Location.geocodeAsync(addressString.trim());
    if (results && results.length > 0) {
      const first = results[0];
      if (isValidCoordinate(first.latitude, first.longitude)) {
        return {
          latitude: first.latitude,
          longitude: first.longitude,
          source: "MANUAL",
        };
      }
    }
  } catch (e) {
    console.log("Geocode manual address error:", e.message);
  }
  throw new Error("Unable to locate coordinates for this address. Please confirm location on map.");
}

/**
 * Smart Background Distance Check on App Launch
 */
export async function checkSmartLocationChange(primaryAddress, thresholdKm = 35) {
  if (!primaryAddress || !isValidCoordinate(primaryAddress.latitude, primaryAddress.longitude)) {
    return { isFar: false };
  }

  try {
    const perm = await Location.getForegroundPermissionsAsync().catch(() => ({ granted: false }));
    if (!perm.granted) return { isFar: false };

    const enabled = await Location.hasServicesEnabledAsync().catch(() => false);
    if (!enabled) return { isFar: false };

    let pos = await Location.getLastKnownPositionAsync({}).catch(() => null);
    if (!pos) {
      pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    }

    if (pos && pos.coords && isValidCoordinate(pos.coords.latitude, pos.coords.longitude)) {
      const currentLat = pos.coords.latitude;
      const currentLng = pos.coords.longitude;
      const distance = calculateDistanceKm(
        primaryAddress.latitude,
        primaryAddress.longitude,
        currentLat,
        currentLng
      );

      if (distance >= thresholdKm) {
        const geocoded = await reverseGeocodeCoords(currentLat, currentLng);
        return {
          isFar: true,
          distanceKm: distance,
          currentCoords: { latitude: currentLat, longitude: currentLng },
          geocodedAddress: geocoded,
        };
      }
    }
  } catch (e) {
    console.log("Smart location check failed silently:", e.message);
  }
  return { isFar: false };
}
