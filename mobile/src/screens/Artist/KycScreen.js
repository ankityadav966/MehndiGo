import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";

export default function KycScreen({ navigation }) {
  const { verificationStatus, isProfileComplete, aadhaarFiles, artistDetails, rejectionReason } = useArtistOnboarding();

  const isAadhaarUploaded = Boolean(aadhaarFiles?.front || artistDetails?.aadhaarNumber);
  const isApproved = verificationStatus === "APPROVED";
  const isPending = verificationStatus === "PENDING";
  const isRejected = verificationStatus === "REJECTED";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrapper}>
          <Ionicons
            name={isApproved ? "shield-checkmark" : isRejected ? "alert-circle" : "shield-checkmark-outline"}
            size={60}
            color={isApproved ? (Colors.success || "#10B981") : isRejected ? "#EF4444" : (Colors.primary || "#FF4D6D")}
          />
        </View>
        <Text style={styles.title}>KYC Verification</Text>
        <Text style={styles.subtitle}>
          Identity compliance status and submitted document records.
        </Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>Overall Status: {verificationStatus}</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={artistDetails?.fullName ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={artistDetails?.fullName ? (Colors.success || "#10B981") : "#9CA3AF"}
            />
            <View style={styles.textCol}>
              <Text style={styles.statusText}>Personal & Location Details</Text>
              <Text style={styles.subText}>{artistDetails?.city ? `${artistDetails.city}, ${artistDetails.pincode || ""}` : "Not submitted"}</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Ionicons
              name={isAadhaarUploaded ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={isAadhaarUploaded ? (Colors.success || "#10B981") : "#9CA3AF"}
            />
            <View style={styles.textCol}>
              <Text style={styles.statusText}>Aadhaar Identity Documents</Text>
              <Text style={styles.subText}>{isAadhaarUploaded ? (isApproved ? "Verified by Admin" : "Uploaded (Under Review)") : "Pending Upload"}</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Ionicons
              name={isApproved ? "checkmark-circle" : isRejected ? "close-circle" : "time-outline"}
              size={22}
              color={isApproved ? (Colors.success || "#10B981") : isRejected ? "#EF4444" : (Colors.warning || "#F59E0B")}
            />
            <View style={styles.textCol}>
              <Text style={styles.statusText}>Admin Verification Review</Text>
              <Text style={styles.subText}>
                {isApproved ? "Approved - Active Artist" : isRejected ? `Rejected: ${rejectionReason || "Please re-submit"}` : "Pending Administrative Approval"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {!isApproved && (
        <View style={styles.footer}>
          <CustomButton
            title={isRejected ? "Re-upload Documents" : "Update Profile & KYC"}
            onPress={() => navigation.navigate("EditProfile")}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 24, alignItems: "center" },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFE4E6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#1F2937", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 20, marginBottom: 20, paddingHorizontal: 15 },
  statusBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 24 },
  statusBadgeText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  statusCard: { width: "100%", backgroundColor: "#F9FAFB", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  statusRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  textCol: { marginLeft: 12, flex: 1 },
  statusText: { fontSize: 14, color: "#1F2937", fontWeight: "600" },
  subText: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  footer: { paddingHorizontal: 20, paddingBottom: 25 },
});
