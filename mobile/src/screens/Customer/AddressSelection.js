import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import MapLocationPickerModal from "../../components/MapLocationPickerModal";
import {
  getCurrentGPSLocationWithAccuracy,
  geocodeManualAddress,
  isValidCoordinate,
  validateIndianPincode,
  reverseGeocodeCoords,
} from "../../utils/locationManager";

export default function AddressSelection({ route, navigation }) {
  const { artistId, serviceId, selectedDate, slotId, timeLabel } = route.params || {};

  const [locationSource, setLocationSource] = useState(null); // 'GPS' | 'MANUAL' | 'MAP_PICKER'

  const [houseFlat, setHouseFlat] = useState("");
  const [localityArea, setLocalityArea] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [fullAddressText, setFullAddressText] = useState("");

  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accuracy, setAccuracy] = useState(0);
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);

  const [showMapModal, setShowMapModal] = useState(false);

  const handleUseCurrentLocation = async () => {
    try {
      setLoading(true);
      setShowSettingsBtn(false);

      const res = await getCurrentGPSLocationWithAccuracy();

      setLatitude(res.latitude);
      setLongitude(res.longitude);
      setAccuracy(res.accuracy || 0);
      setLocationSource("GPS");

      if (res.geocoded) {
        const g = res.geocoded;
        if (g.houseFlat) setHouseFlat(g.houseFlat);
        if (g.landmark) setLandmark(g.landmark);
        setLocalityArea(g.landmark || g.city || "");
        setCity(g.city || "");
        setStateName(g.state || "");
        if (g.pincode) setPincode(g.pincode);
        setFullAddressText(g.fullAddress || "");
      }

      if (res.lowAccuracy) {
        Alert.alert(
          "Low GPS Accuracy",
          `Your location accuracy is low (~${Math.round(res.accuracy)}m). Please verify or adjust your pin on the map.`,
          [
            { text: "Confirm on Map", onPress: () => setShowMapModal(true) },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert("GPS Location Confirmed 🎉", "Your current location has been captured accurately.");
      }
    } catch (err) {
      console.log("GPS Location fetch error:", err);
      if (err?.code === "PERMISSION_PERMANENTLY_DENIED") {
        setShowSettingsBtn(true);
        Alert.alert(
          "Permission Required",
          "Location permission is required to use your current location. Please grant permission in app settings.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel" },
          ]
        );
      } else {
        Alert.alert(
          "Location Unavailable",
          err?.message || "Unable to fetch GPS location automatically. Please enter your address manually."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGeocodeAndConfirmOnMap = async () => {
    const constructed = [houseFlat, localityArea, landmark, city, stateName, pincode]
      .map((s) => (s || "").trim())
      .filter(Boolean)
      .join(", ");

    const targetAddress = constructed || fullAddressText.trim();

    if (!targetAddress) {
      Alert.alert("Address Required", "Please fill in your address details before confirming on map.");
      return;
    }

    if (pincode.trim() && !validateIndianPincode(pincode)) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit Indian postal pincode (e.g. 302001).");
      return;
    }

    setLoading(true);
    try {
      if (isValidCoordinate(latitude, longitude)) {
        setShowMapModal(true);
      } else {
        const geo = await geocodeManualAddress(targetAddress);
        setLatitude(geo.latitude);
        setLongitude(geo.longitude);
        setLocationSource("MAP_PICKER");
        setShowMapModal(true);
      }
    } catch (err) {
      Alert.alert(
        "Location Unresolved",
        "Could not automatically locate this address. Please pick your location directly on the map.",
        [{ text: "Open Map", onPress: () => setShowMapModal(true) }, { text: "Cancel" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMapConfirm = (mapData) => {
    if (isValidCoordinate(mapData.latitude, mapData.longitude)) {
      setLatitude(mapData.latitude);
      setLongitude(mapData.longitude);
      setLocationSource("MAP_PICKER");

      if (mapData.fullAddress) setFullAddressText(mapData.fullAddress);
      if (mapData.city) setCity(mapData.city);
      if (mapData.state) setStateName(mapData.state);
      if (mapData.pincode) setPincode(mapData.pincode);

      Alert.alert("Location Confirmed 📍", "Map location and exact coordinates have been updated.");
    }
  };

  const handleContinue = async () => {
    const constructedAddress = [houseFlat, localityArea, landmark, city, stateName, pincode]
      .map((s) => (s || "").trim())
      .filter(Boolean)
      .join(", ");

    const finalAddress = constructedAddress || fullAddressText.trim();

    if (!finalAddress) {
      Alert.alert("Input Error", "Please enter your appointment service address.");
      return;
    }

    if (pincode.trim() && !validateIndianPincode(pincode)) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit Indian pincode.");
      return;
    }

    let finalLat = latitude;
    let finalLng = longitude;

    if (!isValidCoordinate(finalLat, finalLng)) {
      setLoading(true);
      try {
        const geo = await geocodeManualAddress(finalAddress);
        finalLat = geo.latitude;
        finalLng = geo.longitude;
        setLatitude(finalLat);
        setLongitude(finalLng);
        setLocationSource("MANUAL");
      } catch (err) {
        setLoading(false);
        Alert.alert(
          "Coordinates Mandatory",
          "Location coordinates could not be resolved automatically. Please tap 'Confirm & Adjust on Map' to set your exact location pin.",
          [{ text: "Confirm on Map", onPress: () => setShowMapModal(true) }, { text: "Cancel" }]
        );
        return;
      }
      setLoading(false);
    }

    if (!isValidCoordinate(finalLat, finalLng)) {
      Alert.alert("Location Unconfirmed", "Please confirm your location pin on the map to proceed with booking.");
      setShowMapModal(true);
      return;
    }

    console.log("==================================================");
    console.log("📍 [SUBMITTING CUSTOMER BOOKING LOCATION]");
    console.log("Address:", finalAddress);
    console.log("Latitude:", finalLat);
    console.log("Longitude:", finalLng);
    console.log("Source:", locationSource || "MANUAL");
    console.log("==================================================");

    navigation.navigate("BookingSummary", {
      artistId,
      serviceId,
      selectedDate,
      slotId,
      timeLabel,
      address: finalAddress,
      houseFlat: houseFlat.trim(),
      localityArea: localityArea.trim(),
      city: city.trim(),
      stateName: stateName.trim(),
      pincode: pincode.trim(),
      landmark: landmark.trim() || null,
      latitude: finalLat,
      longitude: finalLng,
      accuracy,
      source: locationSource || "MANUAL",
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.textSecondary, fontSize: 13 }}>
          Fetching & verifying location coordinates...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Service Location</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Option 1 Banner: Current GPS Location */}
        <View style={styles.optionSection}>
          <Text style={styles.optionBadgeText}>OPTION 1</Text>
          <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation}>
            <Ionicons name="navigate-circle" size={24} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.locationBtnTitle}>Use Current Location (GPS)</Text>
              <Text style={styles.locationBtnSub}>Detects exact doorstep coordinates automatically</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>

          {showSettingsBtn && (
            <TouchableOpacity style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
              <Ionicons name="settings-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.settingsBtnText}>Open App Settings</Text>
            </TouchableOpacity>
          )}

          {isValidCoordinate(latitude, longitude) && locationSource === "GPS" && (
            <View style={styles.confirmedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.confirmedText}>GPS Location Captured: {latitude.toFixed(4)}, {longitude.toFixed(4)}</Text>
            </View>
          )}
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Option 2 Form: Manual Location Input */}
        <View style={styles.optionSection}>
          <Text style={styles.optionBadgeText}>OPTION 2</Text>

          <View style={styles.manualForm}>
            <Text style={styles.inputLabel}>House / Flat / Building No. *</Text>
            <TextInput
              placeholder="e.g. Flat 302, Green Valley Apartments"
              placeholderTextColor={Colors.textTertiary}
              style={styles.textInput}
              value={houseFlat}
              onChangeText={(txt) => {
                setHouseFlat(txt);
                setFullAddressText("");
              }}
            />

            <Text style={styles.inputLabel}>Area / Locality / Street *</Text>
            <TextInput
              placeholder="e.g. Sector 5, Malviya Nagar"
              placeholderTextColor={Colors.textTertiary}
              style={styles.textInput}
              value={localityArea}
              onChangeText={(txt) => {
                setLocalityArea(txt);
                setFullAddressText("");
              }}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  placeholder="e.g. Jaipur"
                  placeholderTextColor={Colors.textTertiary}
                  style={styles.textInput}
                  value={city}
                  onChangeText={(txt) => {
                    setCity(txt);
                    setFullAddressText("");
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  placeholder="e.g. Rajasthan"
                  placeholderTextColor={Colors.textTertiary}
                  style={styles.textInput}
                  value={stateName}
                  onChangeText={(txt) => {
                    setStateName(txt);
                    setFullAddressText("");
                  }}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Pincode (6 digits) *</Text>
            <TextInput
              placeholder="e.g. 302017"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.textInput}
              value={pincode}
              onChangeText={(txt) => {
                setPincode(txt);
                setFullAddressText("");
              }}
            />

            <Text style={styles.inputLabel}>Landmark (Optional)</Text>
            <TextInput
              placeholder="e.g. Near Community Center"
              placeholderTextColor={Colors.textTertiary}
              style={styles.textInput}
              value={landmark}
              onChangeText={setLandmark}
            />

            <TouchableOpacity style={styles.mapConfirmTriggerBtn} onPress={handleGeocodeAndConfirmOnMap}>
              <Ionicons name="map-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.mapConfirmTriggerText}>Confirm & Adjust Pin on Map</Text>
            </TouchableOpacity>

            {isValidCoordinate(latitude, longitude) && (
              <View style={styles.coordStatusBox}>
                <Ionicons name="location" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.coordStatusText}>
                  Coordinates Set: {latitude.toFixed(4)}, {longitude.toFixed(4)} ({locationSource || "MANUAL"})
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <CustomButton title="Continue to Summary" onPress={handleContinue} />
      </View>

      {/* Interactive Map Location Picker Modal */}
      <MapLocationPickerModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLocation={{
          latitude: isValidCoordinate(latitude, longitude) ? latitude : 26.9124,
          longitude: isValidCoordinate(latitude, longitude) ? longitude : 75.7873,
          fullAddress: fullAddressText || [houseFlat, localityArea, city].filter(Boolean).join(", "),
        }}
        onConfirmLocation={handleMapConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  content: { paddingBottom: 110, paddingTop: 10 },
  optionSection: { paddingHorizontal: 16, marginBottom: 12 },
  optionBadgeText: { fontSize: 11, fontWeight: "800", color: Colors.primary, letterSpacing: 0.5, marginBottom: 6 },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: "#FFF0F4",
  },
  locationBtnTitle: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  locationBtnSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginTop: 8,
  },
  settingsBtnText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: 8,
  },
  confirmedText: { fontSize: 12, fontWeight: "600", color: "#15803D" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16, paddingHorizontal: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 11, fontWeight: "700", color: Colors.textTertiary, marginHorizontal: 12 },
  manualForm: { backgroundColor: "#FAFAFA", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  inputLabel: { fontSize: 12, fontWeight: "700", color: Colors.text, marginTop: 10, marginBottom: 4 },
  textInput: { height: 44, backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, fontSize: 13, color: Colors.text },
  mapConfirmTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    marginTop: 16,
  },
  mapConfirmTriggerText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  coordStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
  },
  coordStatusText: { fontSize: 11, fontWeight: "600", color: "#1D4ED8" },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
});
