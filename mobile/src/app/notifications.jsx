import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Platform } from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { getGlobalStyles } from '../theme/globalStyles';
import { Colors } from '../theme/colors';
import { Bell, Check } from 'lucide-react-native';

const SOCKET_URL = 'http://98.70.11.123:8000';

export default function NotificationsScreen() {
  const { user, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user?.id) {
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);

      newSocket.emit("join", user.id);

      newSocket.on("new_notification", (data) => {
        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: data.title,
            message: data.message,
            is_read: false,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderNotification = ({ item }) => (
    <View style={[styles.glassPanel, { 
      marginBottom: 12, 
      backgroundColor: item.is_read ? colors.bgSecondary : colors.bgTertiary,
      borderLeftWidth: item.is_read ? 0 : 4,
      borderLeftColor: colors.accent 
    }]}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
        {item.title}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
        {item.message}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textSecondary }}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </View>
  );

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
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
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
