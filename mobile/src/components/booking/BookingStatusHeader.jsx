import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";

const STATUS_CONFIG = {
  PENDING: {
    label: "Waiting for Confirmation",
    color: "#D97706",
    bg: "#FEF3C7",
    icon: "time-outline"
  },
  CONFIRMED: {
    label: "Booking Confirmed",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "checkmark-circle-outline"
  },
  ARTIST_ACCEPTED: {
    label: "Artist Accepted",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "checkmark-circle-outline"
  },
  ARTIST_ON_THE_WAY: {
    label: "Artist is On The Way",
    color: "#701DDB",
    bg: "#EDE9FE",
    icon: "car-sport-outline"
  },
  ON_THE_WAY: {
    label: "Artist is On The Way",
    color: "#701DDB",
    bg: "#EDE9FE",
    icon: "car-sport-outline"
  },
  ARTIST_ARRIVED: {
    label: "Artist Arrived",
    color: "#2563EB",
    bg: "#DBEAFE",
    icon: "location-outline"
  },
  ARRIVED: {
    label: "Artist Arrived",
    color: "#2563EB",
    bg: "#DBEAFE",
    icon: "location-outline"
  },
  CUSTOMER_VERIFIED: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FCE7F3",
    icon: "color-palette-outline"
  },
  SERVICE_STARTED: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FCE7F3",
    icon: "color-palette-outline"
  },
  SERVICE_IN_PROGRESS: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FCE7F3",
    icon: "color-palette-outline"
  },
  IN_PROGRESS: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FCE7F3",
    icon: "color-palette-outline"
  },
  PROCESSING: {
    label: "Service In Progress",
    color: "#E91E63",
    bg: "#FCE7F3",
    icon: "color-palette-outline"
  },
  ACCEPTED: {
    label: "Artist Accepted",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "checkmark-circle-outline"
  },
  CHECKOUT: {
    label: "Payment Required",
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: "card-outline"
  },
  PAYMENT_REQUIRED: {
    label: "Payment Required",
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: "card-outline"
  },
  PAYMENT_COMPLETED: {
    label: "Payment Successful",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "checkmark-done-circle-outline"
  },
  COMPLETED: {
    label: "Booking Completed",
    color: "#059669",
    bg: "#D1FAE5",
    icon: "ribbon-outline"
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#6B7280",
    bg: "#F3F4F6",
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
        {showBackButton && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text || "#212121"} />
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.bookingIdLabel}>Booking ID</Text>
          <Text style={styles.bookingIdText}>
            #{bookingCode || "MG-BOOKING"}
          </Text>
        </View>

        <View style={styles.rightActions}>
          {rightAction ? (
            rightAction
          ) : onSupport ? (
            <TouchableOpacity
              style={styles.supportBtn}
              onPress={onSupport}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle-outline" size={20} color="#701DDB" />
              <Text style={styles.supportBtnText}>Help</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      {/* Dynamic Status Pill */}
      <View style={[styles.statusBanner, { backgroundColor: config.bg, borderColor: config.color + "40" }]}>
        <Ionicons name={config.icon} size={16} color={config.color} style={styles.statusIcon} />
        <Text style={[styles.statusText, { color: config.color }]}>
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
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center"
  },
  titleContainer: {
    flex: 1,
    alignItems: "center"
  },
  bookingIdLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  bookingIdText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121",
    marginTop: 1
  },
  rightActions: {
    minWidth: 40,
    alignItems: "flex-end"
  },
  supportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4
  },
  supportBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#701DDB"
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1
  },
  statusIcon: {
    marginRight: 6
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2
  }
});
