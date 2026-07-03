import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationDetailsScreen({ navigation }) {
  const notification = {
    type: "booking",
    title: "New Booking Request",
    message: "Ananya Sharma has sent you a booking request for Bridal Mehendi on 24 May 2026 at 11:00 AM. Please review and respond to the request.",
    timestamp: "Today, 10:30 AM",
    actionLabel: "View Booking",
    actionScreen: "BookingDetails",
  };

  const getIcon = () => {
    switch (notification.type) {
      case "booking": return "calendar-outline";
      case "payment": return "wallet-outline";
      case "reminder": return "alarm-outline";
      case "promo": return "pricetag-outline";
      default: return "notifications-outline";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name={getIcon()} size={32} color="#F7146B" />
          </View>
        </View>

        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.timestamp}>{notification.timestamp}</Text>

        <View style={styles.messageCard}>
          <Text style={styles.messageLabel}>Message</Text>
          <Text style={styles.message}>{notification.message}</Text>
        </View>

        {notification.actionLabel && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (notification.actionScreen === "BookingDetails") {
                navigation.navigate("BookingDetails", { bookingId: 10 });
              } else {
                navigation.navigate(notification.actionScreen);
              }
            }}
          >
            <Text style={styles.actionText}>{notification.actionLabel}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8FA" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", elevation: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  iconContainer: { alignItems: "center", marginTop: 20, marginBottom: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF0F6", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111", textAlign: "center" },
  timestamp: { fontSize: 13, color: "#999", textAlign: "center", marginTop: 6 },
  messageCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 18, marginTop: 25, elevation: 1, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 2, shadowOffset: { width: 0, height: 2 } },
  messageLabel: { fontSize: 14, fontWeight: "600", color: "#F7146B", marginBottom: 10 },
  message: { fontSize: 14, lineHeight: 22, color: "#555" },
  actionBtn: { marginTop: 25, height: 52, borderRadius: 14, backgroundColor: "#F7146B", justifyContent: "center", alignItems: "center" },
  actionText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
});
