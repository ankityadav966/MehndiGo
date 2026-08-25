import { useState, useEffect, useCallback, useRef } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, AppState } from "react-native";
import Alert from "../../utils/Alert";
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

  if (__DEV__) console.log(`[ARTIST_APPROVAL_DEBUG] CURRENT_ROUTE: ApprovalPending | VERIFICATION_STATUS: ${verificationStatus} | ARTIST_APPROVED_CONTEXT: ${artistApproved}`);

  const handleBack = useCallback(() => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      Alert.alert(
        "Application Under Review",
        "Your artist profile is currently being verified. Would you like to log out or stay on this screen?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Log Out",
            style: "destructive",
            onPress: logout
          }
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

  // Transition handler when rejected
  useEffect(() => {
    if (hasNavigatedRef.current) return;

    if (verificationStatus === "REJECTED") {
      hasNavigatedRef.current = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
      try {
        navigation.replace("ApprovalRejected");
      } catch (_) {
        navigation.navigate("ApprovalRejected");
      }
    }
  }, [verificationStatus, navigation]);

  const handleCheckStatus = async (silent = false) => {
    if (!silent) {
      setIsRefreshing(true);
      setStatusMessage(null);
    }
    try {
      if (__DEV__) console.log(`[ARTIST_APPROVAL_DEBUG] handleCheckStatus triggered (silent: ${silent})`);
      const result = await refreshArtistProfile(silent);
      const freshStatus = result?.verificationStatus || verificationStatus;
      const freshApproved = result?.isApproved ?? artistApproved;

      if (__DEV__) console.log(`[ARTIST_APPROVAL_DEBUG] handleCheckStatus result -> freshStatus: ${freshStatus} | freshApproved: ${freshApproved}`);

      if (!silent) {
        if (freshStatus === "APPROVED" || freshApproved) {
          setStatusMessage("Congratulations! Your profile has been approved!");
        } else if (freshStatus === "REJECTED") {
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
      {/* Top Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Status</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Ionicons name="time-outline" size={50} color={Colors.primary || "#FF4D6D"} />
        </View>
        <Text style={styles.title}>Application Submitted</Text>
        <Text style={styles.description}>
          Your artist profile has been successfully submitted for verification and is currently under review by our administration team.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Status: {verificationStatus || "UNDER_REVIEW"}</Text>
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
          onPress={() => handleCheckStatus(false)}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerRightPlaceholder: {
    width: 40,
  },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 24 },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFE4E6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1F2937", textAlign: "center" },
  description: { marginTop: 8, fontSize: 13.5, color: "#4B5563", textAlign: "center", lineHeight: 20, paddingHorizontal: 10 },
  badge: { marginTop: 16, backgroundColor: Colors.primary || "#FF4D6D", paddingHorizontal: 18, paddingVertical: 6, borderRadius: 50 },
  badgeText: { color: "#FFFFFF", fontWeight: "600", fontSize: 12.5 },
  infoCard: { width: "100%", marginTop: 22, backgroundColor: "#F9FAFB", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#E5E7EB" },
  infoTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12, color: "#1F2937" },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  infoText: { marginLeft: 10, color: "#4B5563", fontSize: 13.5 },
  statusNote: { marginTop: 14, fontSize: 12.5, color: "#059669", textAlign: "center", fontWeight: "500" },
  footer: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  refreshButton: { height: 50, backgroundColor: Colors.primary || "#FF4D6D", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  refreshButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  logoutButton: { height: 46, backgroundColor: "transparent", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  logoutButtonText: { color: "#4B5563", fontSize: 14, fontWeight: "600" },
});
