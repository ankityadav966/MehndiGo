import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { adminService } from '../../services/api';
import { DollarSign } from 'lucide-react-native';

export default function AdminLedger() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = async () => {
    try {
      const res = await adminService.getPayments();
      setPayments(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const renderPayment = ({ item }) => (
    <View style={[styles.glassPanel, { marginBottom: 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>TXN: {item.razorpay_payment_id || item.cashfree_payment_id || item.transaction_id || `TXN-${item.id}`}</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>₹{item.amount}</Text>
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Booking: {item.booking?.booking_code}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Method: {item.payment_method}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ backgroundColor: item.status === 'SUCCESS' ? colors.success : item.status === 'FAILED' ? colors.danger : colors.bgTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: item.status === 'SUCCESS' || item.status === 'FAILED' ? '#fff' : colors.textPrimary, fontSize: 10, fontWeight: '700' }}>{item.status}</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {item.paid_at ? new Date(item.paid_at).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPayment}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <DollarSign size={64} color={colors.accent} style={{ marginBottom: 16 }} />
              <Text style={[styles.title, { marginBottom: 8 }]}>No Transactions</Text>
            </View>
          )
        }
      />
    </View>
  );
}
