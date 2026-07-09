import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ApprovalRejectedScreen({ navigation }) {
  const reasons = [
    "Uploaded documents are unclear or blurry",
    "Missing required information on documents",
    "Aadhaar and PAN details do not match",
    "Profile photo does not meet guidelines",
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="close-circle" size={72} color="#EF4444" />
        </View>

        <Text style={styles.title}>Application Rejected</Text>
        <Text style={styles.subtitle}>
          Your artist application was not approved because document verification failed.
        </Text>

        <View style={styles.reasonsCard}>
          <Text style={styles.reasonsTitle}>Reason for rejection:</Text>
          {reasons.map((reason, index) => (
            <View key={index} style={styles.reasonRow}>
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.hint}>
          Please reupload clear and valid documents for re-verification.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("ReuploadDocuments")}
        >
          <Text style={styles.primaryButtonText}>Reupload Documents</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Support")}
        >
          <Text style={styles.secondaryButtonText}>Contact Support</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.outlineButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const PRIMARY = "#F7146B";

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
    color: "#111",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  reasonsCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginTop: 28,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  reasonsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reasonText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  hint: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    gap: 10,
    backgroundColor: "#FFF8FA",
  },
  primaryButton: {
    height: 56,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 56,
    backgroundColor: "#FFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  secondaryButtonText: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: "700",
  },
  outlineButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#CCC",
  },
  outlineButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
