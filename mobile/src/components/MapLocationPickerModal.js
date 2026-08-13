import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import Colors from "../constants/Colors";
import { reverseGeocodeCoords, isValidCoordinate } from "../utils/locationManager";

const { width, height } = Dimensions.get("window");

export default function MapLocationPickerModal({
  visible,
  onClose,
  initialLocation,
  onConfirmLocation,
}) {
  const mapRef = useRef(null);

  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude && isValidCoordinate(initialLocation.latitude, initialLocation.longitude) ? initialLocation.latitude : 26.9124,
    longitude: initialLocation?.longitude && isValidCoordinate(initialLocation.latitude, initialLocation.longitude) ? initialLocation.longitude : 75.7873,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [selectedCoords, setSelectedCoords] = useState({
    latitude: initialLocation?.latitude && isValidCoordinate(initialLocation.latitude, initialLocation.longitude) ? initialLocation.latitude : 26.9124,
    longitude: initialLocation?.longitude && isValidCoordinate(initialLocation.latitude, initialLocation.longitude) ? initialLocation.longitude : 75.7873,
  });

  const [addressDetails, setAddressDetails] = useState(initialLocation?.fullAddress || initialLocation?.address || "Fetching address...");
  const [geocodedData, setGeocodedData] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  useEffect(() => {
    if (visible && initialLocation && isValidCoordinate(initialLocation.latitude, initialLocation.longitude)) {
      const newLat = Number(initialLocation.latitude);
      const newLng = Number(initialLocation.longitude);
      setSelectedCoords({ latitude: newLat, longitude: newLng });
      setRegion({
        latitude: newLat,
        longitude: newLng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: newLat,
          longitude: newLng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      }

      fetchAddressForCoords(newLat, newLng);
    }
  }, [visible, initialLocation]);

  const fetchAddressForCoords = async (lat, lng) => {
    if (!isValidCoordinate(lat, lng)) return;
    setLoadingAddress(true);
    try {
      const res = await reverseGeocodeCoords(lat, lng);
      setGeocodedData(res);
      setAddressDetails(res.fullAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (err) {
      console.log("Map reverse geocode error:", err.message);
      setAddressDetails(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleMarkerDragEnd = (e) => {
    const coords = e.nativeEvent.coordinate;
    if (isValidCoordinate(coords.latitude, coords.longitude)) {
      setSelectedCoords(coords);
      fetchAddressForCoords(coords.latitude, coords.longitude);
    }
  };

  const handleRegionChangeComplete = (newRegion) => {
    if (isValidCoordinate(newRegion.latitude, newRegion.longitude)) {
      setSelectedCoords({ latitude: newRegion.latitude, longitude: newRegion.longitude });
      fetchAddressForCoords(newRegion.latitude, newRegion.longitude);
    }
  };

  const handleConfirm = () => {
    if (!isValidCoordinate(selectedCoords.latitude, selectedCoords.longitude)) {
      return;
    }

    const payload = {
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
      fullAddress: addressDetails,
      address: addressDetails,
      houseFlat: geocodedData?.houseFlat || "",
      landmark: geocodedData?.landmark || "",
      city: geocodedData?.city || "",
      state: geocodedData?.state || "",
      pincode: geocodedData?.pincode || "",
      source: "MAP_PICKER",
    };

    onConfirmLocation(payload);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Location on Map</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Instruction Banner */}
        <View style={styles.instructionBanner}>
          <Ionicons name="hand-right-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.instructionText}>Move map or drag pin to adjust your exact location</Text>
        </View>

        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            <Marker
              coordinate={selectedCoords}
              draggable
              onDragEnd={handleMarkerDragEnd}
              title="Booking Location"
              description={addressDetails}
            >
              <View style={styles.pinContainer}>
                <View style={styles.pinBubble}>
                  <Ionicons name="location" size={26} color={Colors.primary} />
                </View>
                <View style={styles.pinPointer} />
              </View>
            </Marker>
          </MapView>
        </View>

        {/* Footer Address Preview & Confirm */}
        <View style={styles.footer}>
          <View style={styles.addressBox}>
            <Ionicons name="location-sharp" size={22} color={Colors.primary} style={{ marginTop: 2, marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>SELECTED LOCATION</Text>
              {loadingAddress ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: "flex-start", marginVertical: 4 }} />
              ) : (
                <Text style={styles.addressText} numberOfLines={2}>{addressDetails}</Text>
              )}
              <Text style={styles.coordsSubText}>
                Lat: {selectedCoords.latitude.toFixed(6)} | Lng: {selectedCoords.longitude.toFixed(6)}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  instructionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  instructionText: { fontSize: 13, color: "#B45309", fontWeight: "600" },
  mapContainer: { flex: 1 },
  map: { width: "100%", height: "100%" },
  pinContainer: { alignItems: "center", justifyContent: "center" },
  pinBubble: {
    backgroundColor: Colors.white,
    padding: 6,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pinPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.primary,
    marginTop: -2,
  },
  footer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  addressBox: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  addressLabel: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 0.5, marginBottom: 2 },
  addressText: { fontSize: 13, fontWeight: "600", color: Colors.text, lineHeight: 18 },
  coordsSubText: { fontSize: 11, color: Colors.textTertiary, marginTop: 4 },
  confirmBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnText: { color: Colors.white, fontWeight: "700", fontSize: 15 },
});
