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
import { saveCustomerAddress } from "../../services/customer";

export default function AddNewAddressScreen({ navigation }) {
  const [selectedLabel, setSelectedLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [loading, setLoading] = useState(false);

  const LABELS = ["Home", "Work", "Other"];

  const handleSave = async () => {
    if (!address.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return;
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
      });
      setLoading(false);
      Alert.alert("Success", "Address saved successfully");
      navigation.goBack();
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.message || "Failed to save address");
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.chipRow}>
            {LABELS.map((label) => (
              <TouchableOpacity
                key={label}
                style={[styles.chip, selectedLabel === label && styles.chipActive]}
                onPress={() => setSelectedLabel(label)}
              >
                <Ionicons
                  name={
                    label === "Home"
                      ? "home-outline"
                      : label === "Work"
                      ? "briefcase-outline"
                      : "location-outline"
                  }
                  size={15}
                  color={selectedLabel === label ? Colors.white : Colors.textSecondary}
                />
                <Text style={[styles.chipText, selectedLabel === label && styles.chipTextActive]}>
                  {label}
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
            <Text style={styles.inputLabel}>Pincode *</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
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

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Address</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  saveBtn: { height: 48, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginTop: 10 },
  saveBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 }
});
