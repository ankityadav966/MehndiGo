import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import MapLocationPickerModal from "../../components/MapLocationPickerModal";
import { saveCustomerAddress } from "../../services/customer";
import {
  validateIndianPincode,
  geocodeManualAddress,
  isValidCoordinate,
} from "../../utils/locationManager";

export default function AddNewAddressScreen({ navigation }) {
  const [selectedLabel, setSelectedLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [source, setSource] = useState("MANUAL");

  const [loading, setLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const LABELS = ["Home", "Work", "Other"];

  const handleOpenMap = async () => {
    const fullStr = [address, city, state, pincode].filter(Boolean).join(", ");
    if (!fullStr.trim()) {
      Alert.alert("Address Required", "Please enter address details before opening the map.");
      return;
    }

    if (pincode.trim() && !validateIndianPincode(pincode)) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit Indian postal code.");
      return;
    }

    setLoading(true);
    try {
      if (!isValidCoordinate(latitude, longitude)) {
        const geo = await geocodeManualAddress(fullStr);
        setLatitude(geo.latitude);
        setLongitude(geo.longitude);
      }
      setShowMapModal(true);
    } catch (err) {
      setShowMapModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMapConfirm = (mapData) => {
    if (isValidCoordinate(mapData.latitude, mapData.longitude)) {
      setLatitude(mapData.latitude);
      setLongitude(mapData.longitude);
      setSource("MAP_PICKER");
      if (mapData.fullAddress) setAddress(mapData.fullAddress);
      if (mapData.city) setCity(mapData.city);
      if (mapData.state) setState(mapData.state);
      if (mapData.pincode) setPincode(mapData.pincode);
    }
  };

  const handleSave = async () => {
    if (!address.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      Alert.alert("Validation Error", "Please fill all required address fields.");
      return;
    }

    if (!validateIndianPincode(pincode)) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit Indian pincode (e.g. 302001).");
      return;
    }

    let finalLat = latitude;
    let finalLng = longitude;

    if (!isValidCoordinate(finalLat, finalLng)) {
      setLoading(true);
      try {
        const geo = await geocodeManualAddress([address, city, state, pincode].join(", "));
        finalLat = geo.latitude;
        finalLng = geo.longitude;
        setLatitude(finalLat);
        setLongitude(finalLng);
      } catch (err) {
        setLoading(false);
        Alert.alert(
          "Location Unconfirmed",
          "Could not locate coordinates automatically. Please tap 'Adjust Pin on Map' to set exact location.",
          [{ text: "Open Map", onPress: () => setShowMapModal(true) }, { text: "Cancel" }]
        );
        return;
      }
      setLoading(false);
    }

    setLoading(true);
    try {
      await saveCustomerAddress({
        label: selectedLabel,
        address,
        city,
        state,
        pincode,
        landmark,
        latitude: finalLat,
        longitude: finalLng,
        source: source || "MANUAL",
      });
      setLoading(false);
      Alert.alert("Success 🎉", "Address saved successfully.");
      navigation.goBack();
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.message || "Failed to save address.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Address</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.chipRow}>
            {LABELS.map((lbl) => (
              <TouchableOpacity
                key={lbl}
                style={[styles.chip, selectedLabel === lbl && styles.chipActive]}
                onPress={() => setSelectedLabel(lbl)}
              >
                <Ionicons
                  name={lbl === "Home" ? "home-outline" : lbl === "Work" ? "briefcase-outline" : "location-outline"}
                  size={15}
                  color={selectedLabel === lbl ? Colors.white : Colors.textSecondary}
                />
                <Text style={[styles.chipText, selectedLabel === lbl && styles.chipTextActive]}>
                  {lbl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Address *</Text>
            <TextInput
              style={styles.textarea}
              placeholder="House/Flat no., Street Name, Area name"
              placeholderTextColor={Colors.textTertiary}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={Colors.textTertiary}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>State *</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={Colors.textTertiary}
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pincode (6 digits) *</Text>
            <TextInput
              style={styles.input}
              placeholder="302001"
              placeholderTextColor={Colors.textTertiary}
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Landmark (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nearby prominent landmark"
              placeholderTextColor={Colors.textTertiary}
              value={landmark}
              onChangeText={setLandmark}
            />
          </View>

          <TouchableOpacity style={styles.mapBtn} onPress={handleOpenMap}>
            <Ionicons name="map-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.mapBtnText}>
              {isValidCoordinate(latitude, longitude) ? "📍 Location Set (Tap to Adjust Pin)" : "Confirm Location on Map"}
            </Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Address</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <MapLocationPickerModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLocation={{
          latitude: isValidCoordinate(latitude, longitude) ? latitude : 26.9124,
          longitude: isValidCoordinate(latitude, longitude) ? longitude : 75.7873,
          fullAddress: address || [city, state].filter(Boolean).join(", "),
        }}
        onConfirmLocation={handleMapConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },
  chipRow: { flexDirection: "row", marginBottom: 20, gap: 10 },
  chip: { flexDirection: "row", alignItems: "center", height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "700", marginLeft: 6 },
  chipTextActive: { color: Colors.white },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8, fontWeight: "700" },
  input: { height: 46, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, fontSize: 13, color: Colors.text, backgroundColor: Colors.white },
  textarea: { height: 80, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingTop: 12, fontSize: 13, color: Colors.text, backgroundColor: Colors.white },
  row: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1, marginBottom: 16 },
  mapBtn: { flexDirection: "row", height: 44, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  mapBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 13 },
  saveBtn: { height: 48, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginTop: 4 },
  saveBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 }
});