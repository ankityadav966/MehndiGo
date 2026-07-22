import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  TextInput,
  Modal,
  NativeModules
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getWalletDetails, getWalletTransactions } from "../../services/customer";
import { createPaymentSession } from "../../services/payment";
import { CFPaymentGatewayService } from "react-native-cashfree-pg-sdk";
import { CFSession, CFEnvironment, CFDropCheckoutPayment, CFPaymentComponentBuilder, CFPaymentModes, CFThemeBuilder } from "cashfree-pg-api-contract";
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
  const [paymentSessionId, setPaymentSessionId] = useState("");
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
    const timer = setTimeout(() => {
      loadWalletData();
    }, 0);
    return () => clearTimeout(timer);
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
    try {
      console.log("[COMMON_WALLET_SCREEN] Requesting Cashfree recharge session for amount:", amt);
      const sessionData = await createPaymentSession(1, amt);
      console.log("[COMMON_WALLET_SCREEN] Cashfree recharge session response data:", JSON.stringify(sessionData, null, 2));

      if (!sessionData || !sessionData.payment_session_id) {
        console.error("[COMMON_WALLET_SCREEN] Error: payment_session_id is null, undefined, or empty");
        Alert.alert("Checkout Error", "Failed to retrieve a valid payment session ID.");
        return;
      }

      setOrderId(sessionData.order_id);
      setPaymentSessionId(sessionData.payment_session_id);
      setShowAddModal(false);

      if (sessionData.payment_session_id && sessionData.payment_session_id.startsWith("session_mock")) {
        setAddingMoney(false);
        setCheckoutModalVisible(true);
        return;
      }

      const onVerify = async (orderIdVal) => {
        console.log("Cashfree Wallet Recharge Success Callback:", orderIdVal);
        try {
          await apiRequest("POST", "/wallet/add-money", {
            cashfree_order_id: orderIdVal,
            payment_session_id: sessionData.payment_session_id
          }, true);
          
          Alert.alert("Success", `₹${amt} has been successfully added to your wallet!`);
          setCustomAmount("");
          loadWalletData();
        } catch (verifyErr) {
          console.log("Verification error in wallet recharge:", verifyErr);
          Alert.alert("Verification Failed", "Failed to confirm payment signature.");
        }
      };

      const onError = (error, orderIdVal) => {
        console.log("Cashfree Recharge Error Callback:", error, orderIdVal);
        if (error && error.message && error.message.includes("Cancelled")) {
          Alert.alert("Recharge Cancelled", "You cancelled the top-up transaction.");
        } else {
          Alert.alert("Recharge Failed", error.message || "Top-up session failed.");
        }
      };

      CFPaymentGatewayService.setCallback({ onVerify, onError });

      const session = new CFSession(
        sessionData.payment_session_id,
        sessionData.order_id,
        CFEnvironment.SANDBOX
      );

      const paymentModes = new CFPaymentComponentBuilder()
        .add(CFPaymentModes.CARD)
        .add(CFPaymentModes.UPI)
        .add(CFPaymentModes.WALLET)
        .add(CFPaymentModes.NET_BANKING)
        .build();

      const theme = new CFThemeBuilder()
        .setNavigationBarBackgroundColor('#ff7e5f')
        .setNavigationBarTextColor('#FFFFFF')
        .setButtonBackgroundColor('#ff7e5f')
        .setButtonTextColor('#FFFFFF')
        .build();

      const dropPayment = new CFDropCheckoutPayment(session, paymentModes, theme);

      CFPaymentGatewayService.doPayment(dropPayment);
    } catch (err) {
      console.log("Cashfree SDK Initiation Error (Fallback to Simulation):", err);
      try {
        CFPaymentGatewayService.removeCallback();
      } catch (e) {}
      setCheckoutModalVisible(true);
    } finally {
      setAddingMoney(false);
    }
  };

  const handleRechargeSuccess = async () => {
    setCheckoutModalVisible(false);
    setLoading(true);
    try {
      const rechargeDetails = {
        cashfree_order_id: orderId,
        payment_session_id: paymentSessionId
      };
      await apiRequest("POST", "/wallet/add-money", rechargeDetails, true);
      Alert.alert("Success", `₹${customAmount} credited to your wallet balance successfully!`);
      setCustomAmount("");
      loadWalletData();
    } catch (err) {
      Alert.alert("Recharge Failed", err.message || "Failed to add money to wallet.");
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on selected status tab
  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === "ALL") return true;
    const status = String(tx.status).toUpperCase();
    if (activeTab === "APPROVED") return status === "SUCCESS" || status === "APPROVED" || status === "COMPLETED";
    if (activeTab === "PENDING") return status === "PENDING";
    if (activeTab === "FAILED") return status === "FAILED" || status === "CANCELLED" || status === "REJECTED";
    return true;
  });

  const getStatusStyle = (status) => {
    const s = String(status).toUpperCase();
    if (s === "SUCCESS" || s === "APPROVED" || s === "COMPLETED") {
      return { container: styles.badgeSuccess, text: styles.textSuccess, label: "Approved" };
    }
    if (s === "PENDING") {
      return { container: styles.badgePending, text: styles.textPending, label: "Pending" };
    }
    return { container: styles.badgeFailed, text: styles.textFailed, label: "Failed" };
  };

  const renderTransaction = ({ item }) => {
    const statusInfo = getStatusStyle(item.status);
    const isCredit = [
      "RECHARGE",
      "REFUND",
      "CASHBACK",
      "REFERRAL",
      "MANUAL_CREDIT"
    ].includes(String(item.transaction_type).toUpperCase());

    const sign = isCredit ? "+" : "-";
    const amountColor = isCredit ? Colors.success : Colors.error;

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View style={[styles.iconBox, { backgroundColor: isCredit ? Colors.success + "20" : Colors.error + "20" }]}>
            <Ionicons
              name={isCredit ? "arrow-down" : "arrow-up"}
              size={16}
              color={isCredit ? Colors.success : Colors.error}
            />
          </View>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.transactionTitle} numberOfLines={1}>
              {item.description || item.transaction_type}
            </Text>
            <Text style={styles.transactionDate}>
              {item.createdAt ? moment(item.createdAt).format("DD MMM YYYY • hh:mm A") : "TBD"}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <View style={[styles.statusBadge, statusInfo.container, { marginBottom: 6 }]}>
            <Text style={[styles.statusText, statusInfo.text]}>{statusInfo.label}</Text>
          </View>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {sign} ₹{item.amount}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>₹{balance}</Text>
              <TouchableOpacity style={styles.addMoneyBtn} onPress={() => setShowAddModal(true)}>
                <Text style={styles.addMoneyText}>Add Money</Text>
              </TouchableOpacity>
            </View>

            {/* Transactions Segmented Tabs */}
            <View style={styles.transactionsHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>Transactions History</Text>
            </View>
            <View style={styles.tabsContainer}>
              {["ALL", "APPROVED", "PENDING", "FAILED"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                >
                  <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
                    {tab === "ALL" ? "All" : tab === "APPROVED" ? "Approved" : tab === "PENDING" ? "Pending" : "Failed"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} transactions found</Text>
          </View>
        }
      />

      {/* Add Money Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recharge Wallet</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Enter amount to add (₹)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={customAmount}
              placeholder="e.g. 500"
              onChangeText={setCustomAmount}
              autoFocus
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={() => handleAddMoney(customAmount)}
              disabled={addingMoney}
            >
              {addingMoney ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.modalSubmitText}>Recharge Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recharge Checkout Gateway Simulator Modal */}
      <Modal visible={checkoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { textAlign: "center", marginBottom: 15 }]}>Cashfree Gateway Recharge</Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: Colors.primary || "#ff7e5f", textAlign: "center", marginBottom: 20 }}>₹{customAmount}</Text>
            
            <TouchableOpacity 
              style={[styles.modalSubmitBtn, { backgroundColor: "#2e7d32", marginBottom: 12 }]} 
              onPress={handleRechargeSuccess}
            >
              <Text style={styles.modalSubmitText}>Confirm Success Recharge</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: "#757575" }]}
              onPress={() => setCheckoutModalVisible(false)}
            >
              <Text style={styles.modalSubmitText}>Cancel transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  balanceCard: { backgroundColor: Colors.primary, borderRadius: 20, padding: 22, marginBottom: 25, elevation: 3, marginTop: 12 },
  balanceLabel: { color: Colors.white, opacity: 0.85, fontSize: 12, fontWeight: "600" },
  balanceAmount: { color: Colors.white, fontSize: 34, fontWeight: "800", marginTop: 8 },
  addMoneyBtn: { marginTop: 18, backgroundColor: Colors.white, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  addMoneyText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 12, marginTop: 4 },
  sectionTitleNoMargin: { fontSize: 14, fontWeight: "700", color: Colors.text },
  amountRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  amountChip: { width: "23%", height: 44, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  activeChip: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  amountChipText: { fontWeight: "700", color: Colors.textSecondary, fontSize: 13 },
  activeChipText: { color: Colors.white },
  transactionsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  tabsContainer: { flexDirection: "row", backgroundColor: Colors.white, borderRadius: 10, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  tabButton: { flex: 1, paddingVertical: 8, height: 36, justifyContent: "center", alignItems: "center", borderRadius: 8 },
  activeTabButton: { backgroundColor: Colors.primary },
  tabButtonText: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary },
  activeTabButtonText: { color: Colors.white },
  transactionCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  transactionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  transactionRight: { alignItems: "flex-end", justifyContent: "center" },
  iconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  transactionTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  transactionDate: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  amountText: { fontSize: 14, fontWeight: "800" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: "800" },
  badgeSuccess: { backgroundColor: Colors.success + "15" },
  textSuccess: { color: Colors.success },
  badgePending: { backgroundColor: Colors.warning + "15" },
  textPending: { color: Colors.warning },
  badgeFailed: { backgroundColor: Colors.error + "15" },
  textFailed: { color: Colors.error },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: Colors.textTertiary, fontSize: 12, marginTop: 10, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: Colors.white, width: "100%", borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  modalLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  modalInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, height: 48, paddingHorizontal: 12, fontSize: 16, color: Colors.text, marginBottom: 20 },
  modalSubmitBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  modalSubmitText: { color: Colors.white, fontWeight: "700", fontSize: 14 }
});
