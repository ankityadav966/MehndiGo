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
        <Ionicons name={iconName} size={40} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.actionBtn}>
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
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontWeight: "400",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  action: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
  actionBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
  },
});
