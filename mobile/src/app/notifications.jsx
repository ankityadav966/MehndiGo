import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { getGlobalStyles } from '../theme/globalStyles';
import { Colors } from '../theme/colors';
import { Bell, Check } from 'lucide-react-native';
import { SOCKET_URL } from '../services/api';
import { getNotificationHistory, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationApi';
import { handleNotificationNavigation } from '../services/deepLink';

export default function NotificationsScreen() {
  const { user, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotificationHistory(1, 50);
      const list = data?.notifications || (Array.isArray(data) ? data : []);
      setNotifications(list);
    } catch (err) {
      console.warn("Failed to load notifications:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (user?.id) {
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);

      newSocket.emit("join", user.id);

      newSocket.on("new_notification", (data) => {
        setNotifications((prev) => [
          {
            id: data.id || Date.now().toString(),
            title: data.title,
            message: data.message,
            type: data.type || "SYSTEM",
            data: data.data || null,
            is_read: false,
            createdAt: data.createdAt || new Date().toISOString(),
          },
          ...prev,
        ]);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.warn("Error marking all read:", err.message);
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
    } catch (err) {
      console.warn("Error marking notification as read:", err.message);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleNotificationPress(item)}
      style={[styles.glassPanel, { 
        marginBottom: 12, 
        backgroundColor: item.is_read ? colors.bgSecondary : colors.bgTertiary,
        borderLeftWidth: item.is_read ? 0 : 4,
        borderLeftColor: colors.accent 
      }]}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
        {item.title}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
        {item.message}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textSecondary }}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { padding: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Bell size={24} color={colors.textPrimary} />
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={{ backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{unreadCount} New</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Check size={16} color={colors.accent} />
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Bell size={64} color={colors.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>You have no notifications.</Text>
          </View>
        }
      />
    </View>
  );
}
