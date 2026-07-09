import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";

export default function PANVerificationScreen({ navigation }) {
  const { panFile, setPanFile } = useArtistOnboarding();

  const handleUploadPan = () => {
    setPanFile("uploaded");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>Verify your PAN Card</Text>
        <Text style={styles.subHeading}>Upload clear photo of your PAN card</Text>

        <TouchableOpacity activeOpacity={0.8} style={styles.uploadBox} onPress={handleUploadPan}>
          <Ionicons name="cloud-upload-outline" size={55} color={Colors.primary} />
          <Text style={styles.uploadTitle}>Upload PAN Card</Text>
          <Text style={styles.uploadSubTitle}>Tap to upload clear PAN card photo</Text>
          {panFile ? (
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.successText}>PAN Card Uploaded</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <CustomButton title="Continue" onPress={() => navigation.navigate("ProfilePhoto")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  heading: { fontSize: 22, fontWeight: "700", color: Colors.text, marginBottom: 6 },
  subHeading: { fontSize: 13, color: Colors.textSecondary, marginBottom: 25 },
  uploadBox: { height: 260, borderWidth: 1, borderColor: Colors.primaryLight + "80", borderRadius: 16, backgroundColor: Colors.primaryLight + "20", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  uploadTitle: { marginTop: 14, fontSize: 16, fontWeight: "600", color: Colors.text },
  uploadSubTitle: { marginTop: 6, fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
  successBadge: { flexDirection: "row", alignItems: "center", marginTop: 15, backgroundColor: Colors.success + "20", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  successText: { marginLeft: 5, color: Colors.success, fontWeight: "600", fontSize: 13 },
  footer: { paddingHorizontal: 20, paddingBottom: 25, paddingTop: 10, backgroundColor: Colors.white },
});
