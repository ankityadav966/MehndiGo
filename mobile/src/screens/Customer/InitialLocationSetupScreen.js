import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import Alert from "../../utils/Alert";
import { saveCustomerAddress } from "../../services/customer";
import { setActiveAddress, reverseGeocodeCoords } from "../../utils/locationManager";

export default function InitialLocationSetupScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [coords, setCoords] = useState({ latitude: 26.9124, longitude: 75.7873 });
  
  const [label, setLabel] = useState("Home"); // Home | Work | Other
  const [fullAddress, setFullAddress] = useState("");
  const [houseFlat, setHouseFlat] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("Jaipur");
  const [state, setState] = useState("Rajasthan");
  const [pincode, setPincode] = useState("302001");

  useEffect(() => {
    requestGPSOnMount();
  }, []);

  const requestGPSOnMount = async () => {
    setLoading(true);
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      let pos = await Location.getLastKnownPositionAsync({});
      if (!pos) {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      if (pos && pos.coords) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });

        const geo = await reverseGeocodeCoords(lat, lng);
        setFullAddress(geo.fullAddress);
        setCity(geo.city);
        setState(geo.state);
        setPincode(geo.pincode);
        if (geo.houseFlat) setHouseFlat(geo.houseFlat);
        if (geo.landmark) setLandmark(geo.landmark);
      }
    } catch (e) {
      console.log("GPS Setup Error:", e.message);
      setPermissionDenied(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrimaryAddress = async () => {
    if (!fullAddress && !houseFlat) {
      Alert.alert("Address Required", "Please enter your house/flat number or complete address.");
      return;
    }

    setLoading(true);
    try {
      const addressData = {
        name: label,
        label,
        addressLine1: fullAddress || `${houseFlat}, ${landmark}, ${city}`,
        address_line_1: fullAddress || `${houseFlat}, ${landmark}, ${city}`,
        fullAddress: fullAddress || `${houseFlat}, ${landmark}, ${city}`,
        houseFlat,
        house_flat: houseFlat,
        landmark,
        city: city || "Jaipur",
        state: state || "Rajasthan",
        pincode: pincode || "302001",
        latitude: coords.latitude,
        longitude: coords.longitude,
        isDefault: true,
        is_default: true,
      };

      const saved = await saveCustomerAddress(addressData);
      await setActiveAddress(saved || addressData);

      if (route.params?.onSuccess) {
        route.params.onSuccess();
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "CustomerTabs" }],
        });
      }
    } catch (e) {
      Alert.alert("Error Saving Address", e.message || "Failed to save address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.headerRow}>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>Set Service Location</Text>
          <Text style={styles.subtitle}>Where should artists arrive for your Mehendi service?</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* GPS Banner */}
        {!permissionDenied ? (
          <View style={styles.gpsBanner}>
            <Ionicons name="location-sharp" size={24} color={Colors.primary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.gpsTitle}>Current Location Detected</Text>
              <Text style={styles.gpsSub}>{fullAddress || "Jaipur, Rajasthan"}</Text>
            </View>
            <TouchableOpacity onPress={requestGPSOnMount} style={styles.refreshGpsBtn}>
              <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.gpsBanner, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
            <Ionicons name="alert-circle-outline" size={24} color="#D97706" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.gpsTitle, { color: "#B45309" }]}>Manual Location Mode</Text>
              <Text style={[styles.gpsSub, { color: "#92400E" }]}>GPS permission denied. Please enter your address details below.</Text>
            </View>
          </View>
        )}

        {/* Address Tag Selector */}
        <Text style={styles.fieldLabel}>Save Address As</Text>
        <View style={styles.tagRow}>
          {["Home", "Work", "Other"].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.tagChip, label === item && styles.tagChipActive]}
              onPress={() => setLabel(item)}
            >
              <Ionicons
                name={item === "Home" ? "home-outline" : item === "Work" ? "briefcase-outline" : "location-outline"}
                size={16}
                color={label === item ? "#FFFFFF" : Colors.text}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tagText, label === item && styles.tagTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* House / Flat Number */}
        <Text style={styles.fieldLabel}>House / Flat / Building No. *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Flat 402, Royal Residency"
          placeholderTextColor="#9CA3AF"
          value={houseFlat}
          onChangeText={setHouseFlat}
        />

        {/* Landmark */}
        <Text style={styles.fieldLabel}>Landmark / Street (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Near HDFC Bank, Vaishali Nagar"
          placeholderTextColor="#9CA3AF"
          value={landmark}
          onChangeText={setLandmark}
        />

        {/* Full Address */}
        <Text style={styles.fieldLabel}>Full Address / Locality *</Text>
        <TextInput
          style={[styles.input, { height: 75, textAlignVertical: "top" }]}
          multiline
          placeholder="Complete street address..."
          placeholderTextColor="#9CA3AF"
          value={fullAddress}
          onChangeText={setFullAddress}
        />

        {/* City & Pincode Row */}
        <View style={styles.twoColRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="Jaipur"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.fieldLabel}>Pincode</Text>
            <TextInput
              style={styles.input}
              placeholder="302001"
              keyboardType="number-pad"
              placeholderTextColor="#9CA3AF"
              value={pincode}
              onChangeText={setPincode}
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer Save Button */}
      <View style={styles.footer}>
        <CustomButton
          title="Save Address & Continue"
          onPress={handleSavePrimaryAddress}
          loading={loading}
          style={{ width: "100%" }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  headerTextCol: {
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
  },
  gpsBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E40AF",
  },
  gpsSub: {
    fontSize: 13,
    color: "#3B82F6",
    marginTop: 2,
  },
  refreshGpsBtn: {
    padding: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  tagRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    marginRight: 10,
  },
  tagChipActive: {
    backgroundColor: Colors.primary || "#FF4D6D",
    borderColor: Colors.primary || "#FF4D6D",
  },
  tagText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  tagTextActive: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  twoColRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
});
