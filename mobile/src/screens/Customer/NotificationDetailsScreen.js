import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { markNotificationAsRead } from "../../services/notificationApi";
import { handleNotificationNavigation } from "../../services/deepLink";
import { formatDateTime } from "../../utils/date";

const NOTIF_ICONS = {
  booking: "calendar-check-outline",
  payment: "wallet-outline",
  reminder: "alarm-outline",
  promo: "pricetag-outline",
  system: "settings-outline",
};

const NOTIF_COLORS = {
  booking: { bg: "#E8FFF0", text: "#16A34A" },
  payment: { bg: "#FFF2F2", text: "#EF4444" },
  reminder: { bg: "#FFF8E1", text: "#F59E0B" },
  promo: { bg: "#F3E8FF", text: "#8B5CF6" },
  system: { bg: "#F0F0FF", text: "#6366F1" },
};

export default function NotificationDetailsScreen({ route, navigation }) {
  const { id, notification: initialNotification } = route.params || {};
  const [notification, setNotification] = useState(initialNotification || null);
  const [loading, setLoading] = useState(!initialNotification);

  useEffect(() => {
    if (!id) {
      navigation.goBack();
      return;
    }

    async function loadAndMarkRead() {
      try {
        let currentNotif = notification;
        if (!currentNotif) {
          const { getNotificationHistory } = require("../../services/notificationApi");
          const res = await getNotificationHistory(1, 50);
          const list = res.notifications || [];
          const found = list.find((n) => String(n.id) === String(id));
          if (found) {
            setNotification(found);
            currentNotif = found;
            setLoading(false);
          } else {
            // If still not found, stop loading
            setLoading(false);
          }
        }
        
        // Mark read on server
        if (currentNotif && !currentNotif.is_read) {
          await markNotificationAsRead(id);
        }
      } catch (err) {
        if (__DEV__) console.log("Error loading notification details/marking read:", err.message);
        setLoading(false);
      }
    }

    loadAndMarkRead();
  }, [id, notification, navigation]);

  const handleAction = () => {
    if (!notification) return;
    handleNotificationNavigation(notification, navigation, "customer");
  };

  if (loading || !notification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const typeKey = notification.type ? notification.type.toLowerCase() : "system";
  const iconName = NOTIF_ICONS[typeKey] || "notifications-outline";
  const colors = NOTIF_COLORS[typeKey] || NOTIF_COLORS.system;

  // Determine if action button should render
  let hasAction = false;
  let actionLabel = "Back";

  const notifTitle = (notification.title || "").toLowerCase();
  const notifMessage = (notification.message || "").toLowerCase();

  const isBooking = typeKey === "booking" || notifTitle.includes("booking") || notifMessage.includes("booking");
  const isWallet = typeKey === "wallet" || notifTitle.includes("wallet") || notifTitle.includes("cashback") || notifMessage.includes("wallet") || notifMessage.includes("cashback");
  const isChat = typeKey === "chat" || notifTitle.includes("message") || notifMessage.includes("message");

  if (isBooking) {
    hasAction = true;
    const isPaymentRejected = notifTitle.includes("reject") || notifMessage.includes("not received");
    actionLabel = isPaymentRejected ? "Complete Payment Now" : "View Booking Details";
  } else if (isChat) {
    hasAction = true;
    actionLabel = "Open Conversation";
  } else if (isWallet) {
    hasAction = true;
    actionLabel = "View Wallet Details";
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alert Details</Text>
        </View>

        {/* Content Box */}
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.bg }]}>
            <Ionicons name={iconName} size={32} color={colors.text} />
          </View>

          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.timestamp}>
            {formatDateTime(notification.createdAt || notification.created_at || notification.timestamp)}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.message}>{notification.message}</Text>

          {hasAction && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
              <Ionicons name="arrow-forward-circle" size={18} color={Colors.white} />
              <Text style={styles.actionBtnText}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  content: { paddingHorizontal: 24, alignItems: "center", paddingTop: 30 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text, textAlign: "center" },
  timestamp: { fontSize: 13, color: Colors.textTertiary, marginTop: 8 },
  divider: { width: "100%", height: 1, backgroundColor: Colors.border, marginVertical: 24 },
  message: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24, textAlign: "left", width: "100%" },
  actionBtn: {
    marginTop: 40,
    marginBottom: 40,
    height: 52,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    alignSelf: "stretch"
  },
  actionBtnText: { color: Colors.white, fontWeight: "600", fontSize: 15, marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" }
});