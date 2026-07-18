import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { artistService } from '../../services/api';
import { Check, X, MessageSquare, FileText } from 'lucide-react-native';
import { router } from 'expo-router';

export default function ArtistBookings() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await artistService.getArtistBookings();
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

  const handleBookingStatus = async (id, status) => {
    try {
      await artistService.updateBookingStatus(id, {
        booking_status: status,
        cancel_reason: status === "CANCELLED" ? "Declined by artist" : undefined,
      });
      Alert.alert("Success", `Booking updated to ${status}!`);
      fetchBookings();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
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
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Client: {item.user?.name}</Text>

          </View>
          <View style={{ 
            backgroundColor: item.booking_status === 'CONFIRMED' ? colors.success : 
                             item.booking_status === 'PENDING' ? colors.warning : colors.danger, 
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 
          }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{item.booking_status}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Address: {item.address}</Text>
          <Text style={{ color: colors.textSecondary }}>
            Date: {start.toLocaleDateString()} at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
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

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {item.booking_status === "PENDING" && (
            <>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.success }]} onPress={() => handleBookingStatus(item.id, "CONFIRMED")}>
                <Check size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.danger }]} onPress={() => handleBookingStatus(item.id, "CANCELLED")}>
                <X size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}
          
          {item.booking_status === "CONFIRMED" && (
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.success }]} onPress={() => handleBookingStatus(item.id, "COMPLETED")}>
              <Text style={styles.btnPrimaryText}>Complete Service</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.btnSecondary, { flex: 1, flexDirection: 'row', gap: 8 }]} 
            onPress={() => router.push(`/chat?receiverId=${item.user?.id}`)}
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
              <FileText size={64} color={colors.accent} style={{ marginBottom: 16 }} />
              <Text style={[styles.title, { marginBottom: 8 }]}>No Bookings</Text>
              <Text style={[styles.subtitle, { textAlign: 'center' }]}>You have no bookings yet.</Text>
            </View>
          )
        }
      />
    </View>
  );
}
