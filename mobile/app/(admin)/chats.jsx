import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { adminService } from '../../services/api';
import { MessageSquare } from 'lucide-react-native';

export default function AdminChats() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = async () => {
    try {
      const res = await adminService.getChats();
      setChats(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const renderChat = ({ item }) => (
    <View style={[styles.glassPanel, { marginBottom: 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>From: {item.sender?.name} ({item.sender?.role})</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>To: {item.receiver?.name} ({item.receiver?.role})</Text>
      </View>
      <View style={{ backgroundColor: colors.bgPrimary, padding: 12, borderRadius: 8, marginBottom: 8 }}>
        <Text style={{ fontStyle: 'italic', color: colors.textPrimary }}>"{item.message}"</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ backgroundColor: item.is_read ? colors.success : colors.bgTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: item.is_read ? '#fff' : colors.textPrimary, fontSize: 10, fontWeight: '700' }}>
            {item.is_read ? "Read" : "Delivered"}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderChat}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <MessageSquare size={64} color={colors.accent} style={{ marginBottom: 16 }} />
              <Text style={[styles.title, { marginBottom: 8 }]}>No Chat Activity</Text>
            </View>
          )
        }
      />
    </View>
  );
}
