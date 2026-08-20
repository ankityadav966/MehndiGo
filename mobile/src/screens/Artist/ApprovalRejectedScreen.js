import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";
import { useAuth } from "../../context/AuthContext";

export default function ApprovalRejectedScreen({ navigation }) {
  const { rejectionReason } = useArtistOnboarding();
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="close-circle" size={72} color="#EF4444" />
        </View>

        <Text style={styles.title}>Application Rejected</Text>
        <Text style={styles.subtitle}>
          Your artist application was not approved during administrative verification.
        </Text>

        <View style={styles.reasonsCard}>
          <Text style={styles.reasonsTitle}>Reason for rejection:</Text>
          <View style={styles.reasonRow}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" style={{ marginTop: 2 }} />
            <Text style={styles.reasonText}>
              {rejectionReason || "Uploaded documents were unclear or did not match registered details. Please re-submit with clear identity documents."}
            </Text>
          </View>
        </View>

        <Text style={styles.hint}>
          Please update and re-upload your verification documents. Once resubmitted, your profile will be re-evaluated for approval.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("PersonalDetails")}
        >
          <Text style={styles.primaryButtonText}>Update & Resubmit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={logout}
        >
          <Text style={styles.outlineButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const PRIMARY = "#FF4D6D";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FA",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  reasonsCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reasonsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 10,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reasonText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 10,
    flex: 1,
    lineHeight: 22,
    fontWeight: "500",
  },
  hint: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 15,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    gap: 12,
    backgroundColor: "#FFF8FA",
  },
  primaryButton: {
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  outlineButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  outlineButtonText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },
});
