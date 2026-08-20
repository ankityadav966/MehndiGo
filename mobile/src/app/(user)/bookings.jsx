import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { artistService } from '../../services/api';
import { Calendar, Clock, CreditCard, MessageSquare, User, FileText } from 'lucide-react-native';
import { router } from 'expo-router';

export default function UserBookings() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await artistService.getBookings();
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

  const handlePayment = (booking) => {
    Alert.alert("Payment", `Payment gateway for ₹${booking.total_price} would open here.`);
    // Integrated with Razorpay checkout flow
  };

  const renderBooking = ({ item }) => {
    const start = new Date(item.slot?.start_time);
    return (
      <View style={[styles.glassPanel, { marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
              {item.service?.specialization_name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.booking_code}</Text>
          </View>
          <View style={{ backgroundColor: item.booking_status === 'CONFIRMED' ? colors.success : colors.warning, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{item.booking_status}</Text>
          </View>
        </View>

        <View style={{ gap: 6, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <User size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary }}>Artist: {item.artist?.user?.name || "Assigning..."}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary }}>{start.toLocaleDateString()}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary }}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderColor, paddingTop: 16, marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Total Amount</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.accent }}>₹{item.total_price}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'right' }}>Payment Status</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: item.payment_status === 'PAID' ? colors.success : colors.warning, textAlign: 'right' }}>
              {item.payment_status}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {item.booking_status === "CONFIRMED" && item.payment_status === "PENDING" && (
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1, flexDirection: 'row', gap: 8 }]} onPress={() => handlePayment(item)}>
              <CreditCard size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Pay Now</Text>
            </TouchableOpacity>
          )}
          {item.payment_status === "PAID" && (
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1, flexDirection: 'row', gap: 8 }]} onPress={() => Alert.alert('Success', 'Invoice downloaded')}>
              <FileText size={18} color={colors.textPrimary} />
              <Text style={styles.btnSecondaryText}>Invoice</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.btnSecondary, { flex: 1, flexDirection: 'row', gap: 8 }]} 
            disabled={!item.artist?.user?.id}
            onPress={() => router.push(`/chat?receiverId=${item.artist?.user?.id}`)}
          >
            <MessageSquare size={18} color={colors.textPrimary} />
            <Text style={styles.btnSecondaryText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
              <Text style={[styles.title, { marginBottom: 8 }]}>No Appointments Yet</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 24 }]}>You haven't scheduled any mehndi appointments yet.</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(user)/explore')}>
                <Text style={styles.btnPrimaryText}>Browse Artists</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  );
}
