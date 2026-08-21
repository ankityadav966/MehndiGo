import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import LeafletMapView from "../LeafletMapView";

export default function LiveTrackingCard({
  artistCoords,
  customerCoords,
  origin,
  destination,
  originLabel,
  destLabel,
  mode = "customer_to_artist",
  distanceText,
  etaText,
  statusText = "Artist is traveling to your location",
  onExpand,
  onRouteUpdate,
  height = 200
}) {
  const orig = origin || (mode === "artist_to_customer" ? artistCoords : customerCoords);
  const dest = destination || (mode === "artist_to_customer" ? customerCoords : artistCoords);

  const hasCoords =
    (orig && (orig.lat || orig.latitude) && (orig.lng || orig.longitude)) ||
    (dest && (dest.lat || dest.latitude) && (dest.lng || dest.longitude));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDotOuter}>
            <View style={styles.liveDotInner} />
          </View>
          <Text style={styles.liveBadgeText}>LIVE GPS</Text>
        </View>

        <View style={styles.metricRow}>
          {distanceText ? (
            <View style={styles.metricItemDistance}>
              <Ionicons name="navigate" size={10} color="#701DDB" />
              <Text style={styles.metricTextDistance} numberOfLines={1}>{distanceText}</Text>
            </View>
          ) : null}

          {etaText ? (
            <View style={styles.metricItemEta}>
              <Ionicons name="time" size={10} color="#E91E63" />
              <Text style={styles.metricTextEta} numberOfLines={1}>{etaText}</Text>
            </View>
          ) : null}

          {onExpand && (
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={onExpand}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="scan-outline" size={13} color="#4B5563" />
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
            origin={orig}
            destination={dest}
            originLabel={originLabel}
            destLabel={destLabel}
            mode={mode}
            onRouteUpdate={onRouteUpdate}
            style={styles.map}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#E91E63" />
            <Text style={styles.loadingText}>Syncing satellite GPS coordinates...</Text>
          </View>
        )}
      </View>

      {/* Status Footer */}
      <View style={styles.footerRow}>
        <View style={styles.carIconBox}>
          <Ionicons name="car-sport" size={12} color="#701DDB" />
        </View>
        <Text style={styles.footerText} numberOfLines={1} ellipsizeMode="tail">
          {statusText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.2,
    borderColor: "#EDE9FE",
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 6
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F8",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    gap: 4,
    flexShrink: 0
  },
  liveDotOuter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(233, 30, 99, 0.2)",
    justifyContent: "center",
    alignItems: "center"
  },
  liveDotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E91E63"
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#E91E63",
    letterSpacing: 0.5
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    justifyContent: "flex-end"
  },
  metricItemDistance: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    flexShrink: 1
  },
  metricTextDistance: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#701DDB"
  },
  metricItemEta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8FA",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    flexShrink: 1
  },
  metricTextEta: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#E91E63"
  },
  expandBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexShrink: 0
  },
  mapContainer: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6"
  },
  map: {
    width: "100%",
    height: "100%"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  loadingText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 6
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6
  },
  carIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0
  },
  footerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4C1D95",
    flex: 1,
    flexShrink: 1
  }
});
