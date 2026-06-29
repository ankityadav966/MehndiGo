import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { adminService } from '../../services/api';
import { Bell, Send } from 'lucide-react-native';

export default function AdminNotifications() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [targetUserId, setTargetUserId] = useState("ALL");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  const fetchData = async () => {
    try {
      const notifsRes = await adminService.getNotifications();
      setNotifications(notifsRes.data || []);

      const usersListRes = await adminService.getUsers();
      const artistListRes = await adminService.getArtists();
      
      const combined = [
        ...(usersListRes.data?.rows || usersListRes.data || []),
        ...(artistListRes.data || []).map(a => a.user).filter(Boolean)
      ];
      
      const unique = [];
      const seen = new Set();
      combined.forEach(u => {
        if (u?.id && !seen.has(u.id)) {
          seen.add(u.id);
          unique.push(u);
        }
      });
      setUsers(unique);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSend = async () => {
    if (!targetUserId || !notifTitle || !notifMessage) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    setSending(true);
    try {
      await adminService.sendSystemNotification({
        user_id: targetUserId,
        title: notifTitle,
        message: notifMessage
      });
      Alert.alert("Success", "Notification broadcasted successfully!");
      setNotifTitle("");
      setNotifMessage("");
      fetchData();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSending(false);
    }
  };

  const renderNotification = ({ item }) => (
    <View style={[styles.glassPanel, { marginBottom: 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>{item.title}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>To: {item.user?.name || "All"} ({item.user?.role || "SYSTEM"})</Text>
      </View>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>{item.message}</Text>
      <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: 'right' }}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotification}
        contentContainerStyle={{ padding: 16, paddingBottom: 300 }} // Extra padding for the form
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Bell size={64} color={colors.accent} style={{ marginBottom: 16 }} />
              <Text style={[styles.title, { marginBottom: 8 }]}>No Broadcasts</Text>
            </View>
          )
        }
      />

      <View style={[styles.glassPanel, { position: 'absolute', bottom: 0, left: 0, right: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginHorizontal: 0, padding: 20 }]}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>New Broadcast</Text>
        
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Target User ID or 'ALL'"
            placeholderTextColor={colors.textSecondary}
            value={targetUserId}
            onChangeText={setTargetUserId}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Alert Title"
            placeholderTextColor={colors.textSecondary}
            value={notifTitle}
            onChangeText={setNotifTitle}
          />
        </View>

        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          multiline
          placeholder="Type notification message..."
          placeholderTextColor={colors.textSecondary}
          value={notifMessage}
          onChangeText={setNotifMessage}
        />

        <TouchableOpacity style={[styles.btnPrimary, { flexDirection: 'row', gap: 8, marginTop: 8 }]} onPress={handleSend} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : (
            <>
              <Send size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Broadcast Alert</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
