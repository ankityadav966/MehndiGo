import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { artistService } from '../../services/api';
import { Calendar, Clock, DollarSign, Award, Activity } from 'lucide-react-native';

export default function ArtistOverview() {
  const { user, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const profRes = await artistService.getMyDetails();
      setProfile(profRes.data);
      
      if (profRes.data && profRes.data.verification_status === "APPROVED") {
        const bookingsRes = await artistService.getArtistBookings();
        setBookings(bookingsRes.data || []);
      }
    } catch (e) {
      if (e.message.includes("not found")) {
        setProfile(null);
      } else {
        console.error(e);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!profile || profile.verification_status !== "APPROVED") {
    return (
      <View style={[styles.container, { padding: 20, justifyContent: 'center' }]}>
        <Award size={64} color={profile?.verification_status === "REJECTED" ? colors.danger : colors.warning} style={{ alignSelf: 'center', marginBottom: 24 }} />
        <Text style={[styles.title, { textAlign: 'center', marginBottom: 12 }]}>
          {profile?.verification_status === "PENDING" ? "Verification Pending" : 
           profile?.verification_status === "REJECTED" ? "Verification Rejected" : 
           "Set Up Profile"}
        </Text>
        <Text style={[styles.subtitle, { textAlign: 'center' }]}>
          {profile?.verification_status === "PENDING" ? "We are reviewing your documents." : 
           profile?.verification_status === "REJECTED" ? "Your documents were rejected. Go to Profile to re-upload." : 
           "Go to the Profile tab to complete your verification and start receiving bookings."}
        </Text>
      </View>
    );
  }

  const paidBookings = bookings.filter((b) => b.booking_status === "COMPLETED" || b.payment_status === "PAID");
  const totalEarnings = paidBookings.reduce((sum, b) => sum + b.total_price, 0);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.title}>Dashboard Overview</Text>
        <Text style={styles.subtitle}>Summary of your business performance.</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Total Bookings</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>{bookings.length}</Text>
        </View>
        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Pending</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.warning }}>
            {bookings.filter(b => b.booking_status === "PENDING").length}
          </Text>
        </View>
        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Completed</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.success }}>
            {bookings.filter(b => b.booking_status === "COMPLETED").length}
          </Text>
        </View>
        <View style={[styles.glassPanel, { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Earnings</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.accent }}>₹{totalEarnings}</Text>
        </View>
      </View>

      <View style={styles.glassPanel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Activity size={24} color={colors.textPrimary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Recent Client Activity</Text>
        </View>

        {bookings.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No recent client activity.</Text>
        ) : (
          bookings.slice(0, 3).map((booking, idx, arr) => (
            <View key={booking.id} style={{ flexDirection: 'row', gap: 16, marginBottom: idx === arr.length - 1 ? 0 : 20 }}>
              <View style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 20, 
                backgroundColor: booking.booking_status === "PENDING" ? "rgba(241, 196, 15, 0.2)" : "rgba(0, 184, 148, 0.2)",
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <Calendar size={20} color={booking.booking_status === "PENDING" ? colors.warning : "#00b894"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                  Booking {booking.booking_status.toLowerCase()}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 4 }}>
                  {booking.user?.name || "A client"} has a {booking.booking_status.toLowerCase()} booking with you.
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
