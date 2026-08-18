import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import LeafletMapView from "../LeafletMapView";

export default function LiveTrackingCard({
  artistCoords,
  customerCoords,
  distanceText,
  etaText,
  statusText = "Artist is traveling to your location",
  onExpand,
  height = 220
}) {
  const hasCoords = (customerCoords && customerCoords.lat && customerCoords.lng) ||
                    (artistCoords && artistCoords.lat && artistCoords.lng);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>LIVE TRACKING</Text>
        </View>

        <View style={styles.metricRow}>
          {distanceText ? (
            <View style={styles.metricItem}>
              <Ionicons name="navigate-outline" size={13} color="#701DDB" />
              <Text style={styles.metricText}>{distanceText}</Text>
            </View>
          ) : null}

          {etaText ? (
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={13} color="#E91E63" />
              <Text style={styles.metricText}>{etaText}</Text>
            </View>
          ) : null}

          {onExpand && (
            <TouchableOpacity style={styles.expandBtn} onPress={onExpand} activeOpacity={0.7}>
              <Ionicons name="scan-outline" size={14} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map Container */}
      <View style={[styles.mapContainer, { height }]}>
        {hasCoords ? (
          <LeafletMapView
            customerCoords={customerCoords}
            artistCoords={artistCoords}
            style={styles.map}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#E91E63" />
            <Text style={styles.loadingText}>Locating artist GPS...</Text>
          </View>
        )}
      </View>

      {/* Status Footer */}
      <View style={styles.footerRow}>
        <Ionicons name="car-sport" size={14} color="#701DDB" />
        <Text style={styles.footerText} numberOfLines={1}>
          {statusText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    overflow: "hidden"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCE7F3",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E91E63"
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E91E63",
    letterSpacing: 0.5
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  metricText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#212121"
  },
  expandBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "#F3F4F6"
  },
  mapContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F9FAFB"
  },
  map: {
    width: "100%",
    height: "100%"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#701DDB",
    flex: 1
  }
});
