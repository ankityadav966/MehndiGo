import React, { useCallback, useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";
import { useAuth } from "../../context/AuthContext";

export default function ApprovalRejectedScreen({ navigation }) {
  const { rejectionReason } = useArtistOnboarding();
  const { logout } = useAuth();

  const handleBack = useCallback(() => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      Alert.alert(
        "Application Status",
        "Would you like to update your documents or log out?",
        [
          { text: "Update Documents", onPress: () => navigation.navigate("PersonalDetails") },
          { text: "Log Out", style: "destructive", onPress: logout }
        ]
      );
    }
    return true;
  }, [navigation, logout]);

  useEffect(() => {
    const { BackHandler } = require("react-native");
    const backSub = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => backSub.remove();
  }, [handleBack]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Status</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FEE2E2",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headerRightPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13.5,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  reasonsCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reasonsTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reasonText: {
    fontSize: 13.5,
    color: "#374151",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
    fontWeight: "500",
  },
  hint: {
    fontSize: 12.5,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 15,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    gap: 10,
    backgroundColor: "#FFF8FA",
  },
  primaryButton: {
    height: 50,
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
    height: 46,
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
