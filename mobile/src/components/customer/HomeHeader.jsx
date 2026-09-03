import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OptimizedImage from "../OptimizedImage";
import Colors from "../../constants/Colors";
import { resolveImage } from "../../utils/imageHelper";

const HomeHeader = ({
  user,
  activeAddressState,
  unreadCount,
  currentTextColor,
  currentSecTextColor,
  setLocationModalVisible,
  navigation
}) => {
  const avatarUrl = useMemo(() => {
    return resolveImage(user?.profile_image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "Customer")}&background=F3E8FF&color=7C3AED`;
  }, [user?.profile_image, user?.name]);

  const displayLocation = useMemo(() => {
    if (!activeAddressState) {
      return user?.city ? `${user.city}, Rajasthan` : "Select Location";
    }
    const label = activeAddressState.label;
    const full = activeAddressState.fullAddress || "";
    const city = activeAddressState.city || "";

    if (label && label !== "Service Location" && label !== "Current Location") {
      const summary = full ? (full.length > 25 ? `${full.slice(0, 25)}...` : full) : city;
      return `${label}: ${summary || city}`;
    }
    if (full) {
      return full;
    }
    if (city) {
      return `${city}${activeAddressState.state ? `, ${activeAddressState.state}` : ""}`;
    }
    return "Jaipur, Rajasthan";
  }, [activeAddressState, user?.city]);

  return (
    <View style={styles.welcomeHeader}>
      <View style={styles.userInfo}>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")} activeOpacity={0.8}>
          <OptimizedImage
            source={{ uri: avatarUrl }}
            style={styles.avatar}
          />
        </TouchableOpacity>
        <View style={styles.userMeta}>
          <Text style={[styles.helloText, { color: currentSecTextColor }]}>Welcome back 👋</Text>
          <Text style={[styles.userNameText, { color: currentTextColor }]} numberOfLines={1}>{user?.name || "Customer"}</Text>
          <TouchableOpacity
            style={styles.locationWrapper}
            onPress={() => setLocationModalVisible(true)}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Ionicons name="location-sharp" size={14} color={Colors.primary} style={{ marginRight: 2 }} />
            <Text style={[styles.locationText, { color: currentSecTextColor }]} numberOfLines={1}>
              {displayLocation}
            </Text>
            <Ionicons name="chevron-down" size={12} color={currentSecTextColor} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={styles.notificationBtn}
        onPress={() => navigation.navigate("NotificationCenter")}
        activeOpacity={0.8}
      >
        <Ionicons name="notifications-outline" size={24} color={currentTextColor} />
        {unreadCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  welcomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#F0F0F0",
  },
  userMeta: {
    justifyContent: "center",
    flex: 1,
  },
  helloText: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  locationWrapper: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
  },
  locationText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 2,
    flexShrink: 1,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: 6,
    right: 8,
    backgroundColor: "#EF4444",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 8,
    fontWeight: "800",
  },
});

export default React.memo(HomeHeader);
