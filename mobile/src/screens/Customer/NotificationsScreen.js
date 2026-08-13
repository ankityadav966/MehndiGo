import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import {
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "../../services/notificationApi";
import { handleNotificationNavigation } from "../../services/deepLink";

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotificationsList = useCallback(async () => {
    try {
      const data = await getNotificationHistory(1, 50);
      setNotifications(Array.isArray(data) ? data : (data?.notifications || []));
    } catch (err) {
      console.log("Failed to load notifications list:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotificationsList();
    }, [fetchNotificationsList])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotificationsList();
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true, isRead: true })));
      Alert.alert("Success 🎉", "All notifications marked as read");
    } catch (err) {
      Alert.alert("Error", "Failed to mark all as read");
    }
  };

  const handleNotificationPress = async (item) => {
    try {
      if (!item.is_read && !item.isRead) {
        await markNotificationAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true, isRead: true } : n))
        );
      }
      handleNotificationNavigation(item, navigation, "customer");
    } catch (err) {
      navigation.navigate("NotificationDetails", { id: item.id, notification: item });
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "BOOKING":
        return "calendar-outline";
      case "PAYMENT":
        return "cash-outline";
      case "PROMOTION":
        return "gift-outline";
      default:
        return "notifications-outline";
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.is_read && !item.isRead;
    return (
      <TouchableOpacity
        style={[styles.notifCard, isUnread && styles.unread]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconCircle, { backgroundColor: isUnread ? "#FFF0F4" : Colors.background }]}>
          <Ionicons name={getIconForType(item.type)} size={18} color={isUnread ? Colors.primary : Colors.textTertiary} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.titleText, isUnread && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.messageText} numberOfLines={2}>
            {item.message || item.body}
          </Text>
          <Text style={styles.timeText}>
            {item.created_at || item.createdAt ? new Date(item.created_at || item.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some((n) => !n.is_read && !n.isRead) ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.readAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, idx) => String(item.id || idx)}
          renderItem={renderItem}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Notifications Yet</Text>
              <Text style={styles.emptySub}>We will notify you here when your booking or payment status changes.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  readAllText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  listContent: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  notifCard: { flexDirection: "row", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, marginBottom: 10 },
  unread: { backgroundColor: "#FFF8F9", borderColor: Colors.primary },
  iconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", marginRight: 12 },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleText: { fontSize: 14, fontWeight: "600", color: Colors.text, flex: 1 },
  unreadTitle: { fontWeight: "700", color: Colors.text },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 6 },
  messageText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 17 },
  timeText: { fontSize: 10, color: Colors.textTertiary, marginTop: 6 },
  emptyState: { alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: 12, color: Colors.textSecondary, textAlign: "center", marginTop: 4, paddingHorizontal: 20 },
});