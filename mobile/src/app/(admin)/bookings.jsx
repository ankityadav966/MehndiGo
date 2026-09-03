import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { adminService } from '../../services/admin';
import { Calendar } from 'lucide-react-native';

export default function AdminBookings() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await adminService.getBookings();
      setBookings(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const renderBooking = ({ item }) => (
    <View style={[styles.glassPanel, { marginBottom: 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{item.booking_code}</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>₹{item.total_price}</Text>
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Client: {item.user?.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Artist: {item.artist?.user?.name || `ID #${item.artist_id}`}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ backgroundColor: item.booking_status === 'CONFIRMED' || item.booking_status === 'COMPLETED' ? colors.success : item.booking_status === 'PENDING' ? colors.warning : colors.danger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{item.booking_status}</Text>
        </View>
        <View style={{ backgroundColor: item.payment_status === 'PAID' ? colors.success : colors.warning, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Pay: {item.payment_status}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBooking}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Calendar size={64} color={colors.accent} style={{ marginBottom: 16 }} />
              <Text style={[styles.title, { marginBottom: 8 }]}>No Bookings</Text>
            </View>
          )
        }
      />
    </View>
  );
}
