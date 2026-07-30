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
  Modal,
  ScrollView
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
  const [showBalance, setShowBalance] = useState(true);

  const [customAmount, setCustomAmount] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingMoney, setAddingMoney] = useState(false);

  const [orderId, setOrderId] = useState("");
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);

  // Selected Transaction for details modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Segmented control tabs: ALL, CREDITS, DEBITS, PENDING
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
      Alert.alert("Validation Error", "Please enter a valid amount (e.g. ₹100 or more).");
      return;
    }
    if (amt < 10) {
      Alert.alert("Validation Error", "Minimum top-up amount is ₹10.");
      return;
    }

    setAddingMoney(true);
    let sessionData = null;
    try {
      console.log("[CUSTOMER_WALLET_SCREEN] Creating Razorpay recharge order for amount:", amt);
      sessionData = await createPaymentSession(1, amt);

      if (!sessionData || !sessionData.order_id || !sessionData.key_id) {
        setAddingMoney(false);
        Alert.alert("Checkout Error", "Failed to generate payment session. Please try again.");
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
            
            Alert.alert("Success 🎉", `₹${amt} has been successfully added to your MehndiGo Wallet!`);
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
            // Fallback simulator for development environment / emulator without native Razorpay SDK
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

  const quickAmounts = [100, 250, 500, 1000, 2000];

  // Total Lifetime Calculations
  const totalRecharge = transactions
    .filter(t => (t.transaction_type === "RECHARGE" || t.transaction_type === "CASHBACK" || t.transaction_type === "REFERRAL") && String(t.status).toUpperCase() === "SUCCESS")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalSpent = transactions
    .filter(t => t.transaction_type === "BOOKING_PAYMENT" && String(t.status).toUpperCase() === "SUCCESS")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter((tx) => {
    const status = String(tx.status || "").toUpperCase();
    const isCredit = ["RECHARGE", "CASHBACK", "REFERRAL", "MANUAL_CREDIT", "SETTLEMENT", "REFUND"].includes(tx.transaction_type);

    if (activeTab === "ALL") return true;
    if (activeTab === "CREDITS") return isCredit;
    if (activeTab === "DEBITS") return !isCredit;
    if (activeTab === "PENDING") return status === "PENDING";
    return true;
  });

  const getStatusBadgeStyle = (statusStr) => {
    const st = String(statusStr || "").toUpperCase();
    if (st === "SUCCESS" || st === "APPROVED" || st === "COMPLETED") {
      return { bg: "#DCFCE7", text: "#15803D", label: "Completed" };
    }
    if (st === "PENDING") {
      return { bg: "#FEF3C7", text: "#B45309", label: "Pending" };
    }
    return { bg: "#FEE2E2", text: "#B91C1C", label: "Failed" };
  };

  const renderTxItem = ({ item }) => {
    const isCredit = ["RECHARGE", "CASHBACK", "REFERRAL", "MANUAL_CREDIT", "SETTLEMENT", "REFUND"].includes(item.transaction_type);
    const badgeStyle = getStatusBadgeStyle(item.status);

    return (
      <TouchableOpacity 
        style={styles.txCard}
        activeOpacity={0.7}
        onPress={() => setSelectedTx(item)}
      >
        <View style={[styles.txIconWrapper, { backgroundColor: isCredit ? "#ECFDF5" : "#FEF2F2" }]}>
          <Ionicons
            name={isCredit ? "arrow-down-circle" : "arrow-up-circle"}
            size={24}
            color={isCredit ? Colors.success : Colors.error}
          />
        </View>

        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {item.description || item.transaction_type?.replace(/_/g, " ")}
          </Text>
          <Text style={styles.txDate}>
            {moment(item.createdAt).format("DD MMM YYYY, hh:mm A")}
          </Text>
        </View>

        <View style={styles.txRightCol}>
          <Text style={[styles.txAmount, { color: isCredit ? Colors.success : Colors.error }]}>
            {isCredit ? "+" : "-"}₹{Number(item.amount).toLocaleString("en-IN")}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badgeStyle.text }]}>{badgeStyle.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MehndiGo Wallet</Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowInfoModal(true)}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Scrollable Content */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTxItem}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
        ListHeaderComponent={
          <>
            {/* Elegant Royal Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.walletIconCircle}>
                    <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                </View>
                <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={styles.eyeBtn}>
                  <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={20} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              </View>

              <Text style={styles.balanceValue}>
                {showBalance ? `₹${Number(balance).toLocaleString("en-IN")}` : "••••••••"}
              </Text>

              {/* Sub-stats Row */}
              <View style={styles.cardSubStatsRow}>
                <View style={styles.subStatItem}>
                  <Text style={styles.subStatLabel}>Total Recharged</Text>
                  <Text style={styles.subStatValue}>₹{totalRecharge.toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.subStatDivider} />
                <View style={styles.subStatItem}>
                  <Text style={styles.subStatLabel}>Total Spent</Text>
                  <Text style={styles.subStatValue}>₹{totalSpent.toLocaleString("en-IN")}</Text>
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
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.quickHelpText}>100% Safe</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Top-Up Bar */}
            <View style={styles.quickTopupSection}>
              <Text style={styles.quickSectionTitle}>Quick Recharge</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {quickAmounts.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.quickChip}
                    onPress={() => {
                      setCustomAmount(String(amt));
                      setShowAddModal(true);
                    }}
                  >
                    <Text style={styles.quickChipText}>+₹{amt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Transaction Section Header */}
            <View style={styles.txHeaderRow}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <Text style={styles.txCount}>{filteredTransactions.length} Items</Text>
            </View>

            {/* Segmented Filter Tabs */}
            <View style={styles.tabContainer}>
              {[
                { id: "ALL", label: "All" },
                { id: "CREDITS", label: "Credits (+)" },
                { id: "DEBITS", label: "Debits (-)" },
                { id: "PENDING", label: "Pending" }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabBtn, activeTab === tab.id && styles.activeTabBtn]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Text style={[styles.tabBtnText, activeTab === tab.id && styles.activeTabBtnText]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={36} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Transactions Found</Text>
              <Text style={styles.emptyText}>
                No {activeTab.toLowerCase()} entries recorded in your wallet yet.
              </Text>
            </View>
          )
        }
      />

      {/* 1. Add Money Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTopRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="wallet-outline" size={22} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Recharge MehndiGo Wallet</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter Recharge Amount (₹)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="number-pad"
                placeholder="e.g. 500"
                placeholderTextColor={Colors.placeholder}
                value={customAmount}
                onChangeText={setCustomAmount}
                autoFocus
              />
            </View>

            {/* Quick Chips Inside Modal */}
            <View style={styles.modalChipsRow}>
              {quickAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.modalChip, customAmount === String(amt) && styles.activeModalChip]}
                  onPress={() => setCustomAmount(String(amt))}
                >
                  <Text style={[styles.modalChipText, customAmount === String(amt) && styles.activeModalChipText]}>
                    +₹{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Security Note */}
            <View style={styles.securityNoteRow}>
              <Ionicons name="lock-closed-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.securityNoteText}>Secure 256-bit encrypted checkout via Razorpay & UPI</Text>
            </View>

            <TouchableOpacity
              style={styles.submitAddBtn}
              activeOpacity={0.85}
              disabled={addingMoney}
              onPress={() => handleAddMoney(customAmount)}
            >
              {addingMoney ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitAddText}>Proceed to Pay {customAmount ? `₹${customAmount}` : ""}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Transaction Details Modal */}
      <Modal visible={!!selectedTx} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContentCard}>
            <View style={styles.txDetailHeader}>
              <View style={[
                styles.txDetailIconCircle,
                { backgroundColor: ["RECHARGE", "CASHBACK", "REFERRAL", "MANUAL_CREDIT", "SETTLEMENT", "REFUND"].includes(selectedTx?.transaction_type) ? "#ECFDF5" : "#FEF2F2" }
              ]}>
                <Ionicons
                  name={["RECHARGE", "CASHBACK", "REFERRAL", "MANUAL_CREDIT", "SETTLEMENT", "REFUND"].includes(selectedTx?.transaction_type) ? "arrow-down" : "arrow-up"}
                  size={24}
                  color={["RECHARGE", "CASHBACK", "REFERRAL", "MANUAL_CREDIT", "SETTLEMENT", "REFUND"].includes(selectedTx?.transaction_type) ? Colors.success : Colors.error}
                />
              </View>
              <Text style={styles.txDetailAmount}>
                ₹{Number(selectedTx?.amount || 0).toLocaleString("en-IN")}
              </Text>
              <Text style={styles.txDetailTitle}>{selectedTx?.description || selectedTx?.transaction_type}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Transaction Status</Text>
              <Text style={[styles.detailVal, { color: Colors.success, fontWeight: "700" }]}>{selectedTx?.status}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Type</Text>
              <Text style={styles.detailVal}>{selectedTx?.transaction_type?.replace(/_/g, " ")}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Date & Time</Text>
              <Text style={styles.detailVal}>{moment(selectedTx?.createdAt).format("DD MMM YYYY, hh:mm A")}</Text>
            </View>
            {selectedTx?.booking_id && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Booking Reference</Text>
                <Text style={styles.detailVal}>#{selectedTx?.booking_id}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Transaction ID</Text>
              <Text style={styles.detailVal}>TXN-{selectedTx?.id || "N/A"}</Text>
            </View>

            <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setSelectedTx(null)}>
              <Text style={styles.closeDetailText}>Close</Text>
            </TouchableOpacity>
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

      {/* 4. Test Simulator Modal (For Emulator without Native Razorpay) */}
      <Modal visible={checkoutModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContentCard}>
            <View style={{ alignItems: "center", marginBottom: 14 }}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
              <Text style={styles.modalTitle}>Razorpay Simulator</Text>
              <Text style={styles.orderLabel}>Order Ref: {orderId}</Text>
              <Text style={styles.modalAmount}>₹{customAmount || 500}</Text>
            </View>

            <TouchableOpacity style={styles.simSuccessBtn} onPress={handleRechargeSuccess}>
              <Text style={styles.simSuccessText}>Simulate Successful Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.simFailBtn} onPress={handleRechargeFailure}>
              <Text style={styles.simFailText}>Cancel Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAF9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justify: "space-between",
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
  perkDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  // Simulator
  orderLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  modalAmount: { fontSize: 28, fontWeight: "800", color: Colors.primary, marginVertical: 10 },
  simSuccessBtn: { backgroundColor: Colors.success, height: 46, width: "100%", borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  simSuccessText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  simFailBtn: { borderWidth: 1, borderColor: Colors.error, height: 46, width: "100%", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  simFailText: { color: Colors.error, fontWeight: "700", fontSize: 14 }
});
