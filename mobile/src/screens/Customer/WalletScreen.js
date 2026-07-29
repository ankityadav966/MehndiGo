import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  TextInput,
  Modal
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getWalletDetails, getWalletTransactions } from "../../services/customer";
import { createPaymentSession } from "../../services/payment";
import RazorpayCheckout from "react-native-razorpay";
import apiRequest from "../../services/api";
import moment from "moment";

export default function WalletScreen({ navigation }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [customAmount, setCustomAmount] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingMoney, setAddingMoney] = useState(false);

  const [orderId, setOrderId] = useState("");
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);

  // Segmented control tabs: ALL, APPROVED, PENDING, FAILED
  const [activeTab, setActiveTab] = useState("ALL");

  const loadWalletData = useCallback(async () => {
    try {
      const [walletData, txList] = await Promise.all([
        getWalletDetails(),
        getWalletTransactions()
      ]);
      setBalance(walletData?.balance || 0);
      setTransactions(Array.isArray(txList) ? txList : []);
    } catch (err) {
      console.log("Failed to load wallet data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };

  const handleAddMoney = async (amountToRecharge) => {
    const amt = Number(amountToRecharge);
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert("Validation Error", "Please enter a valid recharge amount");
      return;
    }

    setAddingMoney(true);
    let sessionData = null;
    try {
      console.log("[CUSTOMER_WALLET_SCREEN] Creating Razorpay recharge order for amount:", amt);
      sessionData = await createPaymentSession(1, amt);
      console.log("[CUSTOMER_WALLET_SCREEN] Razorpay order response data:", JSON.stringify(sessionData, null, 2));

      if (!sessionData || !sessionData.order_id || !sessionData.key_id) {
        setAddingMoney(false);
        Alert.alert("Checkout Error", "Failed to retrieve a valid Razorpay order ID.");
        return;
      }

      setOrderId(sessionData.order_id);
      setShowAddModal(false);

      const options = {
        description: `MehndiGo Wallet Top-Up ₹${amt}`,
        image: "https://mehandigo-api.globalrns.com/logo.png",
        currency: sessionData.currency || "INR",
        key: sessionData.key_id,
        amount: sessionData.amount, // in paise
        name: "MehndiGo Wallet",
        order_id: sessionData.order_id,
        theme: { color: Colors.primary }
      };

      RazorpayCheckout.open(options)
        .then(async (data) => {
          console.log("[WALLET RAZORPAY SUCCESS]", JSON.stringify(data, null, 2));
          try {
            await apiRequest("POST", "/wallet/add-money", {
              razorpay_order_id: data.razorpay_order_id || sessionData.order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature
            }, true);
            
            Alert.alert("Success 🎉", `₹${amt} has been successfully added to your wallet!`);
            setCustomAmount("");
            loadWalletData();
          } catch (verifyErr) {
            console.error("Verification error in wallet recharge:", verifyErr);
            Alert.alert("Verification Failed", verifyErr.message || "Failed to confirm payment signature.");
          } finally {
            setAddingMoney(false);
          }
        })
        .catch((error) => {
          setAddingMoney(false);
          console.log("[WALLET RAZORPAY ERROR / CANCEL]:", error);
          if (error && (error.code === 0 || (error.description && error.description.includes("cancelled")))) {
            Alert.alert("Recharge Cancelled", "You cancelled the top-up transaction.");
          } else {
            setCheckoutModalVisible(true);
          }
        });
    } catch (err) {
      setAddingMoney(false);
      Alert.alert("Recharge Error", err.message || "Failed to initiate wallet recharge.");
    }
  };

  const handleRechargeSuccess = async () => {
    setCheckoutModalVisible(false);
    setLoading(true);
    try {
      const mockPayId = `pay_sim_${Date.now()}`;
      await apiRequest("POST", "/wallet/add-money", {
        razorpay_order_id: orderId,
        razorpay_payment_id: mockPayId,
        razorpay_signature: "simulated_test_signature"
      }, true);
      Alert.alert("Success 🎉", `₹${customAmount || 500} credited to your wallet balance successfully!`);
      setCustomAmount("");
      loadWalletData();
    } catch (err) {
      Alert.alert("Recharge Failed", err.message || "Failed to add money to wallet.");
    } finally {
      setLoading(false);
    }
  };

  const handleRechargeFailure = () => {
    setCheckoutModalVisible(false);
    Alert.alert("Recharge Cancelled", "Wallet top-up was cancelled.");
  };

  const quickAmounts = [100, 250, 500, 1000];

  const filteredTransactions = transactions.filter((tx) => {
    const status = String(tx.status || "").toUpperCase();
    if (activeTab === "ALL") return true;
    if (activeTab === "APPROVED") return status === "SUCCESS" || status === "APPROVED" || status === "COMPLETED";
    if (activeTab === "PENDING") return status === "PENDING";
    if (activeTab === "FAILED") return status === "FAILED" || status === "CANCELLED" || status === "REJECTED";
    return true;
  });

  const getStatusBadgeStyle = (statusStr) => {
    const st = String(statusStr || "").toUpperCase();
    if (st === "SUCCESS" || st === "APPROVED" || st === "COMPLETED") {
      return { bg: "#DEF7EC", text: "#03543F" };
    }
    if (st === "PENDING") {
      return { bg: "#FEF08A", text: "#713F12" };
    }
    return { bg: "#FDE8E8", text: "#9B1C1C" };
  };

  const renderTxItem = ({ item }) => {
    const isCredit = item.transaction_type === "RECHARGE" || item.transaction_type === "CASHBACK" || item.transaction_type === "REFERRAL" || item.transaction_type === "MANUAL_CREDIT" || item.transaction_type === "SETTLEMENT";
    const badgeStyle = getStatusBadgeStyle(item.status);

    return (
      <TouchableOpacity 
        style={styles.txCard}
        activeOpacity={0.7}
        onPress={() => {
          Alert.alert(
            "Transaction Details",
            `Type: ${item.transaction_type}\nAmount: ₹${item.amount}\nStatus: ${item.status}\nDescription: ${item.description || 'N/A'}\nDate: ${moment(item.createdAt).format("DD MMM YYYY, hh:mm A")}`
          );
        }}
      >
        <View style={[styles.txIconWrapper, { backgroundColor: isCredit ? "#E6F4EA" : "#FCE8E6" }]}>
          <Ionicons
            name={isCredit ? "arrow-down-circle" : "arrow-up-circle"}
            size={24}
            color={isCredit ? Colors.success : Colors.error}
          />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txTitle}>{item.description || item.transaction_type}</Text>
          <Text style={styles.txDate}>
            {moment(item.createdAt).format("DD MMM YYYY, hh:mm A")}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.txAmount, { color: isCredit ? Colors.success : Colors.error }]}>
            {isCredit ? "+" : "-"}₹{item.amount}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badgeStyle.text }]}>{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MehndiGo Wallet</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => Alert.alert("Wallet Info", "Use your MehndiGo Wallet balance for fast 1-click checkout on bookings!")}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTxItem}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
        ListHeaderComponent={
          <>
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View style={styles.walletIconBadge}>
                  <Ionicons name="wallet" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
              </View>

              <Text style={styles.balanceValue}>₹{balance.toLocaleString("en-IN")}</Text>

              <TouchableOpacity
                style={styles.addMoneyBtn}
                activeOpacity={0.8}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="add-circle" size={20} color={Colors.white} />
                <Text style={styles.addMoneyText}>Add Money to Wallet</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.txHeaderRow}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <Text style={styles.txCount}>{filteredTransactions.length} Items</Text>
            </View>

            <View style={styles.tabContainer}>
              {["ALL", "APPROVED", "PENDING", "FAILED"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabBtnText, activeTab === tab && styles.activeTabBtnText]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No {activeTab.toLowerCase()} transactions found</Text>
            </View>
          )
        }
      />

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Add Money to Wallet</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter Amount (₹)</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="number-pad"
              placeholder="e.g. 500"
              value={customAmount}
              onChangeText={setCustomAmount}
            />

            <View style={styles.quickChipsRow}>
              {quickAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.chipBtn}
                  onPress={() => setCustomAmount(String(amt))}
                >
                  <Text style={styles.chipText}>+₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitAddBtn}
              activeOpacity={0.8}
              disabled={addingMoney}
              onPress={() => handleAddMoney(customAmount)}
            >
              {addingMoney ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitAddText}>Proceed to Secure Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={checkoutModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
              <Text style={styles.modalTitle}>Razorpay Wallet Checkout</Text>
            </View>
            <Text style={styles.orderLabel}>Order Ref: {orderId}</Text>
            <Text style={styles.modalAmount}>₹{customAmount || 500}</Text>

            <TouchableOpacity style={styles.successBtn} onPress={handleRechargeSuccess}>
              <Text style={styles.successBtnText}>Simulate Razorpay Recharge Success</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.failBtn} onPress={handleRechargeFailure}>
              <Text style={styles.failBtnText}>Cancel Top-Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { padding: 4 },
  helpBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 40 },
  balanceCard: { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 20, elevation: 2 },
  balanceHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  walletIconBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF0F2", justifyContent: "center", alignItems: "center", marginRight: 10 },
  balanceLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  balanceValue: { fontSize: 32, fontWeight: "800", color: Colors.text, marginBottom: 16 },
  addMoneyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12 },
  addMoneyText: { color: Colors.white, fontWeight: "700", fontSize: 14, marginLeft: 8 },
  txHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  txCount: { fontSize: 12, color: Colors.textTertiary, fontWeight: "600" },
  tabContainer: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F3F4F6", marginRight: 8 },
  activeTabBtn: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary },
  activeTabBtnText: { color: Colors.white },
  txCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, elevation: 1 },
  txIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 2 },
  txDate: { fontSize: 11, color: Colors.textTertiary },
  txAmount: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 9, fontWeight: "700" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { marginTop: 8, color: Colors.textTertiary, fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.white, width: "88%", borderRadius: 20, padding: 20, alignItems: "stretch" },
  modalTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  inputLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  amountInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  quickChipsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  chipBtn: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 8, borderRadius: 8, alignItems: "center", marginHorizontal: 3 },
  chipText: { fontSize: 11, fontWeight: "700", color: Colors.text },
  submitAddBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  submitAddText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, justifyContent: "center" },
  orderLabel: { fontSize: 10, color: Colors.textTertiary, marginBottom: 4, textAlign: "center" },
  modalAmount: { fontSize: 28, fontWeight: "800", color: Colors.primary, marginBottom: 24, textAlign: "center" },
  successBtn: { width: "100%", height: 46, backgroundColor: Colors.success, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  successBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  failBtn: { width: "100%", height: 46, borderWidth: 1, borderColor: Colors.error, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  failBtnText: { color: Colors.error, fontWeight: "700", fontSize: 13 }
});
