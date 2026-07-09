import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { adminService } from '../../services/api';
import { Users } from 'lucide-react-native';

export default function AdminUsers() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await adminService.getUsers();
      setUsers(res.data?.rows || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const renderUser = ({ item }) => (
    <View style={[styles.glassPanel, { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgTertiary, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
          {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{item.name}</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>{item.phone}</Text>
        {item.email && <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.email}</Text>}
      </View>
      <View style={{ backgroundColor: item.is_verified ? colors.success : colors.bgTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
        <Text style={{ color: item.is_verified ? '#fff' : colors.textPrimary, fontSize: 10, fontWeight: '700' }}>
          {item.is_verified ? "Verified" : "Unverified"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUser}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Users size={64} color={colors.accent} style={{ marginBottom: 16 }} />
              <Text style={[styles.title, { marginBottom: 8 }]}>No Customers Found</Text>
            </View>
          )
        }
      />
    </View>
  );
}
