import { useState, useEffect, useCallback, useRef } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";
import { useAuth } from "../../context/AuthContext";

export default function ApprovalPendingScreen({ navigation }) {
  const { refreshArtistProfile, verificationStatus, isProfileComplete, artistApproved } = useArtistOnboarding();
  const { logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const pollingRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  // Transition handler when approved or rejected
  useEffect(() => {
    if (hasNavigatedRef.current) return;

    if (artistApproved || verificationStatus === "APPROVED") {
      hasNavigatedRef.current = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: "ArtistStack" }],
        });
      } catch (_) {
        try {
          navigation.navigate("ArtistStack");
        } catch (_) {}
      }
    } else if (verificationStatus === "REJECTED") {
      hasNavigatedRef.current = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
      try {
        navigation.replace("ApprovalRejected");
      } catch (_) {
        navigation.navigate("ApprovalRejected");
      }
    }
  }, [artistApproved, verificationStatus, navigation]);

  const handleCheckStatus = async (silent = false) => {
    if (!silent) {
      setIsRefreshing(true);
      setStatusMessage(null);
    }
    try {
      await refreshArtistProfile(silent);
      if (!silent) {
        if (verificationStatus === "APPROVED" || artistApproved) {
          setStatusMessage("Congratulations! Your profile has been approved!");
        } else if (verificationStatus === "REJECTED") {
          setStatusMessage("Your application status has been updated to rejected.");
        } else {
          setStatusMessage("Status refreshed. Your verification is currently under review.");
        }
      }
    } catch (err) {
      if (!silent) {
        setStatusMessage("Unable to refresh status. Please check your connection.");
      }
    } finally {
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  };

  // 1. Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      handleCheckStatus(true);

      // Start controlled polling every 4 seconds while on pending screen
      pollingRef.current = setInterval(() => {
        if (!hasNavigatedRef.current) {
          handleCheckStatus(true);
        }
      }, 4000);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }, [])
  );

  // 2. Refresh when app returns from background to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && !hasNavigatedRef.current) {
        handleCheckStatus(true);
      }
    });

    return () => {
      subscription.remove();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Ionicons name="time-outline" size={50} color={Colors.primary || "#FF4D6D"} />
        </View>
        <Text style={styles.title}>Application Submitted</Text>
        <Text style={styles.description}>
          Your artist profile has been successfully submitted for verification and is currently under review by our administration team.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Status: {verificationStatus}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Verification Steps</Text>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color={isProfileComplete ? (Colors.success || "#10B981") : "#9CA3AF"} />
            <Text style={styles.infoText}>1. Profile & KYC Submitted</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={18} color={Colors.primary || "#FF4D6D"} />
            <Text style={styles.infoText}>2. Admin Review (24-48 hours)</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
            <Text style={styles.infoText}>3. Dashboard Access (Unlocked on Approval)</Text>
          </View>
        </View>

        {statusMessage && (
          <Text style={styles.statusNote}>{statusMessage}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleCheckStatus}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.refreshButtonText}>Check Status</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 50 },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFE4E6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#1F2937", textAlign: "center" },
  description: { marginTop: 10, fontSize: 14, color: "#4B5563", textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },
  badge: { marginTop: 20, backgroundColor: Colors.primary || "#FF4D6D", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 50 },
  badgeText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  infoCard: { width: "100%", marginTop: 26, backgroundColor: "#F9FAFB", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  infoTitle: { fontSize: 16, fontWeight: "700", marginBottom: 15, color: "#1F2937" },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoText: { marginLeft: 10, color: "#4B5563", fontSize: 14 },
  statusNote: { marginTop: 16, fontSize: 13, color: "#059669", textAlign: "center", fontWeight: "500" },
  footer: { paddingHorizontal: 20, paddingBottom: 25, gap: 10 },
  refreshButton: { height: 52, backgroundColor: Colors.primary || "#FF4D6D", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  refreshButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  logoutButton: { height: 48, backgroundColor: "transparent", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  logoutButtonText: { color: "#4B5563", fontSize: 14, fontWeight: "600" },
});
