import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";

const ICON_MAP = {
  bookings: "calendar-outline",
  wishlist: "heart-outline",
  portfolio: "images-outline",
  notifications: "notifications-outline",
  reviews: "star-outline",
  transactions: "wallet-outline",
  leads: "people-outline",
  search: "search-outline",
  cart: "cart-outline",
  error: "alert-circle-outline",
  success: "checkmark-circle-outline",
  default: "document-text-outline",
};

export default function EmptyState({
  icon = "default",
  title = "No data found",
  message = "There's nothing here yet.",
  actionLabel,
  onAction,
}) {
  const iconName = ICON_MAP[icon] || ICON_MAP.default;
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={36} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={styles.actionBtn}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
    paddingVertical: 50,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(156, 19, 68, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "Poppins",
    marginBottom: 6,
    textAlign: "center",
  },
  message: {
    fontSize: 13.5,
    fontWeight: "400",
    color: Colors.textSecondary,
    fontFamily: "Poppins",
    textAlign: "center",
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  action: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Poppins",
  },
});
