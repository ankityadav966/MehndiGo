import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { useNotifications } from "../../context/NotificationContext";
import {
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
} from "../../services/notificationApi";

const NOTIF_ICONS = {
  booking: "calendar-outline",
  payment: "wallet-outline",
  wallet: "cash-outline",
  review: "star-outline",
  profile: "person-outline",
  promo: "pricetag-outline",
  reminder: "alarm-outline",
  system: "settings-outline",
};

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function groupNotificationsByDate(notifications) {
  const groups = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  notifications.forEach((notif) => {
    const date = new Date(notif.createdAt || notif.timestamp);
    let key;
    if (date.toDateString() === today) {
      key = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = "Yesterday";
    } else {
      key = date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(notif);
  });

  return groups;
}

export default function NotificationCenterScreen({ navigation }) {
  const { setUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);

  const [activeCategory, setActiveCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const CATEGORY_FILTERS = [
    { id: "ALL", label: "All" },
    { id: "BOOKING", label: "Bookings", icon: "calendar-outline" },
    { id: "PAYMENT", label: "Payments", icon: "card-outline" },
    { id: "WALLET", label: "Wallet", icon: "wallet-outline" },
    { id: "PROMO", label: "Promos", icon: "pricetag-outline" },
  ];


  const fetchNotifications = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      const res = await getNotificationHistory(pageNum, 20);
      const items = res.notifications || [];

      if (pageNum === 1) {
        setNotifications(items);
      } else {
        setNotifications((prev) => [...prev, ...items]);
      }

      setHasMore(items.length === 20);
      setPage(pageNum);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.log("Error loading notification history:", err.message);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [setUnreadCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchNotifications(page + 1).finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, page, fetchNotifications]);

  const handleNotificationPress = useCallback(async (item) => {
    try {
      // Mark as read locally and on server
      if (!item.is_read) {
        await markNotificationAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // Navigate to details screen
      navigation.navigate("NotificationDetails", { id: item.id, notification: item });
    } catch (err) {
      console.log("Error handling notification press:", err.message);
    }
  }, [navigation, setUnreadCount]);

  const handleDelete = async (id) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to remove this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const item = notifications.find(n => n.id === id);
              await deleteNotification(id);
              setNotifications(prev => prev.filter(n => n.id !== id));
              if (item && !item.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          }
        }
      ]
    );
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      "Clear All",
      "Do you want to clear your entire notification history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllNotifications();
              setNotifications([]);
              setUnreadCount(0);
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          }
        }
      ]
    );
  };

  const filteredNotifications = activeCategory === "ALL"
    ? notifications
    : notifications.filter(n => (n.type || "").toUpperCase() === activeCategory);

  const grouped = groupNotificationsByDate(filteredNotifications);
  const sections = Object.entries(grouped);


  const renderNotificationItem = (item) => {
    const iconName = NOTIF_ICONS[item.type?.toLowerCase()] || "notifications-outline";
    const isUnread = !item.is_read;

    return (
      <View key={item.id} style={[styles.notifCard, isUnread && styles.unreadCard]}>
        <TouchableOpacity
          style={styles.cardPressArea}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isUnread ? Colors.primaryLight + "40" : Colors.border }
            ]}
          >
            <Ionicons name={iconName} size={20} color={isUnread ? Colors.primary : Colors.textTertiary} />
          </View>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.body} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        {/* Delete Quick Option */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerActionBtn}>
              <Text style={styles.headerActionText}>Mark All Read</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearAll} style={styles.headerActionBtn}>
              <Text style={[styles.headerActionText, { color: Colors.error }]}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterChip, isActive && styles.activeFilterChip]}
                onPress={() => setActiveCategory(cat.id)}
              >
                {cat.icon && (
                  <Ionicons
                    name={cat.icon}
                    size={14}
                    color={isActive ? "#FFFFFF" : Colors.primary}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.filterChipText, isActive && styles.activeFilterChipText]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="notifications-off-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>{"We'll notify you when booking updates arrive."}</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item[0]}
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <Text style={styles.sectionDate}>{section[0]}</Text>
              {section[1].map(renderNotificationItem)}
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerActionBtn: { marginLeft: 14, paddingVertical: 4 },
  headerActionText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  filterBar: {
    backgroundColor: Colors.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground || "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border || "#E5E7EB",
  },
  activeFilterChip: {
    backgroundColor: Colors.primary || "#9C1344",
    borderColor: Colors.primary || "#9C1344",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text || "#1D1D1D",
  },
  activeFilterChipText: {
    color: "#FFFFFF",
  },

  listContent: { paddingBottom: 50 },
  section: { marginBottom: 8 },
  sectionDate: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  unreadCard: { backgroundColor: Colors.primaryLight + "15" },
  cardPressArea: { flex: 1, flexDirection: "row", alignItems: "flex-start" },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2
  },
  content: { flex: 1, marginRight: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "500", color: Colors.text, flex: 1 },
  unreadTitle: { fontWeight: "700", color: Colors.text },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 8 },
  body: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  time: { fontSize: 11, color: Colors.textTertiary, marginTop: 6 },
  deleteBtn: { padding: 8, justifyContent: "center", alignItems: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, marginTop: 120 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight + "40",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  emptySubtitle: { fontSize: 14, color: Colors.textTertiary, marginTop: 6, textAlign: "center", lineHeight: 20 }
});
