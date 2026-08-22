import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";

export default function PANVerificationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { panFile, setPanFile, artistDetails, updateArtistDetails } = useArtistOnboarding();
  const [panNumberInput, setPanNumberInput] = useState(artistDetails?.panNumber || "");
  const [error, setError] = useState("");

  const pickImage = async () => {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Gallery permission is required to upload PAN image");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPanFile(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    setError("");
    if (panNumberInput.trim()) {
      const cleanPan = panNumberInput.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        setError("Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F)");
        return;
      }
      updateArtistDetails({ panNumber: cleanPan });
    }
    navigation.navigate("ProfilePhoto");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Verify your PAN Card</Text>
        <Text style={styles.subHeading}>Upload clear photo of your PAN card (Optional for initial onboarding)</Text>

        <Text style={styles.inputLabel}>PAN Card Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. ABCDE1234F"
          autoCapitalize="characters"
          maxLength={10}
          value={panNumberInput}
          onChangeText={(text) => {
            setPanNumberInput(text.toUpperCase());
            setError("");
          }}
        />

        <TouchableOpacity activeOpacity={0.8} style={styles.uploadBox} onPress={pickImage}>
          {panFile ? (
            <Image source={{ uri: panFile }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={55} color={Colors.primary || "#FF4D6D"} />
              <Text style={styles.uploadTitle}>Select PAN Document</Text>
              <Text style={styles.uploadSubTitle}>Tap to select from photo gallery</Text>
            </>
          )}
        </TouchableOpacity>

        {panFile ? (
          <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
            <Text style={styles.changeBtnText}>Change Selected Photo</Text>
          </TouchableOpacity>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <CustomButton title="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 100 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1F2937", marginBottom: 6 },
  subHeading: { fontSize: 13, color: "#6B7280", marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    marginBottom: 20,
  },
  uploadBox: {
    height: 220,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#FCA5A5",
    borderRadius: 16,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%", borderRadius: 14 },
  uploadTitle: { marginTop: 12, fontSize: 15, fontWeight: "600", color: "#1F2937" },
  uploadSubTitle: { marginTop: 4, fontSize: 12, color: "#6B7280", textAlign: "center" },
  changeBtn: { alignSelf: "center", marginTop: 10, paddingVertical: 6, paddingHorizontal: 12 },
  changeBtnText: { color: Colors.primary || "#FF4D6D", fontSize: 13, fontWeight: "600" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, padding: 12, backgroundColor: "#FEF2F2", borderRadius: 10 },
  errorText: { color: "#EF4444", fontSize: 13, flex: 1 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 25, paddingTop: 10, backgroundColor: "#FFFFFF" },
});
