import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getWalletDetails, getWalletTransactions } from "../../services/customer";
import { createPaymentSession } from "../../services/payment";
import RazorpayCheckoutModal from "../../components/RazorpayCheckoutModal";
import { openRazorpayCheckout } from "../../services/razorpayHelper";
import apiRequest from "../../services/api";
import { formatDateTime, formatRelativeTime } from "../../utils/date";

export default function WalletScreen({ navigation }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const [customAmount, setCustomAmount] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingMoney, setAddingMoney] = useState(false);

  const [orderId, setOrderId] = useState("");
  const [activeSession, setActiveSession] = useState(null);

  // In-App Web Razorpay Checkout state (fallback for Expo Go / simulators)
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState(null);

  // Selected Transaction for details modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Active filter tab: 'ALL' | 'CREDIT' | 'DEBIT'
  const [activeTab, setActiveTab] = useState("ALL");

  const isProcessingPaymentRef = useRef(false);

  const loadWalletData = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        getWalletDetails().catch(() => ({ balance: 0 })),
        getWalletTransactions().catch(() => [])
      ]);
      setBalance(Number(walletRes?.balance || 0));
      setTransactions(Array.isArray(txRes) ? txRes : []);
    } catch (err) {
      console.error("Wallet loading error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };

  const handleWalletRechargeSuccess = async (data, sessionDataToUse) => {
    setRazorpayModalVisible(false);
    setLoading(true);

    const sessionObj = sessionDataToUse || activeSession;
    const rechargeAmount = Number(customAmount || 500);

    try {
      console.log("[WALLET_SCREEN] Sending /wallet/add-money verification:", data);
      await apiRequest("POST", "/wallet/add-money", {
        razorpay_order_id: data.razorpay_order_id || sessionObj?.order_id || orderId,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
        amount: rechargeAmount
      }, true);

      Alert.alert("Success 🎉", `₹${rechargeAmount} has been successfully added to your MehndiGo Wallet!`);
      setCustomAmount("");
      loadWalletData();
    } catch (verifyErr) {
      console.error("Verification error in wallet recharge:", verifyErr);
      Alert.alert("Verification Failed", verifyErr.message || "Failed to confirm payment signature.");
    } finally {
      isProcessingPaymentRef.current = false;
      setAddingMoney(false);
      setLoading(false);
    }
  };

  const handleWalletRechargeFailure = (err) => {
    setRazorpayModalVisible(false);
    isProcessingPaymentRef.current = false;
    setAddingMoney(false);
    const msg = err?.description || err?.message || (typeof err === "string" ? err : "Wallet recharge failed.");
    Alert.alert("Recharge Failed", msg);
  };

  const handleWalletRechargeDismiss = () => {
    setRazorpayModalVisible(false);
    isProcessingPaymentRef.current = false;
    setAddingMoney(false);
    Alert.alert("Recharge Cancelled", "You cancelled the top-up transaction.");
  };

  const handleInitiateAddMoney = async (amountToAdd) => {
    const amt = Number(amountToAdd || customAmount);
    if (!amt || isNaN(amt) || amt < 10) {
      Alert.alert("Invalid Amount", "Please enter an amount of at least ₹10 to recharge.");
      return;
    }

    if (isProcessingPaymentRef.current) return;
    isProcessingPaymentRef.current = true;
    setAddingMoney(true);

    let sessionData = null;
    try {
      console.log("[WALLET_SCREEN] Creating recharge payment session for ₹", amt);
      sessionData = await createPaymentSession(null, amt, "recharge");

      if (!sessionData || !sessionData.order_id || (!sessionData.key_id && !sessionData.key)) {
        isProcessingPaymentRef.current = false;
        setAddingMoney(false);
        Alert.alert("Checkout Error", "Failed to generate payment session. Please try again.");
        return;
      }

      setOrderId(sessionData.order_id);
      setActiveSession(sessionData);
      setShowAddModal(false);

      const options = {
        description: `MehndiGo Wallet Top-Up ₹${amt}`,
        image: "https://api.mehndigo.in/logo.png",
        currency: sessionData.currency || "INR",
        key: sessionData.key_id || sessionData.key,
        amount: sessionData.amount, // in paise
        name: "MehndiGo Wallet",
        order_id: sessionData.order_id,
        prefill: {
          name: "MehndiGo Customer",
          email: "customer@mehndigo.com",
          contact: "9829011001"
        },
        theme: { color: Colors.primary || "#9333EA" }
      };

      setRazorpayOptions(options);

      await openRazorpayCheckout(options, {
        onSuccess: (data) => handleWalletRechargeSuccess(data, sessionData),
        onFailure: (err) => handleWalletRechargeFailure(err),
        onDismiss: () => handleWalletRechargeDismiss(),
        onWebFallback: () => {
          setAddingMoney(false);
          setRazorpayModalVisible(true);
        }
      });
    } catch (err) {
      isProcessingPaymentRef.current = false;
      setAddingMoney(false);
      Alert.alert("Recharge Error", err.message || "Failed to initiate wallet recharge.");
    }
  };

  const quickAmounts = [100, 250, 500, 1000, 2000];

  // Total Lifetime Calculations
  const totalRecharge = transactions
    .filter(t => (t.type === "CREDIT" || t.type === "credit" || t.type === "recharge" || t.type === "cashback") && t.status !== "failed")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalSpent = transactions
    .filter(t => (t.type === "DEBIT" || t.type === "debit" || t.type === "payment") && t.status !== "failed")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter(t => {
    if (activeTab === "ALL") return true;
    const isCredit = t.type === "CREDIT" || t.type === "credit" || t.type === "recharge" || t.type === "cashback" || t.type === "refund";
    if (activeTab === "CREDIT") return isCredit;
    if (activeTab === "DEBIT") return !isCredit;
    return true;
  });

  const renderTransactionItem = ({ item }) => {
    const isCredit = item.type === "CREDIT" || item.type === "credit" || item.type === "recharge" || item.type === "cashback" || item.type === "refund";
    const amountVal = Number(item.amount || 0);

    let iconName = isCredit ? "arrow-down-circle" : "arrow-up-circle";
    let iconColor = isCredit ? Colors.success : Colors.error;
    let iconBg = isCredit ? "#E8F8EE" : "#FEECEE";

    if (item.type === "cashback") {
      iconName = "gift-outline";
      iconColor = Colors.warning || "#E69B00";
      iconBg = "#FEF8E7";
    }

    return (
      <TouchableOpacity
        style={styles.txCard}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedTx(item);
        }}
      >
        <View style={[styles.txIconWrapper, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {item.description || item.title || (isCredit ? "Wallet Top-up" : "Booking Payment")}
          </Text>
          <Text style={styles.txDate}>
            {formatDateTime(item.created_at || item.createdAt || item.date || item.timestamp)}
          </Text>
        </View>

        <View style={styles.txRightCol}>
          <Text style={[styles.txAmount, { color: isCredit ? Colors.success : Colors.text }]}>
            {isCredit ? "+" : "-"}₹{amountVal.toLocaleString("en-IN")}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === "completed" || item.status === "COMPLETED" || !item.status ? "#EBF7EE" : "#FDE8E8" }]}>
            <Text style={[styles.statusBadgeText, { color: item.status === "completed" || item.status === "COMPLETED" || !item.status ? Colors.success : Colors.error }]}>
              {item.status ? item.status.toUpperCase() : "SUCCESS"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation?.goBack ? navigation.goBack() : null}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setShowInfoModal(true)}
        >
          <Ionicons name="information-circle-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item, index) => item.id ? String(item.id) : `tx-${index}`}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.walletIconCircle}>
                    <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                </View>
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowBalance(!showBalance)}
                >
                  <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={18} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              </View>

              <Text style={styles.balanceValue}>
                {showBalance ? `₹${balance.toLocaleString("en-IN")}` : "••••••"}
              </Text>

              {/* Quick Lifetime Sub-Stats */}
              <View style={styles.cardSubStatsRow}>
                <View style={styles.subStatItem}>
                  <Text style={styles.subStatLabel}>Total Recharged</Text>
                  <Text style={styles.subStatValue}>+₹{totalRecharge.toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.subStatDivider} />
                <View style={styles.subStatItem}>
                  <Text style={styles.subStatLabel}>Total Spent</Text>
                  <Text style={styles.subStatValue}>-₹{totalSpent.toLocaleString("en-IN")}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActionRow}>
                <TouchableOpacity
                  style={styles.addMoneyMainBtn}
                  activeOpacity={0.85}
                  onPress={() => setShowAddModal(true)}
                >
                  <Ionicons name="add-circle" size={20} color={Colors.primary} />
                  <Text style={styles.addMoneyMainText}>+ Add Money</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickHelpBtn}
                  activeOpacity={0.85}
                  onPress={() => setShowInfoModal(true)}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.quickHelpText}>Benefits</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Transactions Header */}
            <View style={styles.txHeaderRow}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <Text style={styles.txCount}>{filteredTransactions.length} records</Text>
            </View>

            {/* Segmented Filter Tabs */}
            <View style={styles.tabContainer}>
              {["ALL", "CREDIT", "DEBIT"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabBtnText, activeTab === tab && styles.activeTabBtnText]}>
                    {tab === "ALL" ? "All" : tab === "CREDIT" ? "Money Added" : "Spent"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={32} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptyText}>
              Your wallet recharge and booking payment history will appear here.
            </Text>
          </View>
        }
      />

      {/* 1. Add Money Bottom Sheet Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Recharge MehndiGo Wallet</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter Recharge Amount (₹)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="500"
                placeholderTextColor="#A0AEC0"
                keyboardType="numeric"
                value={customAmount}
                onChangeText={setCustomAmount}
                autoFocus
              />
            </View>

            <View style={styles.modalChipsRow}>
              {quickAmounts.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.modalChip, customAmount === String(val) && styles.activeModalChip]}
                  onPress={() => setCustomAmount(String(val))}
                >
                  <Text style={[styles.modalChipText, customAmount === String(val) && styles.activeModalChipText]}>
                    ₹{val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.securityNoteRow}>
              <Ionicons name="lock-closed" size={14} color="#10B981" />
              <Text style={styles.securityNoteText}>100% Safe 256-bit SSL Payment via Razorpay</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitAddBtn, addingMoney && { opacity: 0.7 }]}
              disabled={addingMoney}
              onPress={() => handleInitiateAddMoney()}
            >
              {addingMoney ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitAddText}>
                  Proceed to Pay ₹{customAmount || 500}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Transaction Details Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContentCard}>
            {selectedTx && (
              <>
                <View style={styles.txDetailHeader}>
                  <View style={[styles.txDetailIconCircle, { backgroundColor: selectedTx.type === "CREDIT" || selectedTx.type === "credit" ? "#E8F8EE" : "#FEECEE" }]}>
                    <Ionicons
                      name={selectedTx.type === "CREDIT" || selectedTx.type === "credit" ? "arrow-down-circle" : "arrow-up-circle"}
                      size={32}
                      color={selectedTx.type === "CREDIT" || selectedTx.type === "credit" ? Colors.success : Colors.error}
                    />
                  </View>
                  <Text style={styles.txDetailAmount}>
                    {selectedTx.type === "CREDIT" || selectedTx.type === "credit" ? "+" : "-"}₹{Number(selectedTx.amount || 0).toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.txDetailTitle}>{selectedTx.description || selectedTx.title || "Wallet Transaction"}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Transaction ID</Text>
                  <Text style={styles.detailVal}>#{selectedTx.id || selectedTx.reference_id || "N/A"}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Date & Time</Text>
                  <Text style={styles.detailVal}>
                    {formatDateTime(selectedTx.created_at || selectedTx.createdAt || selectedTx.date || selectedTx.timestamp)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Payment Method</Text>
                  <Text style={styles.detailVal}>{selectedTx.payment_method || "Razorpay / Internal Wallet"}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Status</Text>
                  <Text style={[styles.detailVal, { color: Colors.success, fontWeight: "700" }]}>
                    {(selectedTx.status || "COMPLETED").toUpperCase()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeDetailBtn}
                  onPress={() => setSelectedTx(null)}
                >
                  <Text style={styles.closeDetailText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 3. Wallet Info / Perks Modal */}
      <Modal visible={showInfoModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContentCard}>
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <View style={styles.infoBadgeCircle}>
                <Ionicons name="wallet" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.infoTitle}>MehndiGo Wallet Benefits</Text>
            </View>

            <View style={styles.perkItem}>
              <Ionicons name="flash-outline" size={20} color={Colors.primary} style={styles.perkIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.perkHeader}>1-Click Instant Payment</Text>
                <Text style={styles.perkDesc}>No waiting for OTPs or payment gateway delays while booking your favorite artist.</Text>
              </View>
            </View>

            <View style={styles.perkItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.success} style={styles.perkIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.perkHeader}>100% Escrow Protection</Text>
                <Text style={styles.perkDesc}>Your booking amount is safely held until service completion.</Text>
              </View>
            </View>

            <View style={styles.perkItem}>
              <Ionicons name="gift-outline" size={20} color={Colors.warning} style={styles.perkIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.perkHeader}>Exclusive Cashbacks & Rewards</Text>
                <Text style={styles.perkDesc}>Get instant cashbacks credited directly into your MehndiGo wallet on every offer.</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setShowInfoModal(false)}>
              <Text style={styles.closeDetailText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. Razorpay In-App Web Checkout (Works seamlessly in Expo Go / Development / Standalone builds) */}
      <RazorpayCheckoutModal
        visible={razorpayModalVisible}
        options={razorpayOptions}
        onSuccess={(data) => handleWalletRechargeSuccess(data)}
        onFailure={(err) => handleWalletRechargeFailure(err)}
        onDismiss={() => handleWalletRechargeDismiss()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAF9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6"
  },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 110 },
  
  // Balance Card Styling
  balanceCard: {
    margin: 16,
    borderRadius: 22,
    padding: 20,
    backgroundColor: "#9C1344", // Deep rich burgundy/rose theme
    elevation: 6,
    shadowColor: "#9C1344",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center" },
  walletIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 10 },
  balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  eyeBtn: { padding: 4 },
  balanceValue: { fontSize: 34, fontWeight: "800", color: "#FFFFFF", marginBottom: 18, letterSpacing: 0.5 },
  
  cardSubStatsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 18 },
  subStatItem: { flex: 1, alignItems: "center" },
  subStatLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "600", marginBottom: 2 },
  subStatValue: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  subStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", height: "100%" },
  
  cardActionRow: { flexDirection: "row", gap: 10 },
  addMoneyMainBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 2
  },
  addMoneyMainText: { color: Colors.primary, fontWeight: "800", fontSize: 14, marginLeft: 6 },
  quickHelpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)"
  },
  quickHelpText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 6 },

  // Quick Topup Chips Bar
  quickTopupSection: { paddingHorizontal: 16, marginBottom: 14 },
  quickSectionTitle: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  chipsScroll: { gap: 8 },
  quickChip: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, elevation: 1 },
  quickChipText: { fontSize: 13, fontWeight: "700", color: Colors.text },

  // Transactions Header
  txHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  txCount: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },

  // Segmented Tabs
  tabContainer: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12, gap: 6 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#EFEFEF" },
  activeTabBtn: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  activeTabBtnText: { color: Colors.white, fontWeight: "700" },

  // Transaction Cards
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F3F6",
    elevation: 1
  },
  txIconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: 12 },
  txInfo: { flex: 1, marginRight: 8 },
  txTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 3 },
  txDate: { fontSize: 11, color: Colors.textTertiary },
  txRightCol: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontWeight: "800", marginBottom: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },

  // Empty State
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 50, paddingHorizontal: 20 },
  emptyIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  emptyText: { color: Colors.textTertiary, fontSize: 13, textAlign: "center" },

  // Modals Base
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 14 },
  modalTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  closeBtn: { padding: 4 },
  
  inputLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600", marginBottom: 8 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, paddingHorizontal: 16, height: 54, marginBottom: 14, backgroundColor: "#FFF8FA" },
  currencyPrefix: { fontSize: 22, fontWeight: "800", color: Colors.primary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: "800", color: Colors.text },
  
  modalChipsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modalChip: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  activeModalChip: { backgroundColor: "#FFF0F4", borderWidth: 1, borderColor: Colors.primary },
  modalChipText: { fontSize: 12, fontWeight: "700", color: Colors.text },
  activeModalChipText: { color: Colors.primary },
  
  securityNoteRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 18, gap: 6 },
  securityNoteText: { fontSize: 11, color: Colors.textSecondary },
  
  submitAddBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", elevation: 2 },
  submitAddText: { color: Colors.white, fontWeight: "800", fontSize: 15 },

  // Card Modal
  modalContentCard: { backgroundColor: Colors.white, width: "90%", alignSelf: "center", borderRadius: 22, padding: 22, marginBottom: "auto", marginTop: "auto", elevation: 8 },
  txDetailHeader: { alignItems: "center", marginBottom: 14 },
  txDetailIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  txDetailAmount: { fontSize: 28, fontWeight: "800", color: Colors.text, marginBottom: 4 },
  txDetailTitle: { fontSize: 14, color: Colors.textSecondary, fontWeight: "600", textAlign: "center" },
  divider: { height: 1, backgroundColor: "#EEF2F6", marginVertical: 14 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  detailKey: { fontSize: 13, color: Colors.textSecondary },
  detailVal: { fontSize: 13, color: Colors.text, fontWeight: "600" },
  closeDetailBtn: { backgroundColor: Colors.primary, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 14 },
  closeDetailText: { color: Colors.white, fontWeight: "700", fontSize: 14 },

  // Info Modal Perks
  infoBadgeCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  infoTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  perkItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  perkIcon: { marginRight: 12, marginTop: 2 },
  perkHeader: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  perkDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 }
});
