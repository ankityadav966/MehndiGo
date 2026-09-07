import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, Modal, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import Colors from "../../constants/Colors";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";
import { useAuth } from "../../context/AuthContext";

export default function PersonalDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { artistDetails, updateArtistDetails } = useArtistOnboarding();
  const { phone: routePhone, name: routeName } = route.params || {};

  const [bio, setBio] = useState(artistDetails.bio || "");
  const [experienceYears, setExperienceYears] = useState(artistDetails.experienceYears || "");
  const [startingPrice, setStartingPrice] = useState(artistDetails.startingPrice ? String(artistDetails.startingPrice) : "");
  const [homeService, setHomeService] = useState(artistDetails.homeService !== false);
  const [salonService, setSalonService] = useState(artistDetails.salonService || false);
  const [city, setCity] = useState(artistDetails.city || "");
  const [state, setState] = useState(artistDetails.state || "");
  const [location, setLocation] = useState(artistDetails.location || "");
  const [pincode, setPincode] = useState(artistDetails.pincode || "");
  const [phone, setPhone] = useState(artistDetails.phone || user?.phone || "");

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: Number(artistDetails.latitude) || 26.912434,
    longitude: Number(artistDetails.longitude) || 75.787270,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [selectedCoord, setSelectedCoord] = useState({
    latitude: Number(artistDetails.latitude) || 26.912434,
    longitude: Number(artistDetails.longitude) || 75.787270,
  });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (artistDetails) {
      if (artistDetails.bio && !bio) setBio(artistDetails.bio);
      if (artistDetails.experienceYears && !experienceYears) setExperienceYears(String(artistDetails.experienceYears));
      if (artistDetails.homeService !== undefined) setHomeService(artistDetails.homeService !== false);
      if (artistDetails.salonService !== undefined) setSalonService(Boolean(artistDetails.salonService));
      if (artistDetails.city && !city) setCity(artistDetails.city);
      if (artistDetails.state && !state) setState(artistDetails.state);
      if (artistDetails.location && !location) setLocation(artistDetails.location);
      if (artistDetails.pincode && !pincode) setPincode(artistDetails.pincode);
      if ((artistDetails.phone || user?.phone) && !phone) setPhone(artistDetails.phone || user?.phone || "");
    }
  }, [artistDetails, user]);

  const applyReverseGeocoding = async (coord, forceOverwrite = false) => {
    try {
      const [address] = await Location.reverseGeocodeAsync(coord);
      if (address) {
        setCity(prev => (forceOverwrite ? (address.city || address.subregion || "") : (prev || address.city || address.subregion || "")));
        setState(prev => (forceOverwrite ? (address.region || "") : (prev || address.region || "")));
        setPincode(prev => (forceOverwrite ? (address.postalCode || "") : (prev || address.postalCode || "")));
        const loc = [address.name, address.street, address.subregion].filter(Boolean).join(", ");
        if (loc) setLocation(prev => (forceOverwrite ? loc : (prev || loc)));
      }
    } catch (err) {
      console.warn("Failed to reverse geocode:", err.message);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({});
          const newCoord = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setSelectedCoord(newCoord);
          setMapRegion((prev) => ({ ...prev, ...newCoord }));
          updateArtistDetails({
            latitude: String(newCoord.latitude),
            longitude: String(newCoord.longitude),
          });
          await applyReverseGeocoding(newCoord);
        }
      } catch (err) {
        console.warn("Failed to retrieve live location during onboarding, using default:", err.message);
      }
    })();
  }, []);



  const fetchLiveLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({});
        const newCoord = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setSelectedCoord(newCoord);
        setMapRegion((prev) => ({ ...prev, ...newCoord }));
        updateArtistDetails({
          latitude: String(newCoord.latitude),
          longitude: String(newCoord.longitude),
        });
        await applyReverseGeocoding(newCoord, true);
        Alert.alert("Success", "Live location and details updated successfully!");
      } else {
        Alert.alert("Permission Denied", "Location permission is required to fetch live location.");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to get live location.");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleConfirmMapLocation = async () => {
    updateArtistDetails({
      latitude: String(selectedCoord.latitude),
      longitude: String(selectedCoord.longitude),
    });
    setMapModalVisible(false);
    await applyReverseGeocoding(selectedCoord, true);
  };

  const validate = () => {
    const errs = {};
    if (!bio.trim()) errs.bio = "Please enter a short bio";
    if (!experienceYears || isNaN(Number(experienceYears)) || Number(experienceYears) < 0)
      errs.experienceYears = "Please enter valid experience years";
    if (!city.trim()) errs.city = "Please enter your city";
    if (!state.trim()) errs.state = "Please enter your state";
    if (!location.trim()) errs.location = "Please enter your location";
    if (!pincode.trim()) errs.pincode = "Please enter your pincode";
    
    if (!phone.trim()) {
      errs.phone = "Please enter your phone number";
    } else {
      const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
      if (cleanPhone.length !== 10) {
        errs.phone = "Phone number must be exactly 10 digits";
      }
    }
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    updateArtistDetails({
      bio: bio.trim(),
      experienceYears,
      startingPrice: startingPrice ? Number(startingPrice) : 0,
      homeService,
      salonService,
      city: city.trim(),
      state: state.trim(),
      location: location.trim(),
      pincode: pincode.trim(),
      phone: phone.trim().replace(/[^0-9]/g, ""),
    });
    navigation.navigate("ProfilePhoto");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Tell us about yourself</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.bio ? styles.inputError : null]}
            value={bio}
            placeholderTextColor={Colors.placeholder}
            placeholder="Write a short bio about yourself"
            multiline
            numberOfLines={3}
            onChangeText={(t) => { setBio(t); setErrors((p) => ({ ...p, bio: "" })); }}
          />
          {errors.bio ? <Text style={styles.errorText}>{errors.bio}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Experience (Years)</Text>
          <TextInput
            style={[styles.input, errors.experienceYears ? styles.inputError : null]}
            value={experienceYears}
            placeholderTextColor={Colors.placeholder}
            placeholder="e.g. 5"
            keyboardType="numeric"
            onChangeText={(t) => { setExperienceYears(t); setErrors((p) => ({ ...p, experienceYears: "" })); }}
          />
          {errors.experienceYears ? <Text style={styles.errorText}>{errors.experienceYears}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Starting Service Price (₹)</Text>
          <TextInput
            style={[styles.input, errors.startingPrice ? styles.inputError : null]}
            value={String(startingPrice || "")}
            placeholderTextColor={Colors.placeholder}
            placeholder="e.g. 500"
            keyboardType="numeric"
            onChangeText={(t) => { setStartingPrice(t.replace(/[^0-9]/g, "")); setErrors((p) => ({ ...p, startingPrice: "" })); }}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, errors.phone ? styles.inputError : null]}
            value={phone}
            placeholderTextColor={Colors.placeholder}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
            onChangeText={(t) => { setPhone(t); setErrors((p) => ({ ...p, phone: "" })); }}
          />
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Services Offered</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, homeService && styles.toggleBtnSelected]}
              onPress={() => setHomeService(!homeService)}
            >
              <Text style={[styles.toggleText, homeService && styles.toggleTextSelected]}>
                Home Service
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, salonService && styles.toggleBtnSelected]}
              onPress={() => setSalonService(!salonService)}
            >
              <Text style={[styles.toggleText, salonService && styles.toggleTextSelected]}>
                Salon Service
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Location / Address</Text>
          <TextInput
            style={[styles.input, errors.location ? styles.inputError : null]}
            value={location}
            placeholderTextColor={Colors.placeholder}
            placeholder="Enter your location/address"
            onChangeText={(t) => { setLocation(t); setErrors((p) => ({ ...p, location: "" })); }}
          />
          {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Coordinates (GPS)</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={fetchLiveLocation}
              disabled={isFetchingLocation}
            >
              <Text style={styles.toggleText}>
                {isFetchingLocation ? "Fetching..." : "Pick Live Location"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => setMapModalVisible(true)}
            >
              <Text style={styles.toggleText}>
                Pick on Map
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 8, marginLeft: 5 }}>
            Selected: {Number(selectedCoord.latitude).toFixed(4)}, {Number(selectedCoord.longitude).toFixed(4)}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Pincode</Text>
          <TextInput
            style={[styles.input, errors.pincode ? styles.inputError : null]}
            value={pincode}
            placeholderTextColor={Colors.placeholder}
            placeholder="Enter your pincode"
            keyboardType="numeric"
            maxLength={6}
            onChangeText={(t) => { setPincode(t); setErrors((p) => ({ ...p, pincode: "" })); }}
          />
          {errors.pincode ? <Text style={styles.errorText}>{errors.pincode}</Text> : null}
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={[styles.input, errors.city ? styles.inputError : null]}
              value={city}
              placeholderTextColor={Colors.placeholder}
              placeholder="Enter your city"
              onChangeText={(t) => { setCity(t); setErrors((p) => ({ ...p, city: "" })); }}
            />
            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={[styles.input, errors.state ? styles.inputError : null]}
              value={state}
              placeholderTextColor={Colors.placeholder}
              placeholder="Enter your state"
              onChangeText={(t) => { setState(t); setErrors((p) => ({ ...p, state: "" })); }}
            />
            {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMapModalVisible(false)} style={{ padding: 10 }}>
              <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "600", color: Colors.text }}>Pick Location</Text>
            <TouchableOpacity onPress={handleConfirmMapLocation} style={{ padding: 10 }}>
              <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
            </TouchableOpacity>
          </View>
          <MapView
            style={{ flex: 1 }}
            region={mapRegion}
            onRegionChangeComplete={(region) => {
              setMapRegion(region);
              setSelectedCoord({ latitude: region.latitude, longitude: region.longitude });
            }}
          >
            <Marker coordinate={selectedCoord} />
          </MapView>
          <View style={styles.mapFooter}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: Colors.text, marginBottom: 10 }}>
              Drag the map to pinpoint your exact location.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleConfirmMapLocation}>
              <Text style={styles.buttonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: "700", color: Colors.text, textAlign: "center", marginTop: 10, marginBottom: 25 },
  formGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 8, marginLeft: 5 },
  input: { height: 55, backgroundColor: Colors.inputBackground, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  inputError: { borderColor: Colors.error || "#FF3B30" },
  textArea: { height: 90, paddingTop: 16, textAlignVertical: "top" },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, marginTop: 4, marginLeft: 5 },
  row: { flexDirection: "row" },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inputBackground, justifyContent: "center", alignItems: "center" },
  genderBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + "30" },
  genderBtnText: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  genderBtnTextSelected: { color: Colors.primary, fontWeight: "700" },
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inputBackground, justifyContent: "center", alignItems: "center" },
  toggleBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + "30" },
  toggleText: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  toggleTextSelected: { color: Colors.primary, fontWeight: "700" },
  footer: { backgroundColor: Colors.white, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  button: { height: 56, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  mapFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'white', padding: 15, borderRadius: 12, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
});
