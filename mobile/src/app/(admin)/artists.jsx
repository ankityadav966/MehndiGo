import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { adminService } from '../../services/admin';
import { Award } from 'lucide-react-native';

export default function AdminArtists() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchArtists = async () => {
    try {
      const res = await adminService.getArtists();
      setArtists(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchArtists();
  };

  const renderArtist = ({ item }) => (
    <View style={[styles.glassPanel, { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(253, 121, 168, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
        <Award size={20} color="#fd79a8" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{item.user?.name || "N/A"}</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>{item.city}, {item.state}</Text>
        <Text style={{ fontSize: 14, color: colors.accent, fontWeight: '700' }}>★ {item.avg_rating || "New"}</Text>
      </View>
      <View style={{ 
        backgroundColor: item.verification_status === "APPROVED" ? colors.success : 
                         item.verification_status === "PENDING" ? colors.warning : colors.danger, 
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 
      }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
          {item.verification_status}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={artists}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderArtist}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Award size={64} color={colors.accent} style={{ marginBottom: 16 }} />
              <Text style={[styles.title, { marginBottom: 8 }]}>No Artists Found</Text>
            </View>
          )
        }
      />
    </View>
  );
}
