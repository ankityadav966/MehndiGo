import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
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
import Colors from "../../constants/Colors";
import {
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "../../services/notificationApi";

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotificationsList = React.useCallback(async () => {
    try {
      const data = await getNotificationHistory(1, 50);
      setNotifications(data?.notifications || data || []);
    } catch (err) {
      console.log("Failed to load notifications list:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotificationsList();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchNotificationsList]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotificationsList();
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      Alert.alert("Success", "All notifications marked as read");
    } catch (err) {
      Alert.alert("Error", "Failed to mark all as read");
    }
  };

  const handleNotificationPress = async (item) => {
    try {
      if (!item.is_read) {
        await markNotificationAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      }
      navigation.navigate("NotificationDetails", { id: item.id, notification: item });
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
    const isUnread = !item.is_read;
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
            <Text style={[styles.title, isUnread && styles.unreadTitle]}>{item.title}</Text>
            {isUnread && <View style={styles.dot} />}
          </View>
          <Text style={styles.subtitle}>{item.message}</Text>
          <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>You have no notification alerts yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
          contentContainerStyle={{ paddingVertical: 14, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  markAll: { fontSize: 12, color: Colors.primary, fontWeight: "700" },
  notifCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, marginHorizontal: 16, flexDirection: "row", borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  unread: { backgroundColor: "#FFF8FA", borderColor: Colors.primaryLight },
  iconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", marginRight: 12 },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 13, fontWeight: "700", color: Colors.text },
  unreadTitle: { color: Colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  time: { fontSize: 10, color: Colors.textTertiary, marginTop: 6 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 }
});
