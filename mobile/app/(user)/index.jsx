import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { artistService } from '../../services/api';
import { Activity, Plus, Calendar, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

export default function UserOverview() {
  const { user, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState({ name: "" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const bookingsRes = await artistService.getBookings();
      setBookings(bookingsRes.data || []);
      
      const profileRes = await artistService.getProfile?.() || { data: { name: user?.name || "User" } };
      // Note: authService.getProfile is what web used
      setProfile(profileRes.data || { name: "" });
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const totalSpent = bookings.filter(b => b.payment_status === "PAID").reduce((sum, b) => sum + b.total_price, 0);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={{ marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Overview of your bookings</Text>
        </View>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(user)/explore')}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
        <View style={[styles.glassPanel, { flex: 1, alignItems: 'center' }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Total Bookings</Text>
          <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary }}>{bookings.length}</Text>
        </View>
        <View style={[styles.glassPanel, { flex: 1, alignItems: 'center' }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Total Spent</Text>
          <Text style={{ fontSize: 32, fontWeight: '800', color: colors.accent }}>₹{totalSpent}</Text>
        </View>
      </View>

      <View style={styles.glassPanel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Activity size={24} color={colors.textPrimary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Recent Updates</Text>
        </View>

        {bookings.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No recent activity.</Text>
        ) : (
          bookings.slice(0, 3).map((booking, idx, arr) => (
            <View key={booking.id} style={{ flexDirection: 'row', gap: 16, marginBottom: idx === arr.length - 1 ? 0 : 20 }}>
              <View style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 20, 
                backgroundColor: booking.booking_status === "CONFIRMED" ? "rgba(0, 184, 148, 0.2)" : "rgba(108, 92, 231, 0.2)",
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <Calendar size={20} color={booking.booking_status === "CONFIRMED" ? "#00b894" : "#6c5ce7"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                  Booking {booking.booking_status.toLowerCase()}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 4 }}>
                  Your booking with {booking.artist?.user?.name || "Artist"} is {booking.booking_status.toLowerCase()}.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {new Date(booking.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
