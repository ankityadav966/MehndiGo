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
  const fullAddress = address || "Customer Appointment Address";

  const handleOpenMaps = () => {
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    if (lat && lng && lat !== 0 && lng !== 0) {
      const url =
        Platform.select({
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
          <View style={styles.iconBox}>
            <Ionicons name="location" size={14} color="#E91E63" />
          </View>
          <Text style={styles.titleText} numberOfLines={1}>Service Location</Text>
        </View>

        <TouchableOpacity
          style={styles.directionBtn}
          onPress={handleOpenMaps}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="navigate" size={13} color="#701DDB" />
          <Text style={styles.directionBtnText}>{isArtist ? "Navigate" : "Open Map"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.addressContainer}>
        <Text style={styles.addressText}>{fullAddress}</Text>

        {landmark ? (
          <View style={styles.landmarkRow}>
            <Ionicons name="business" size={12} color="#701DDB" />
            <Text style={styles.landmarkText} numberOfLines={1}>Landmark: {landmark}</Text>
          </View>
        ) : null}

        {(city || pincode) && (
          <View style={styles.cityRow}>
            <Ionicons name="map-outline" size={12} color="#9CA3AF" />
            <Text style={styles.cityPincodeText} numberOfLines={1}>
              {[city, pincode].filter(Boolean).join(" • ")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexShrink: 1
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#FFF8FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    flexShrink: 0
  },
  titleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flexShrink: 1
  },
  directionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    gap: 4,
    flexShrink: 0
  },
  directionBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#701DDB"
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12
  },
  addressContainer: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6"
  },
  addressText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 20
  },
  landmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 4,
    maxWidth: "100%"
  },
  landmarkText: {
    fontSize: 11.5,
    color: "#701DDB",
    fontWeight: "700",
    flexShrink: 1
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4
  },
  cityPincodeText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#6B7280",
    flexShrink: 1
  }
});
