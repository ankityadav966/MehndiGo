import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { adminService } from '../../services/api';
import { Users, Award, Calendar, DollarSign } from 'lucide-react-native';

export default function AdminOverview() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArtists: 0,
    totalBookings: 0,
    pendingArtistsCount: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    remainingAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await adminService.getStats();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.title}>Platform Analytics</Text>
        <Text style={styles.subtitle}>Monitor key metrics and revenue</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
          <View style={{ backgroundColor: 'rgba(108, 92, 231, 0.1)', padding: 12, borderRadius: 12, marginBottom: 8 }}>
            <Users size={24} color="#6c5ce7" />
          </View>
          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Customers</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>{stats.totalUsers}</Text>
        </View>

        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
          <View style={{ backgroundColor: 'rgba(253, 121, 168, 0.1)', padding: 12, borderRadius: 12, marginBottom: 8 }}>
            <Award size={24} color="#fd79a8" />
          </View>
          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Artists</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>{stats.totalArtists}</Text>
        </View>

        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
          <View style={{ backgroundColor: 'rgba(0, 184, 148, 0.1)', padding: 12, borderRadius: 12, marginBottom: 8 }}>
            <Calendar size={24} color="#00b894" />
          </View>
          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Bookings</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>{stats.totalBookings}</Text>
        </View>

        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center', borderColor: colors.success, borderWidth: 1 }]}>
          <View style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: 12, borderRadius: 12, marginBottom: 8 }}>
            <DollarSign size={24} color={colors.success} />
          </View>
          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Total Revenue</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.success }}>₹{stats.totalRevenue}</Text>
        </View>

        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center', borderColor: colors.warning, borderWidth: 1 }]}>
          <View style={{ backgroundColor: 'rgba(241, 196, 15, 0.1)', padding: 12, borderRadius: 12, marginBottom: 8 }}>
            <DollarSign size={24} color={colors.warning} />
          </View>
          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Pending Rev.</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.warning }}>₹{stats.pendingAmount}</Text>
        </View>

        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center', borderColor: colors.accent, borderWidth: 1 }]}>
          <View style={{ backgroundColor: 'rgba(217, 125, 100, 0.1)', padding: 12, borderRadius: 12, marginBottom: 8 }}>
            <DollarSign size={24} color={colors.accent} />
          </View>
          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Remaining Rev.</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.accent }}>₹{stats.remainingAmount}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
