import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getNotificationHistory, markNotificationAsRead } from "../../services/notificationApi";

export default function NotificationDetailsScreen({ route, navigation }) {
  const { id, notification: paramNotification } = route.params || {};

  const [notification, setNotification] = useState(paramNotification || null);
  const [loading, setLoading] = useState(!paramNotification);

  useEffect(() => {
    const loadAndMarkRead = async () => {
      try {
        let currentNotif = paramNotification;
        if (!currentNotif && id) {
          const data = await getNotificationHistory(1, 50);
          const list = data?.notifications || data || [];
          currentNotif = list.find((n) => String(n.id) === String(id));
          if (currentNotif) {
            setNotification(currentNotif);
          }
        }
        
        // Mark read on server
        if (currentNotif && !currentNotif.is_read) {
          await markNotificationAsRead(currentNotif.id);
        }
      } catch (err) {
        console.log("Error loading notification details:", err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAndMarkRead();
  }, [id, paramNotification]);

  const getIcon = () => {
    if (!notification) return "notifications-outline";
    const type = (notification.type || "").toLowerCase();
    switch (type) {
      case "booking": return "calendar-outline";
      case "payment": return "wallet-outline";
      case "reminder": return "alarm-outline";
      case "promo": return "pricetag-outline";
      default: return "notifications-outline";
    }
  };

  const handleAction = () => {
    if (!notification) return;

    let meta = {};
    if (notification.data) {
      try {
        meta = typeof notification.data === "string" ? JSON.parse(notification.data) : notification.data;
      } catch (e) {}
    }

    const type = notification.type ? notification.type.toLowerCase() : "";
    const title = (notification.title || "").toLowerCase();
    const message = (notification.message || "").toLowerCase();

    const bookingId = meta.bookingId || meta.booking_id;
    const isCashRequest = title.includes("cash") || message.includes("cash") || type === "cash_request";
    const isBooking = type === "booking" || title.includes("booking") || message.includes("booking");

    if (isCashRequest) {
      // Open Artist Dashboard -> Quick Management Control -> Pending Cash Payment Requests
      navigation.navigate("ArtistTabs", { screen: "Dashboard" });
    } else if (isBooking && bookingId) {
      navigation.navigate("BookingDetails", { bookingId: bookingId });
    } else {
      navigation.navigate("ArtistTabs", { screen: "Dashboard" });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Notification details not found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={{ color: Colors.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name={getIcon()} size={32} color={Colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.timestamp}>
          {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : "Recently"}
        </Text>

        <View style={styles.messageCard}>
          <Text style={styles.messageLabel}>Message</Text>
          <Text style={styles.message}>{notification.message}</Text>
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
          <Text style={styles.actionText}>View Action Details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", elevation: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  iconContainer: { alignItems: "center", marginTop: 20, marginBottom: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF0F6", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111", textAlign: "center" },
  timestamp: { fontSize: 13, color: "#999", textAlign: "center", marginTop: 6 },
  messageCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 18, marginTop: 25, elevation: 1, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 2, shadowOffset: { width: 0, height: 2 } },
  messageLabel: { fontSize: 14, fontWeight: "600", color: Colors.primary, marginBottom: 10 },
  message: { fontSize: 14, lineHeight: 22, color: "#555" },
  actionBtn: { marginTop: 25, height: 52, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  actionText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
});
