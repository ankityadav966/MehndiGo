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
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { getCustomerAddresses } from "../../services/customer";
import * as Location from "expo-location";

export default function AddressSelection({ route, navigation }) {
  const { artistId, serviceId, selectedDate, slotId, timeLabel, selectedArt } = route.params || {};

  const [houseFlat, setHouseFlat] = useState("");
  const [localityArea, setLocalityArea] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [fullAddressText, setFullAddressText] = useState("");

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [fetchingAddresses, setFetchingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  useEffect(() => {
    // Fetch user's saved addresses
    (async () => {
      try {
        setFetchingAddresses(true);
        const addrs = await getCustomerAddresses();
        if (addrs && Array.isArray(addrs) && addrs.length > 0) {
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find(a => a.is_default) || addrs[0];
          if (defaultAddr) {
            handleSelectSavedAddress(defaultAddr);
          }
        }
      } catch (err) {
        if (__DEV__) console.log("Failed to fetch saved addresses:", err.message);
      } finally {
        setFetchingAddresses(false);
      }
    })();

    // Automatically fetch user's real current GPS coordinates in background on screen open
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
          if (loc && loc.coords) {
            setLatitude(loc.coords.latitude);
            setLongitude(loc.coords.longitude);
            if (__DEV__) console.log("[AUTO-DETECTED USER REAL GPS]", loc.coords.latitude, loc.coords.longitude);
          }
        }
      } catch (err) {
        if (__DEV__) console.log("Background location auto-detect notice:", err.message);
      }
    })();
  }, []);

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setHouseFlat(addr.address_line_1 || "");
    setLocalityArea(addr.address_line_2 || "");
    setCity(addr.city || "Jaipur");
    setStateName(addr.state || "Rajasthan");
    setPincode(addr.pincode || "");
    
    // Set coordinates if they exist from the database
    if (addr.latitude !== undefined && addr.latitude !== null) {
      setLatitude(parseFloat(addr.latitude));
    }
    if (addr.longitude !== undefined && addr.longitude !== null) {
      setLongitude(parseFloat(addr.longitude));
    }
    
    setFullAddressText([addr.address_line_1, addr.address_line_2, addr.city, addr.state, addr.pincode].filter(Boolean).join(", "));
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoading(true);
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          "Location Services Disabled",
          "GPS / Location services are turned off on your device. Please turn them on in settings or enter your address manually."
        );
        setLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "GPS access permission was denied. Please enter your address manually below.");
        setLoading(false);
        return;
      }

      let loc = null;
      try {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      } catch (e) {
        if (__DEV__) console.log("High accuracy location fetch fallback:", e.message);
        loc = await Location.getLastKnownPositionAsync({});
      }

      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);

      let nameVal = "";
      let localityVal = "";
      let cityVal = "";
      let stateVal = "";
      let pincodeVal = "";
      let fullAddrVal = "";

      // 1. Primary reverseGeocode via Expo Location
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          nameVal = [g.name, g.streetNumber, g.street].filter(Boolean).join(" ");
          localityVal = [g.district, g.subregion].filter(Boolean).join(", ");
          cityVal = g.city || g.subregion || "";
          stateVal = g.region || "";
          pincodeVal = g.postalCode || "";
        }
      } catch (geoErr) {
        if (__DEV__) console.log("Expo reverseGeocode error:", geoErr.message);
      }

      // 2. Secondary Fallback via Nominatim API if fields missing
      if (!nameVal || !localityVal || !cityVal || !pincodeVal) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { "User-Agent": "MehndiGoApp/1.0" }
          });
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            if (!nameVal) nameVal = [addr.building, addr.house_number, addr.road].filter(Boolean).join(" ") || addr.display_name?.split(",")[0] || "";
            if (!localityVal) localityVal = [addr.suburb, addr.neighbourhood, addr.residential].filter(Boolean).join(", ") || addr.road || "";
            if (!cityVal) cityVal = addr.city || addr.town || addr.village || addr.county || "";
            if (!stateVal) stateVal = addr.state || "";
            if (!pincodeVal) pincodeVal = addr.postcode || "";
          }
        } catch (osmErr) {
          if (__DEV__) console.log("Nominatim reverseGeocode fallback error:", osmErr.message);
        }
      }

      if (!cityVal) cityVal = "Jaipur";
      if (!stateVal) stateVal = "Rajasthan";
      if (!nameVal) nameVal = "Current GPS Location";
      if (!localityVal) localityVal = "Live Location Area";

      setHouseFlat(nameVal);
      setLocalityArea(localityVal);
      setCity(cityVal);
      setStateName(stateVal);
      if (pincodeVal) setPincode(pincodeVal);

      fullAddrVal = [nameVal, localityVal, cityVal, stateVal, pincodeVal].filter(Boolean).join(", ");
      setFullAddressText(fullAddrVal);

      if (__DEV__) console.log("[GPS LOCATION RESOLVED]");
      if (__DEV__) console.log("Latitude:", lat);
      if (__DEV__) console.log("Longitude:", lng);
      if (__DEV__) console.log("Full Address:", fullAddrVal);

      Alert.alert("Location Resolved", "Your current location & GPS coordinates have been fetched successfully.");
    } catch (err) {
      if (__DEV__) console.log("Error getting live location:", err.message);
      Alert.alert("Location Resolution Failed", "Unable to fetch GPS location automatically. Please type your appointment address manually below.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    const constructedAddress = [houseFlat, localityArea, landmark, city, stateName, pincode]
      .map(s => (s || "").trim())
      .filter(Boolean)
      .join(", ");

    const finalAddress = constructedAddress || fullAddressText.trim();

    if (!finalAddress) {
      Alert.alert("Input Error", "Please provide a valid appointment address.");
      return;
    }

    let finalLat = latitude;
    let finalLng = longitude;

    // Forward geocode manually entered address string if lat/lng is missing
    if (!finalLat || !finalLng) {
      try {
        const geoResult = await Location.geocodeAsync(finalAddress);
        if (geoResult && geoResult.length > 0) {
          finalLat = geoResult[0].latitude;
          finalLng = geoResult[0].longitude;
          if (__DEV__) console.log("[FORWARD GEOCODED MANUAL ADDRESS VIA EXPO]", finalAddress, "->", finalLat, finalLng);
        }
      } catch (geoErr) {
        if (__DEV__) console.log("Forward geocoding manual address catch:", geoErr.message);
      }
    }

    // Secondary fallback forward geocoding via Nominatim
    if (!finalLat || !finalLng) {
      try {
        const query = encodeURIComponent(finalAddress);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
          headers: { "User-Agent": "MehndiGoApp/1.0" }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          finalLat = parseFloat(data[0].lat);
          finalLng = parseFloat(data[0].lon);
          if (__DEV__) console.log("[FORWARD GEOCODED MANUAL ADDRESS VIA NOMINATIM]", finalAddress, "->", finalLat, finalLng);
        }
      } catch (nomErr) {
        if (__DEV__) console.log("Nominatim forward geocode error:", nomErr.message);
      }
    }

    // Final fallback: use device last known position or default center
    if (!finalLat || !finalLng) {
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown && lastKnown.coords) {
          finalLat = lastKnown.coords.latitude;
          finalLng = lastKnown.coords.longitude;
        }
      } catch (e) {}
    }

    if (!finalLat || !finalLng) {
      finalLat = 26.9124;
      finalLng = 75.7873;
    }

    if (__DEV__) console.log("==================================================");
    if (__DEV__) console.log("📍 [SUBMITTING CUSTOMER BOOKING ADDRESS]");
    if (__DEV__) console.log("Address:", finalAddress);
    if (__DEV__) console.log("Latitude:", finalLat);
    if (__DEV__) console.log("Longitude:", finalLng);
    if (__DEV__) console.log("==================================================");

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
      selectedArt
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.textSecondary, fontSize: 13 }}>Resolving location...</Text>
      </View>
    );
  }

  const handleBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "CustomerTabs", params: { screen: "Home" } }]
      });
    }
    return true;
  };

  useEffect(() => {
    const { BackHandler } = require("react-native");
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => backSubscription.remove();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Appointment Address</Text>
          <View style={{ width: 40 }} />
        </View>

        {fetchingAddresses ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : savedAddresses.length > 0 ? (
          <View style={styles.savedAddressesContainer}>
            <Text style={[styles.sectionHeaderTitle, { paddingHorizontal: 16 }]}>Saved Addresses</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 }}>
              {savedAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[styles.addressCard, isSelected && styles.addressCardSelected]}
                    onPress={() => handleSelectSavedAddress(addr)}
                  >
                    <View style={styles.addressCardHeader}>
                      <Ionicons name={addr.name?.toLowerCase() === "home" ? "home" : addr.name?.toLowerCase() === "work" ? "briefcase" : "location"} size={16} color={isSelected ? Colors.primary : Colors.textSecondary} />
                      <Text style={[styles.addressCardTitle, isSelected && { color: Colors.primary }]}>{addr.name || "Address"}</Text>
                    </View>
                    <Text style={styles.addressCardText} numberOfLines={2}>
                      {[addr.address_line_1, addr.address_line_2, addr.city].filter(Boolean).join(", ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation}>
          <Ionicons name="location" size={18} color={Colors.primary} />
          <Text style={styles.locationText}>Use Current GPS Location</Text>
        </TouchableOpacity>

        <View style={styles.manualForm}>
          <Text style={styles.sectionHeaderTitle}>Or Enter Address Manually</Text>

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

          <Text style={styles.inputLabel}>Pincode *</Text>
          <TextInput
            placeholder="e.g. 302017"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
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
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton title="Continue to Summary" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  content: { paddingBottom: 100 },
  locationButton: { marginHorizontal: 16, marginTop: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: "#FFF0F4" },
  locationText: { marginLeft: 8, color: Colors.primary, fontWeight: "700", fontSize: 14 },
  sectionHeaderTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginTop: 16, marginBottom: 4 },
  manualForm: { paddingHorizontal: 16 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: Colors.text, marginTop: 10, marginBottom: 4 },
  textInput: { height: 44, backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, fontSize: 13, color: Colors.text },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  savedAddressesContainer: { marginTop: 12 },
  addressCard: { width: 220, backgroundColor: Colors.background, padding: 12, borderRadius: 12, marginRight: 12, borderWidth: 1.5, borderColor: "transparent" },
  addressCardSelected: { backgroundColor: "#FFF0F4", borderColor: Colors.primary },
  addressCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  addressCardTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginLeft: 6 },
  addressCardText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 }
});
