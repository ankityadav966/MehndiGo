import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

export const ACTIVE_ADDRESS_KEY = "@mehndigo_active_address";

let cachedActiveAddress = null;
const addressSubscribers = new Set();

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
      if (__DEV__) console.log("Subscriber notification notice:", e.message);
    }
  });
}

/**
 * Get active cached service address (in-memory fast path with AsyncStorage fallback)
 */
export async function getActiveAddress() {
  if (cachedActiveAddress) {
    return cachedActiveAddress;
  }
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_ADDRESS_KEY);
    if (raw) {
      cachedActiveAddress = JSON.parse(raw);
      return cachedActiveAddress;
    }
  } catch (e) {
    if (__DEV__) console.log("Error reading active address:", e.message);
  }
  return null;
}

/**
 * Synchronous in-memory getter for render paths
 */
export function getActiveAddressSync() {
  return cachedActiveAddress;
}

/**
 * Cache and update active service address
 */
export async function setActiveAddress(address) {
  try {
    if (address) {
      const normalized = {
        id: address.id || null,
        label: address.label || address.name || "Service Location",
        fullAddress:
          address.fullAddress ||
          address.address_line_1 ||
          address.addressLine1 ||
          [address.house_flat || address.houseFlat, address.landmark, address.city, address.state]
            .filter(Boolean)
            .join(", ") ||
          "Jaipur, Rajasthan",
        houseFlat: address.house_flat || address.houseFlat || address.address_line_2 || "",
        landmark: address.landmark || "",
        city: address.city || "Jaipur",
        state: address.state || "Rajasthan",
        pincode: address.pincode || "302001",
        latitude: parseFloat(address.latitude || 26.9124),
        longitude: parseFloat(address.longitude || 75.7873),
        isDefault: !!(address.is_default || address.isDefault),
      };
      cachedActiveAddress = normalized;
      await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, JSON.stringify(normalized));
      notifySubscribers(normalized);
      return normalized;
    }
  } catch (e) {
    if (__DEV__) console.log("Error saving active address:", e.message);
  }
  return null;
}

/**
 * Haversine formula to calculate distance between 2 coordinates in kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
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
  try {
    const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geocode && geocode.length > 0) {
      const g = geocode[0];
      const nameStr = g.name && g.name !== g.street ? g.name : "";
      const streetStr = g.street || g.district || "";
      const cityStr = g.city || g.subregion || g.region || "Jaipur";
      const stateStr = g.region || "Rajasthan";
      const pincodeStr = g.postalCode || "302001";
      const fullAddress = [nameStr, streetStr, cityStr, stateStr, pincodeStr].filter(Boolean).join(", ");

      return {
        fullAddress: fullAddress || `${cityStr}, ${stateStr}`,
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
    if (__DEV__) console.log("Reverse geocode notice:", e.message);
  }
  return {
    fullAddress: "Jaipur, Rajasthan",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    latitude,
    longitude,
  };
}

/**
 * Smart Background Distance Check on App Launch
 * Checks distance only if GPS permission is already granted.
 */
export async function checkSmartLocationChange(primaryAddress, thresholdKm = 35) {
  if (!primaryAddress || !primaryAddress.latitude || !primaryAddress.longitude) {
    return { isFar: false };
  }

  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return { isFar: false };

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) return { isFar: false };

    let pos = await Location.getLastKnownPositionAsync({});
    if (!pos) {
      pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }

    if (pos && pos.coords) {
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
    if (__DEV__) console.log("Smart location check notice:", e.message);
  }
  return { isFar: false };
}
