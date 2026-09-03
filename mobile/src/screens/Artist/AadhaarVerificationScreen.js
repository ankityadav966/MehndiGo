import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";

import { validateAadhaarNumber, validateAadhaarPhotos } from "../../utils/aadhaar.validator";

export default function AadhaarVerificationScreen({ navigation }) {
  const { aadhaarFiles, updateAadhaarFiles, artistDetails, updateArtistDetails } = useArtistOnboarding();
  const [aadhaarNumber, setAadhaarNumber] = useState(artistDetails?.aadhaarNumber || "");
  const [error, setError] = useState("");

  const pickImage = async (side) => {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Gallery permission is required to upload Aadhaar image");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      updateAadhaarFiles({ [side]: result.assets[0].uri });
    }
  };

  const handleValidateAndContinue = () => {
    setError("");
    
    // 1. Validate Aadhaar Number format, UIDAI rules, dummy patterns, and checksum
    const numValidation = validateAadhaarNumber(aadhaarNumber);
    if (!numValidation.valid) {
      setError(numValidation.message);
      if (global.showToast) global.showToast(numValidation.message, "warning");
      return;
    }

    // 2. Validate Front & Back distinct photos
    const photoValidation = validateAadhaarPhotos(aadhaarFiles?.front, aadhaarFiles?.back);
    if (!photoValidation.valid) {
      setError(photoValidation.message);
      if (global.showToast) global.showToast(photoValidation.message, "warning");
      return;
    }

    updateArtistDetails({ aadhaarNumber: numValidation.cleanNumber });
    navigation.navigate("ReviewSubmit");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.container}>
          <Text style={styles.heading}>Verify your Aadhaar</Text>
          <Text style={styles.subHeading}>Provide your 12-digit Aadhaar number and clear photos for identity verification.</Text>

          {/* Aadhaar Number Input */}
          <View style={styles.section}>
            <Text style={styles.label}>12-Digit Aadhaar Number <Text style={styles.reqStar}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5412 8963 2145"
              placeholderTextColor={Colors.placeholder || "#999"}
              keyboardType="numeric"
              maxLength={12}
              value={aadhaarNumber}
              onChangeText={(text) => {
                setAadhaarNumber(text.replace(/[^0-9]/g, ""));
                setError("");
              }}
            />
          </View>

          {/* Front Side Upload */}
          <View style={styles.section}>
            <Text style={styles.label}>Aadhaar Front Photo <Text style={styles.reqStar}>*</Text></Text>
            <TouchableOpacity activeOpacity={0.8} style={styles.uploadBox} onPress={() => pickImage("front")}>
              {aadhaarFiles?.front ? (
                <Image source={{ uri: aadhaarFiles.front }} style={styles.uploadedImage} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={38} color={Colors.primary} />
                  <Text style={styles.uploadTitle}>Upload Front Side</Text>
                  <Text style={styles.uploadDescription}>Tap here to upload front image</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Back Side Upload */}
          <View style={styles.section}>
            <Text style={styles.label}>Aadhaar Back Photo <Text style={styles.reqStar}>*</Text></Text>
            <TouchableOpacity activeOpacity={0.8} style={styles.uploadBox} onPress={() => pickImage("back")}>
              {aadhaarFiles?.back ? (
                <Image source={{ uri: aadhaarFiles.back }} style={styles.uploadedImage} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={38} color={Colors.primary} />
                  <Text style={styles.uploadTitle}>Upload Back Side</Text>
                  <Text style={styles.uploadDescription}>Tap here to upload back image</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton title="Continue" onPress={handleValidateAndContinue} />
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  scrollContent: { paddingBottom: 120 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  heading: { fontSize: 22, fontWeight: "700", color: Colors.text, marginBottom: 6 },
  subHeading: { fontSize: 13, color: Colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  section: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 },
  reqStar: { color: Colors.error || "#FF3B30" },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border || "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.inputBackground || "#FAFAFA",
    letterSpacing: 2,
  },
  uploadBox: { height: 150, borderWidth: 1.5, borderStyle: "dashed", borderColor: Colors.primary, borderRadius: 16, backgroundColor: Colors.primaryLight + "30", justifyContent: "center", alignItems: "center", paddingHorizontal: 20, overflow: "hidden" },
  uploadTitle: { marginTop: 8, fontSize: 14, fontWeight: "600", color: Colors.text },
  uploadDescription: { marginTop: 4, fontSize: 12, color: Colors.textSecondary, textAlign: "center" },
  uploadedImage: { width: "100%", height: "100%", borderRadius: 16 },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, textAlign: "center", marginTop: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
});
