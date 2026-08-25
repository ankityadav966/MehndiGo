import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import Alert from "../../utils/Alert";
import { getWalletDetails } from "../../services/customer";
import RazorpayCheckoutModal from "../../components/RazorpayCheckoutModal";
import { openRazorpayCheckout } from "../../services/razorpayHelper";

export default function ArtistWalletScreen({ navigation }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingCommission, setPayingCommission] = useState(false);

  // In-App Web Razorpay Checkout state (fallback for Expo Go / simulators)
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState(null);
  const [currentDueAmount, setCurrentDueAmount] = useState(0);

  const fetchWalletData = useCallback(async () => {
    try {
      const data = await getWalletDetails();
      setWallet(data);
    } catch (err) {
      console.error("Failed to load artist wallet:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleCommissionSuccess = async (data) => {
    setRazorpayModalVisible(false);
    setPayingCommission(true);
    try {
      const { apiPost } = require("../../services/api");
      await apiPost("/wallet/pay-commission", {
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_order_id: data.razorpay_order_id,
        razorpay_signature: data.razorpay_signature
      });
      Alert.alert("Success", `Outstanding commission settled successfully!`);
      fetchWalletData();
    } catch (err) {
      Alert.alert("Settlement Error", err.message || "Failed to confirm commission settlement.");
    } finally {
      setPayingCommission(false);
    }
  };

  const handleCommissionFailure = (err) => {
    setRazorpayModalVisible(false);
    setPayingCommission(false);
    const msg = err?.description || err?.message || (typeof err === "string" ? err : "Payment failed.");
    Alert.alert("Payment Failed", msg);
  };

  const handleCommissionDismiss = () => {
    setRazorpayModalVisible(false);
    setPayingCommission(false);
    Alert.alert("Payment Cancelled", "Commission payment was cancelled.");
  };

  const handlePayOutstandingCommission = async () => {
    const dueAmount = Number(wallet?.outstanding_commission || 0);
    if (dueAmount <= 0) return;

    setCurrentDueAmount(dueAmount);
    setPayingCommission(true);
    try {
      const { createPaymentSession } = require("../../services/payment");
      const sessionData = await createPaymentSession(null, dueAmount, "recharge");
      const keyId = sessionData?.key_id || sessionData?.key || sessionData?.keyId;
      const orderIdVal = sessionData?.order_id || sessionData?.orderId;
      const amountPaise = Number(sessionData?.amount);

      const isValidRazorpayKey =
        typeof keyId === "string" &&
        (keyId.startsWith("rzp_test_") || keyId.startsWith("rzp_live_"));

      if (!sessionData || !isValidRazorpayKey || !orderIdVal) {
        setPayingCommission(false);
        Alert.alert("Checkout Error", "Failed to obtain Razorpay payment session for commission payment.");
        return;
      }

      const options = {
        description: "Pay Outstanding Platform Commission",
        image: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=200",
        currency: "INR",
        key: keyId,
        order_id: orderIdVal,
        amount: amountPaise,
        name: "MehndiGo Merchant Services",
        prefill: {
          email: "artist@mehendigo.com",
          contact: "9829011001",
          name: "Artist Specialist"
        },
        theme: { color: Colors.primary || "#9333EA" }
      };

      setRazorpayOptions(options);

      await openRazorpayCheckout(options, {
        onSuccess: (data) => handleCommissionSuccess(data),
        onFailure: (err) => handleCommissionFailure(err),
        onDismiss: () => handleCommissionDismiss(),
        onWebFallback: () => {
          setPayingCommission(false);
          setRazorpayModalVisible(true);
        }
      });
    } catch (err) {
      setPayingCommission(false);
      Alert.alert("Error", err.message || "Failed to initiate commission payment.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const outstanding = Number(wallet?.outstanding_commission || 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Artist Financial Portal</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={wallet?.transactions || []}
        keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
        ListHeaderComponent={
          <>
            {outstanding > 0 && (
              <View style={styles.warningBanner}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning-outline" size={20} color="#D97706" />
                  <Text style={styles.warningTitle}>Outstanding Commission Due</Text>
                </View>
                <Text style={styles.warningMsg}>
                  You have ₹{outstanding} in unpaid platform commission. Please clear dues to maintain top placement.
                </Text>
                <TouchableOpacity
                  style={styles.payDuesBtn}
                  onPress={handlePayOutstandingCommission}
                  disabled={payingCommission}
                >
                  {payingCommission ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.payDuesText}>Pay ₹{outstanding} Dues Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available for Payout</Text>
              <Text style={styles.balanceVal}>₹{wallet?.balance || "0"}</Text>

              <View style={styles.subStatsRow}>
                <View style={styles.subStatCol}>
                  <Text style={styles.subStatLabel}>Pending Settlement</Text>
                  <Text style={styles.subStatVal}>₹{wallet?.pending_settlement || "0"}</Text>
                </View>
                <View style={styles.subStatDivider} />
                <View style={styles.subStatCol}>
                  <Text style={styles.subStatLabel}>Total Earnings</Text>
                  <Text style={styles.subStatVal}>₹{wallet?.total_earnings || "0"}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.withdrawBtn}
                onPress={() => navigation.navigate("Payout")}
              >
                <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                <Text style={styles.withdrawBtnText}>Request Bank Payout</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Performance Analytics</Text>
            <View style={styles.grid}>
              <View style={styles.gridCard}>
                <Text style={styles.gridLabel}>Platform Fees Rate</Text>
                <Text style={styles.gridVal}>10%</Text>
              </View>
              <View style={styles.gridCard}>
                <Text style={styles.gridLabel}>Payout Status</Text>
                <Text style={[styles.gridVal, { color: "#059669" }]}>Active</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Recent Ledger Transactions</Text>
          </>
        }
        renderItem={({ item }) => {
          const rawType = String(item.type || item.transaction_type || "").toUpperCase();
          const isCredit = rawType === "CREDIT" || rawType === "SETTLEMENT" || rawType === "RECHARGE" || rawType === "REFUND";
          return (
            <View style={styles.txCard}>
              <View style={styles.txIconWrapper}>
                <Ionicons
                  name={isCredit ? "arrow-down-circle" : "arrow-up-circle"}
                  size={22}
                  color={isCredit ? "#059669" : Colors.primary}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{item.description || item.transaction_type || (isCredit ? "Credit" : "Debit")}</Text>
                <Text style={styles.txDate}>{new Date(item.createdAt || item.created_at || new Date()).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, { color: isCredit ? "#059669" : Colors.text }]}>
                {isCredit ? "+" : "-"}₹{item.amount}
              </Text>
            </View>
          );
        }}
      />

      {/* Razorpay In-App Web Checkout (Works seamlessly in Expo Go / Development / Standalone builds) */}
      <RazorpayCheckoutModal
        visible={razorpayModalVisible}
        options={razorpayOptions}
        onSuccess={(data) => handleCommissionSuccess(data)}
        onFailure={(err) => handleCommissionFailure(err)}
        onDismiss={() => handleCommissionDismiss()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  listContent: { padding: 16, paddingBottom: 180 },
  warningBanner: { backgroundColor: "#FEF3C7", borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#F59E0B" },
  warningHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  warningTitle: { marginLeft: 8, fontSize: 14, fontWeight: "700", color: "#D97706" },
  warningMsg: { fontSize: 12, color: "#92400E", lineHeight: 18, marginBottom: 10 },
  payDuesBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  payDuesText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 6 },
  balanceCard: { backgroundColor: Colors.white, borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border, elevation: 2 },
  balanceLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  balanceVal: { fontSize: 28, fontWeight: "800", color: Colors.text, marginVertical: 6 },
  subStatsRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12, paddingTop: 12, borderTopWidth: 1, borderColor: Colors.border },
  subStatCol: { flex: 1, alignItems: "center" },
  subStatLabel: { fontSize: 10, color: Colors.textTertiary, marginBottom: 2 },
  subStatVal: { fontSize: 14, fontWeight: "700", color: Colors.text },
  subStatDivider: { width: 1, height: "80%", backgroundColor: Colors.border, alignSelf: "center" },
  withdrawBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 6 },
  withdrawBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 12, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  gridCard: { width: "48%", backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  gridLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },
  gridVal: { fontSize: 18, fontWeight: "800", color: Colors.primary, marginTop: 4 },
  txCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  txIconWrapper: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginRight: 12 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 13, fontWeight: "600", color: Colors.text },
  txDate: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "700" }
});
