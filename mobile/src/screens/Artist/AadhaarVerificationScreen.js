import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";

export default function AadhaarVerificationScreen({ navigation }) {
  const { aadhaarFiles, updateAadhaarFiles } = useArtistOnboarding();
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

  const openCamera = async (side) => {
    setError("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required to capture Aadhaar image");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      updateAadhaarFiles({ [side]: result.assets[0].uri });
    }
  };

  const handleUpload = (side) => {
    pickImage(side);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>Verify your Aadhaar</Text>
        <Text style={styles.subHeading}>Upload clear photo of your Aadhaar card</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Front Side</Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.uploadBox} onPress={() => handleUpload("front")}>
            {aadhaarFiles?.front ? (
              <Image source={{ uri: aadhaarFiles.front }} style={styles.uploadedImage} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={42} color={Colors.primary} />
                <Text style={styles.uploadTitle}>Upload Front Side</Text>
                <Text style={styles.uploadDescription}>Tap here to upload Aadhaar front image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Back Side</Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.uploadBox} onPress={() => handleUpload("back")}>
            {aadhaarFiles?.back ? (
              <Image source={{ uri: aadhaarFiles.back }} style={styles.uploadedImage} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={42} color={Colors.primary} />
                <Text style={styles.uploadTitle}>Upload Back Side</Text>
                <Text style={styles.uploadDescription}>Tap here to upload Aadhaar back image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <CustomButton title="Continue" onPress={() => navigation.navigate("ReviewSubmit")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  heading: { fontSize: 24, fontWeight: "700", color: Colors.text, marginBottom: 6 },
  subHeading: { fontSize: 14, color: Colors.textSecondary, marginBottom: 25 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 },
  uploadBox: { height: 180, borderWidth: 1.5, borderStyle: "dashed", borderColor: Colors.primary, borderRadius: 16, backgroundColor: Colors.primaryLight + "30", justifyContent: "center", alignItems: "center", paddingHorizontal: 20, overflow: "hidden" },
  uploadTitle: { marginTop: 12, fontSize: 15, fontWeight: "600", color: Colors.text },
  uploadDescription: { marginTop: 5, fontSize: 12, color: Colors.textSecondary, textAlign: "center" },
  uploadedImage: { width: "100%", height: "100%", borderRadius: 16 },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, textAlign: "center", marginTop: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, backgroundColor: Colors.white },
});
