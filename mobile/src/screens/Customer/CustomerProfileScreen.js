import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { getCustomerDashboard, getCustomerProfile } from "../../services/customer";

export default function CustomerProfileScreen({ navigation }) {
  const { user, logout, isDarkMode } = useAuth();

  const [profileData, setProfileData] = useState(user || null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(!user);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardDetails = React.useCallback(async () => {
    try {
      const [profile, dashboard] = await Promise.all([
        getCustomerProfile().catch(() => null),
        getCustomerDashboard().catch(() => null)
      ]);
      if (profile) setProfileData(profile);
      if (dashboard) setDashboardData(dashboard);
    } catch (err) {
      console.log("Failed to load dashboard metrics:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardDetails();
    }, [fetchDashboardDetails])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardDetails();
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => logout() }
    ]);
  };

  if (loading && !profileData && !user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const profile = {
    ...(dashboardData?.user || {}),
    ...(profileData || {})
  };
  const initials = profile.name ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase() : "ME";

  const quickActions = [
    { icon: "calendar-outline", label: "My Bookings", screen: "MyBookings" },
    { icon: "location-outline", label: "Saved Addresses", screen: "SavedAddresses" },
    { icon: "wallet-outline", label: "Wallet & Payments", screen: "Wallet" },

    { icon: "heart-outline", label: "Wishlist", screen: "Wishlist" },
    { icon: "share-social-outline", label: "Refer & Earn", screen: "ReferralDashboard" },
    { icon: "pricetag-outline", label: "Coupons & Offers", screen: "Coupons" },
    { icon: "star-outline", label: "My Reviews", screen: "Reviews" },
    { icon: "shield-checkmark-outline", label: "Security & Privacy", screen: "SecurityPrivacy" },
    { icon: "headset-outline", label: "Support Helpdesk", screen: "Support" },
  ];


  const currentBgColor = isDarkMode ? "#000000" : Colors.background;
  const currentCardBg = isDarkMode ? "#121212" : Colors.white;
  const currentTextColor = isDarkMode ? "#FFFFFF" : Colors.text;
  const currentSecTextColor = isDarkMode ? "#B0B0B0" : Colors.textSecondary;
  const currentBorderColor = isDarkMode ? "#333333" : Colors.border;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentBgColor }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Profile Card Info */}
        <View style={[styles.profileHeader, { backgroundColor: currentCardBg, borderBottomColor: currentBorderColor }]}>
          <View style={styles.photoContainer}>
            {profile.profile_image ? (
              <Image source={{ uri: profile.profile_image }} style={styles.avatarCircle} resizeMode="cover" />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Ionicons name="pencil" size={12} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.name, { color: currentTextColor }]}>{profile.name}</Text>
          <View style={styles.badgeRow}>
            {profile.current_level !== undefined && (
              <View style={[styles.badgeContainer, { backgroundColor: isDarkMode ? "#333" : "#FFE5EC", borderColor: Colors.primary, borderWidth: 1, marginBottom: 8 }]}>

                <Ionicons name="sparkles-outline" size={12} color={Colors.primary} />
                <Text style={[styles.badgeText, { color: Colors.primary }]}>Level {profile.current_level}</Text>
              </View>
            )}
            {profile.ambassador_tier && (
              <View style={[styles.badgeContainer, { backgroundColor: isDarkMode ? "#333" : "#FFF8E1", borderColor: "#FFA000", borderWidth: 1, marginBottom: 8 }]}>

                <Ionicons name="trophy-outline" size={12} color="#FFA000" />
                <Text style={[styles.badgeText, { color: "#FFA000" }]}>{profile.ambassador_tier} Tier</Text>
              </View>
            )}
          </View>
          <Text style={[styles.contactDetails, { color: currentSecTextColor }]}>{profile.phone || "No Mobile"}{profile.email ? ` • ${profile.email}` : ""}</Text>

          {/* Profile Completion percentage bar */}
          <View style={styles.progressBarWrap}>
            <View style={styles.progressBarHeader}>
              <Text style={[styles.progressLabel, { color: currentSecTextColor }]}>Profile Completion</Text>
              <Text style={styles.progressVal}>{profile.profileCompletion}%</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: currentBorderColor }]}>
              <View style={[styles.progressBarFill, { width: `${profile.profileCompletion}%` }]} />
            </View>
          </View>
        </View>

        {/* Quick Balance Section */}
        <View style={[styles.walletQuickCard, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}>
          <View>
            <Text style={[styles.walletTitle, { color: currentSecTextColor }]}>Wallet Balance</Text>
            <Text style={[styles.walletAmount, { color: currentTextColor }]}>₹{dashboardData?.walletBalance || 0}</Text>
          </View>
          <TouchableOpacity style={styles.walletBtn} onPress={() => navigation.navigate("Wallet")}>
            <Text style={styles.walletBtnLabel}>Manage</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: currentSecTextColor }]}>Account & Services</Text>

        {/* Quick Actions List */}
        <View style={styles.menuSection}>
          {quickActions.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuCard, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(item.screen, item.params || {})}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: isDarkMode ? "#332225" : "#FFF0F4" }]}>
                  <Ionicons name={item.icon} size={18} color={Colors.primary} />
                </View>
                <Text style={[styles.menuLabel, { color: currentTextColor }]}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}

        </View>

        {/* Logout Button */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: currentCardBg, marginBottom: 40 }]} activeOpacity={0.8} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Logout Session</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileHeader: { alignItems: "center", paddingVertical: 24, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  photoContainer: { position: "relative", marginBottom: 14 },
  avatarCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 28, fontWeight: "800", color: Colors.white },
  editBadge: { position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: Colors.white },
  name: { fontSize: 18, fontWeight: "800", color: Colors.text, marginBottom: 4 },
  badgeContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF0F4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  badgeText: { fontSize: 10, fontWeight: "700", color: Colors.primary, marginLeft: 4 },
  contactDetails: { fontSize: 12, color: Colors.textSecondary },
  progressBarWrap: { width: "80%", marginTop: 18 },
  progressBarHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 10, color: Colors.textSecondary },
  progressVal: { fontSize: 10, fontWeight: "700", color: Colors.primary },
  progressBarBg: { width: "100%", height: 6, borderRadius: 3, backgroundColor: Colors.border },
  progressBarFill: { height: "100%", borderRadius: 3, backgroundColor: Colors.primary },
  walletQuickCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  walletTitle: { fontSize: 11, color: Colors.textSecondary },
  walletAmount: { fontSize: 24, fontWeight: "800", color: Colors.text, marginTop: 4 },
  walletBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  walletBtnLabel: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, marginHorizontal: 16, marginBottom: 12 },
  menuSection: { marginHorizontal: 16 },
  menuCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  menuIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center", marginRight: 12 },
  menuLabel: { fontSize: 13, fontWeight: "700", color: Colors.text },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 40, height: 48, borderRadius: 14, borderWidth: 1, borderColor: Colors.error },
  logoutText: { fontSize: 13, fontWeight: "800", color: Colors.error, marginLeft: 8 },
  badgeRow: { flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center" },
  toggleSwitch: {
    width: 42,
    height: 24,
    borderRadius: 12,
    paddingVertical: 2,
    justifyContent: "center"
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  }

});
