import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";

const STATUS_CONFIG = {
  PENDING: {
    label: "Waiting for Confirmation",
    color: "#D97706",
    bg: "#FFFBEB",
    borderColor: "#FDE68A",
    icon: "time-outline"
  },
  CONFIRMED: {
    label: "Booking Confirmed",
    color: "#059669",
    bg: "#ECFDF5",
    borderColor: "#A7F3D0",
    icon: "checkmark-circle-outline"
  },
  ARTIST_ACCEPTED: {
    label: "Artist Accepted",
    color: "#059669",
    bg: "#ECFDF5",
    borderColor: "#A7F3D0",
    icon: "checkmark-circle-outline"
  },
  ARTIST_ON_THE_WAY: {
    label: "Artist is On The Way",
    color: "#701DDB",
    bg: "#F5F3FF",
    borderColor: "#DDD6FE",
    icon: "car-sport-outline"
  },
  ON_THE_WAY: {
    label: "Artist is On The Way",
    color: "#701DDB",
    bg: "#F5F3FF",
    borderColor: "#DDD6FE",
    icon: "car-sport-outline"
  },
  ARTIST_ARRIVED: {
    label: "Artist Arrived",
    color: "#2563EB",
    bg: "#EFF6FF",
    borderColor: "#BFDBFE",
    icon: "location-outline"
  },
  ARRIVED: {
    label: "Artist Arrived",
    color: "#2563EB",
    bg: "#EFF6FF",
    borderColor: "#BFDBFE",
    icon: "location-outline"
  },
  CUSTOMER_VERIFIED: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FFF8FA",
    borderColor: "#FCE7F3",
    icon: "color-palette-outline"
  },
  SERVICE_STARTED: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FFF8FA",
    borderColor: "#FCE7F3",
    icon: "color-palette-outline"
  },
  SERVICE_IN_PROGRESS: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FFF8FA",
    borderColor: "#FCE7F3",
    icon: "color-palette-outline"
  },
  IN_PROGRESS: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FFF8FA",
    borderColor: "#FCE7F3",
    icon: "color-palette-outline"
  },
  PROCESSING: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FFF8FA",
    borderColor: "#FCE7F3",
    icon: "color-palette-outline"
  },
  ACCEPTED: {
    label: "Artist Accepted",
    color: "#059669",
    bg: "#ECFDF5",
    borderColor: "#A7F3D0",
    icon: "checkmark-circle-outline"
  },
  CHECKOUT: {
    label: "Payment & Settlement",
    color: "#DC2626",
    bg: "#FEF2F2",
    borderColor: "#FECACA",
    icon: "card-outline"
  },
  PAYMENT_REQUIRED: {
    label: "Payment & Settlement",
    color: "#DC2626",
    bg: "#FEF2F2",
    borderColor: "#FECACA",
    icon: "card-outline"
  },
  PAYMENT_COMPLETED: {
    label: "Payment Successful",
    color: "#059669",
    bg: "#ECFDF5",
    borderColor: "#A7F3D0",
    icon: "checkmark-done-circle-outline"
  },
  COMPLETED: {
    label: "Booking Completed",
    color: "#059669",
    bg: "#ECFDF5",
    borderColor: "#A7F3D0",
    icon: "ribbon-outline"
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#6B7280",
    bg: "#F9FAFB",
    borderColor: "#E5E7EB",
    icon: "close-circle-outline"
  }
};

export default function BookingStatusHeader({
  bookingCode,
  status,
  onBack,
  onSupport,
  showBackButton = true,
  rightAction
}) {
  const currentStatus = String(status || "PENDING").toUpperCase();
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {showBackButton ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.text || "#1D1D1D"} />
          </TouchableOpacity>
        ) : (
          <View style={styles.btnPlaceholder} />
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.bookingIdLabel} numberOfLines={1}>BOOKING ID</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeHash}>#</Text>
            <Text style={styles.bookingIdText} numberOfLines={1} ellipsizeMode="tail">
              {bookingCode || "MG-BOOKING"}
            </Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          {rightAction ? (
            rightAction
          ) : onSupport ? (
            <TouchableOpacity
              style={styles.supportBtn}
              onPress={onSupport}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="help-circle" size={15} color="#701DDB" />
              <Text style={styles.supportBtnText}>Help</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.btnPlaceholder} />
          )}
        </View>
      </View>

      {/* Dynamic Luxury Status Pill */}
      <View style={[styles.statusBanner, { backgroundColor: config.bg, borderColor: config.borderColor }]}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Ionicons name={config.icon} size={14} color={config.color} style={styles.statusIcon} />
        <Text style={[styles.statusText, { color: config.color }]} numberOfLines={1} ellipsizeMode="tail">
          {config.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0
  },
  btnPlaceholder: {
    width: 38,
    height: 38
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6
  },
  bookingIdLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2
  },
  codeHash: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#E91E63",
    marginRight: 2
  },
  bookingIdText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: 0.3
  },
  rightActions: {
    minWidth: 38,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  supportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    gap: 3
  },
  supportBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#701DDB"
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.2
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    flexShrink: 0
  },
  statusIcon: {
    marginRight: 5,
    flexShrink: 0
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    flexShrink: 1
  }
});
