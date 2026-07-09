import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";

export default function ProfilePhotoScreen({ navigation }) {
  const { profilePhoto: contextPhoto, setProfilePhoto } = useArtistOnboarding();
  const [error, setError] = useState("");

  const openCamera = async () => {
    setError("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    setError("");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>Upload Profile Photo</Text>
        <Text style={styles.subHeading}>Upload a professional photo so customers can recognize you easily.</Text>

        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.8} onPress={() => {
          setError("");
          const options = ["Camera", "Gallery"];
          // Simple inline prompt via button row below
        }}>
          {contextPhoto ? (
            <Image source={{ uri: contextPhoto }} style={styles.profileImage} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={55} color={Colors.primary} />
              <Text style={styles.uploadTitle}>Upload Profile Photo</Text>
              <Text style={styles.uploadSubtitle}>Tap to open camera or gallery</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.pickerRow}>
          <TouchableOpacity style={styles.pickerBtn} onPress={openCamera}>
            <Ionicons name="camera" size={20} color={Colors.primary} />
            <Text style={styles.pickerText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickerBtn} onPress={openGallery}>
            <Ionicons name="images" size={20} color={Colors.primary} />
            <Text style={styles.pickerText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <CustomButton
          title={contextPhoto ? "Continue" : "Skip for now"}
          onPress={() => navigation.navigate("AadhaarVerification")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  heading: { fontSize: 22, fontWeight: "700", color: Colors.text, marginBottom: 6 },
  subHeading: { fontSize: 13, color: Colors.textSecondary, marginBottom: 25 },
  uploadBox: { height: 280, borderRadius: 16, backgroundColor: Colors.primaryLight + "20", borderWidth: 1, borderColor: Colors.primaryLight + "80", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  profileImage: { width: "100%", height: "100%" },
  uploadTitle: { marginTop: 15, fontSize: 16, fontWeight: "600", color: Colors.text },
  uploadSubtitle: { marginTop: 5, fontSize: 13, color: Colors.textSecondary },
  pickerRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  pickerBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inputBackground, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  pickerText: { fontSize: 14, fontWeight: "600", color: Colors.text },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, textAlign: "center", marginTop: 12 },
  footer: { paddingHorizontal: 20, paddingBottom: 25, paddingTop: 10 },
});
