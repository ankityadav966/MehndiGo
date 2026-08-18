import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Linking, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function BookingLocationCard({
  address,
  landmark,
  city,
  pincode,
  latitude,
  longitude,
  isArtist = false
}) {
  const fullAddress = address || "Customer Address";

  const handleOpenMaps = () => {
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    if (lat && lng && lat !== 0 && lng !== 0) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(fullAddress)})`
      }) || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      });
    } else {
      const query = encodeURIComponent(fullAddress);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="location-outline" size={16} color="#E91E63" style={{ marginRight: 6 }} />
          <Text style={styles.titleText}>Service Location</Text>
        </View>

        <TouchableOpacity style={styles.directionBtn} onPress={handleOpenMaps} activeOpacity={0.7}>
          <Ionicons name="navigate-circle-outline" size={14} color="#701DDB" />
          <Text style={styles.directionBtnText}>{isArtist ? "Navigate" : "Open Map"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <Text style={styles.addressText}>{fullAddress}</Text>

      {landmark ? (
        <View style={styles.landmarkRow}>
          <Ionicons name="business-outline" size={13} color="#6B7280" />
          <Text style={styles.landmarkText}>Landmark: {landmark}</Text>
        </View>
      ) : null}

      {(city || pincode) && (
        <Text style={styles.cityPincodeText}>
          {[city, pincode].filter(Boolean).join(" - ")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  titleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  directionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4
  },
  directionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#701DDB"
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12
  },
  addressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#212121",
    lineHeight: 20
  },
  landmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4
  },
  landmarkText: {
    fontSize: 12,
    color: "#6B7280"
  },
  cityPincodeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
    marginTop: 4
  }
});
