import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { useSocket } from "../../context/SocketContext";
import {
  getUserWallet,
  getWalletHistory,
  requestWithdrawal,
  getWithdrawalHistory,
  getBankAccountDetails,
  saveBankAccountDetails
} from "../../services/wallet";
import moment from "moment";

export default function WalletScreen({ route, navigation }) {
  const initialPassedBalance = Number(route?.params?.balance || route?.params?.wallet?.available_balance || route?.params?.wallet?.balance || 0);
  const [balance, setBalance] = useState(initialPassedBalance);
  const [walletData, setWalletData] = useState(route?.params?.wallet || null);
  const [transactions, setTransactions] = useState([]);
  const [withdraws, setWithdraws] = useState([]);
  const [bankAccount, setBankAccount] = useState(null);

  // Default to Transactions so data shows immediately on first load
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || "Transactions");

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  // Selected Transaction for modal popup
  const [selectedItem, setSelectedItem] = useState(null);

  // Modals
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: ""
  });

  const socketContext = useSocket?.();
  const socket = socketContext?.socket;

  const loadWalletDataset = useCallback(async (isSilent = false) => {
    if (!isSilent && !refreshing && !walletData) {
      setLoading(true);
    }
    try {
      const [walletRes, historyRes, requestsRes, bankRes] = await Promise.allSettled([
        getUserWallet(),
        getWalletHistory(),
        getWithdrawalHistory(),
        getBankAccountDetails()
      ]);

      let wObj = null;
      if (walletRes.status === "fulfilled" && walletRes.value) {
        wObj = walletRes.value?.data || walletRes.value;
        if (wObj && typeof wObj === "object") {
          setWalletData(wObj);
          const avBal = Number(
            wObj.available_balance !== undefined && wObj.available_balance !== null
              ? wObj.available_balance
              : (wObj.balance || wObj.availableBalance || 0)
          );
          setBalance(avBal);
        }
      }

      // Extract transaction history from historyRes OR wallet response wObj.transactions
      let txList = [];
      if (historyRes.status === "fulfilled" && historyRes.value) {
        const hVal = historyRes.value?.data || historyRes.value;
        if (Array.isArray(hVal)) {
          txList = hVal;
        }
      }
      if (txList.length === 0 && Array.isArray(wObj?.transactions)) {
        txList = wObj.transactions;
      }
      if (txList.length > 0) {
        setTransactions(txList);
      }

      // Extract withdrawal requests
      if (requestsRes.status === "fulfilled" && requestsRes.value) {
        const rVal = requestsRes.value?.data || requestsRes.value;
        if (Array.isArray(rVal)) {
          setWithdraws(rVal);
        }
      }

      // Extract bank account details
      if (bankRes.status === "fulfilled" && bankRes.value) {
        const bank = bankRes.value?.data || bankRes.value;
        if (bank && (bank.account_number || bank.bank_name || bank.ifsc_code)) {
          setBankAccount(bank);
          setBankForm({
            accountHolderName: bank.account_holder_name || "",
            accountNumber: bank.account_number || "",
            ifscCode: bank.ifsc_code || "",
            bankName: bank.bank_name || "",
            upiId: bank.upi_id || ""
          });
        }
      }
    } catch (err) {
      if (__DEV__) console.log("Failed to load artist wallet info:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, walletData]);

  // Initial & Focus load + Back handling
  useFocusEffect(
    useCallback(() => {
      loadWalletDataset();
      const { BackHandler } = require("react-native");

      const onBackPress = () => {
        if (selectedItem) {
          setSelectedItem(null);
          return true;
        }
        if (withdrawModalVisible) {
          setWithdrawModalVisible(false);
          return true;
        }
        if (bankModalVisible) {
          setBankModalVisible(false);
          return true;
        }
        if (navigation?.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("ArtistTabs", { screen: "Dashboard" });
        }
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [loadWalletDataset, selectedItem, withdrawModalVisible, bankModalVisible, navigation])
  );

  // Auto-refresh on Real-time Socket Events
  useEffect(() => {
    if (!socket) return;
    const handleSocketUpdate = () => {
      loadWalletDataset(true);
    };

    socket.on("WALLET_UPDATED", handleSocketUpdate);
    socket.on("BOOKING_COMPLETED", handleSocketUpdate);
    socket.on("PAYMENT_RECEIVED", handleSocketUpdate);

    return () => {
      socket.off("WALLET_UPDATED", handleSocketUpdate);
      socket.off("BOOKING_COMPLETED", handleSocketUpdate);
      socket.off("PAYMENT_RECEIVED", handleSocketUpdate);
    };
  }, [socket, loadWalletDataset]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWalletDataset();
  };

  const handleWithdrawalRequest = async () => {
    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount to withdraw.");
      return;
    }
    if (amt > balance) {
      Alert.alert("Insufficient Balance", "Your payout request exceeds your current available balance.");
      return;
    }
    if (!bankAccount) {
      Alert.alert("Bank Details Required", "Please link your bank account details first before requesting payout.");
      setWithdrawModalVisible(false);
      setBankModalVisible(true);
      return;
    }

    setWithdrawLoading(true);
    try {
      await requestWithdrawal(amt);
      Alert.alert("Request Submitted 🎉", `Withdrawal request of ₹${amt} has been submitted for bank transfer.`);
      setWithdrawModalVisible(false);
      setWithdrawAmount("");
      loadWalletDataset();
    } catch (err) {
      Alert.alert("Payout Error", err.message || "Withdrawal request failed.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleSaveBankDetails = async () => {
    const { accountHolderName, accountNumber, ifscCode, bankName } = bankForm;
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      Alert.alert("Incomplete Details", "Please fill in Account Name, Account Number, IFSC, and Bank Name.");
      return;
    }
    setBankLoading(true);
    try {
      await saveBankAccountDetails(bankForm);
      Alert.alert("Bank Linked Success", "Your payout bank credentials have been updated.");
      setBankModalVisible(false);
      loadWalletDataset();
    } catch (err) {
      Alert.alert("Save Error", "Failed to save bank credentials.");
    } finally {
      setBankLoading(false);
    }
  };

  const renderTransaction = ({ item }) => {
    const rawType = String(item.type || item.transaction_type || "").toUpperCase();
    const isCash = rawType === "CASH_COLLECTED" || rawType === "CASH" || String(item.description || "").toLowerCase().includes("cash collected");
    const isInfo = rawType === "INFO";
    const isCredit = rawType === "CREDIT" || ["RECHARGE", "REFUND", "CASHBACK", "SETTLEMENT", "MANUAL_CREDIT", "EARNING"].includes(rawType);

    let iconBg = isCredit ? "#ECFDF5" : (isCash ? "#EFF6FF" : (isInfo ? "#F3F4F6" : "#FEF2F2"));
    let iconName = isCredit ? "arrow-down" : (isCash ? "cash-outline" : (isInfo ? "information-circle-outline" : "arrow-up"));
    let iconColor = isCredit ? Colors.success : (isCash ? "#2563EB" : (isInfo ? "#6B7280" : Colors.error));
    let amountColor = isCredit ? Colors.success : (isCash ? "#2563EB" : (isInfo ? "#6B7280" : Colors.error));
    let sign = isCredit ? "+" : (isCash ? "✓ " : (isInfo ? "" : "-"));

    return (
      <TouchableOpacity 
        style={styles.cardItem} 
        activeOpacity={0.7}
        onPress={() => setSelectedItem(item)}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons
            name={iconName}
            size={20}
            color={iconColor}
          />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.description || item.transaction_type?.replace(/_/g, " ") || (isCredit ? "Credit" : (isCash ? "Cash Collected" : "Debit"))}
          </Text>
          <Text style={styles.cardSubtitle}>{moment(item.created_at || item.createdAt || item.date || new Date()).format("DD MMM YYYY, hh:mm A")}</Text>
        </View>

        <Text style={[styles.cardAmount, { color: amountColor }]}>
          {sign}₹{Number(item.amount || 0).toLocaleString("en-IN")}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderWithdrawItem = ({ item }) => {
    const statusUpper = String(item.status || "").toUpperCase();
    let badgeBg = "#FEF3C7";
    let badgeColor = "#B45309";
    if (statusUpper === "SUCCESS" || statusUpper === "APPROVED" || statusUpper === "COMPLETED") {
      badgeBg = "#DCFCE7";
      badgeColor = "#15803D";
    } else if (statusUpper === "REJECTED" || statusUpper === "FAILED") {
      badgeBg = "#FEE2E2";
      badgeColor = "#B91C1C";
    }

    return (
      <TouchableOpacity 
        style={styles.cardItem}
        activeOpacity={0.7}
        onPress={() => setSelectedItem(item)}
      >
        <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
          <Ionicons name="cash-outline" size={20} color={Colors.primary} />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>Bank Transfer Request</Text>
          <Text style={styles.cardSubtitle}>{moment(item.createdAt).format("DD MMM YYYY, hh:mm A")}</Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.cardAmount}>₹{Number(item.amount).toLocaleString("en-IN")}</Text>
          <View style={[styles.badgePill, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{item.status}</Text>
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
        <Text style={styles.headerTitle}>Earnings & Payouts</Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => setBankModalVisible(true)}>
          <Ionicons name="card-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === "Transactions" ? transactions : withdraws}
        renderItem={activeTab === "Transactions" ? renderTransaction : renderWithdrawItem}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Hero Earnings Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.walletBadgeIcon}>
                    <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.heroLabel}>Available Payout Balance</Text>
                </View>
                <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
                  <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={20} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              </View>

              <Text style={styles.heroBalance}>
                {showBalance ? `₹${Number(balance).toLocaleString("en-IN")}` : "••••••••"}
              </Text>
              
              <Text style={styles.heroSubtitle}>
                {bankAccount ? `Linked: ${bankAccount.bank_name} (••${String(bankAccount.account_number).slice(-4)})` : "⚠️ No bank account linked for automatic payout"}
              </Text>

              {/* Action Bar */}
              <View style={styles.heroActionRow}>
                <TouchableOpacity 
                  style={styles.payoutBtn} 
                  activeOpacity={0.85}
                  onPress={() => {
                    if (!bankAccount) {
                      Alert.alert("Link Bank Account", "Please link your bank credentials before requesting withdrawal.", [
                        { text: "Cancel" },
                        { text: "Link Now", onPress: () => setBankModalVisible(true) }
                      ]);
                    } else {
                      setWithdrawModalVisible(true);
                    }
                  }}
                >
                  <Ionicons name="arrow-up-circle" size={18} color={Colors.primary} />
                  <Text style={styles.payoutBtnText}>Request Payout</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.bankManageBtn}
                  activeOpacity={0.85}
                  onPress={() => setBankModalVisible(true)}
                >
                  <Ionicons name="business-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.bankManageText}>{bankAccount ? "Edit Bank" : "+ Link Bank"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Metrics Breakdown */}
            <View style={styles.statsRow}>
              <View style={styles.statMiniCard}>
                <View style={styles.statIconBadge}>
                  <Ionicons name="trending-up" size={16} color={Colors.success} />
                </View>
                <Text style={styles.statMiniLabel}>Lifetime Earnings</Text>
                <Text style={styles.statMiniValue}>₹{Number(walletData?.total_earnings || walletData?.lifetime_earnings || 0).toLocaleString("en-IN")}</Text>
              </View>

              <View style={styles.statMiniCard}>
                <View style={[styles.statIconBadge, { backgroundColor: "#FFFBEB" }]}>
                  <Ionicons name="lock-closed-outline" size={16} color={Colors.warning} />
                </View>
                <Text style={styles.statMiniLabel}>In Escrow</Text>
                <Text style={styles.statMiniValue}>₹{Number(walletData?.escrow_balance || walletData?.pending_balance || 0).toLocaleString("en-IN")}</Text>
              </View>
            </View>

            {/* Tabs Bar */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "Withdraw" && styles.activeTabBtn]}
                onPress={() => setActiveTab("Withdraw")}
              >
                <Text style={[styles.tabBtnText, activeTab === "Withdraw" && styles.activeTabBtnText]}>
                  Payout Requests ({withdraws.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "Transactions" && styles.activeTabBtn]}
                onPress={() => setActiveTab("Transactions")}
              >
                <Text style={[styles.tabBtnText, activeTab === "Transactions" && styles.activeTabBtnText]}>
                  Ledger Logs ({transactions.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section Heading */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>
                {activeTab === "Transactions" ? "Earnings & Settlement Ledger" : "Bank Transfer History"}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={[styles.emptyState, { paddingVertical: 40 }]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={[styles.emptyText, { marginTop: 10 }]}>Loading wallet records...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>
                No {activeTab === "Transactions" ? "ledger entries" : "payout requests"} recorded yet.
              </Text>
            </View>
          )
        }
      />

      {/* 1. Request Payout Modal */}
      <Modal visible={withdrawModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalSheetTitle}>Request Payout Transfer</Text>
              <Text style={styles.modalSheetSubtitle}>Available Balance: ₹{Number(balance).toLocaleString("en-IN")}</Text>

              <Text style={styles.inputLabel}>Enter Amount (₹)</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="e.g. 1000"
                  placeholderTextColor={Colors.placeholder}
                  style={styles.amountInput}
                  autoFocus
                />
              </View>

              <View style={styles.chipsRow}>
                {[500, 1000, 2500, 5000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.chipBtn}
                    onPress={() => setWithdrawAmount(String(amt))}
                  >
                    <Text style={styles.chipText}>₹{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {withdrawLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
              ) : (
                <View style={styles.modalActionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setWithdrawModalVisible(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.confirmBtn} onPress={handleWithdrawalRequest}>
                    <Text style={styles.confirmText}>Submit Request</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 2. Link/Edit Bank Account Modal */}
      <Modal visible={bankModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalSheetTitle}>Bank Account Credentials</Text>
              <Text style={styles.modalSheetSubtitle}>Enter your official bank details for automatic payout transfers.</Text>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Account Holder Name</Text>
                <TextInput
                  value={bankForm.accountHolderName}
                  onChangeText={(val) => setBankForm({ ...bankForm, accountHolderName: val })}
                  placeholder="Name as registered with Bank"
                  style={styles.fieldInput}
                />

                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  value={bankForm.accountNumber}
                  keyboardType="number-pad"
                  onChangeText={(val) => setBankForm({ ...bankForm, accountNumber: val })}
                  placeholder="e.g. 987654321012"
                  style={styles.fieldInput}
                />

                <Text style={styles.inputLabel}>IFSC Code</Text>
                <TextInput
                  value={bankForm.ifscCode}
                  autoCapitalize="characters"
                  onChangeText={(val) => setBankForm({ ...bankForm, ifscCode: val })}
                  placeholder="e.g. SBIN0001234"
                  style={styles.fieldInput}
                />

                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  value={bankForm.bankName}
                  onChangeText={(val) => setBankForm({ ...bankForm, bankName: val })}
                  placeholder="e.g. State Bank of India / HDFC"
                  style={styles.fieldInput}
                />
              </ScrollView>

              {bankLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
              ) : (
                <View style={styles.modalActionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setBankModalVisible(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveBankDetails}>
                    <Text style={styles.confirmText}>Save Credentials</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. Item Detail Modal */}
      <Modal visible={!!selectedItem} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>{selectedItem?.transaction_type || "Payout Request"}</Text>
            <Text style={styles.detailAmount}>₹{Number(selectedItem?.amount || 0).toLocaleString("en-IN")}</Text>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Status</Text>
              <Text style={[styles.detailVal, { color: Colors.primary, fontWeight: "700" }]}>{selectedItem?.status || "SUCCESS"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Date & Time</Text>
              <Text style={styles.detailVal}>{moment(selectedItem?.createdAt).format("DD MMM YYYY, hh:mm A")}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Reference ID</Text>
              <Text style={styles.detailVal}>REF-{selectedItem?.id}</Text>
            </View>

            <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setSelectedItem(null)}>
              <Text style={styles.closeDetailText}>Close</Text>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6"
  },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  listContainer: { paddingBottom: 110 },

  // Hero Earnings Card
  heroCard: {
    margin: 16,
    borderRadius: 22,
    padding: 20,
    backgroundColor: "#9C1344", // Royal Rose / Burgundy
    elevation: 5,
    shadowColor: "#9C1344",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  walletBadgeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 8 },
  heroLabel: { fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  heroBalance: { fontSize: 34, fontWeight: "800", color: "#FFFFFF", marginBottom: 6 },
  heroSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginBottom: 18 },
  heroActionRow: { flexDirection: "row", gap: 10 },
  
  payoutBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 2
  },
  payoutBtnText: { color: Colors.primary, fontWeight: "800", fontSize: 14, marginLeft: 6 },

  bankManageBtn: {
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
  bankManageText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 6 },

  // Stats Grid
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 14 },
  statMiniCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#EEF2F6", elevation: 1 },
  statIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#ECFDF5", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statMiniLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600", marginBottom: 2 },
  statMiniValue: { fontSize: 16, fontWeight: "800", color: Colors.text },

  // Tabs Bar
  tabContainer: { flexDirection: "row", marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: "#EEF2F6", marginBottom: 12 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  activeTabBtn: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  activeTabBtnText: { color: Colors.white, fontWeight: "700" },

  sectionHeaderRow: { paddingHorizontal: 16, marginVertical: 6 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },

  // Card List Items
  cardItem: {
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
  iconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", marginRight: 12 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 2 },
  cardSubtitle: { fontSize: 11, color: Colors.textTertiary },
  cardAmount: { fontSize: 15, fontWeight: "800", color: Colors.text },
  badgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 3 },
  badgeText: { fontSize: 9, fontWeight: "700" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { color: Colors.textTertiary, fontSize: 13, marginTop: 8 },

  // Modals Base
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 14 },
  modalSheetTitle: { fontSize: 18, fontWeight: "800", color: Colors.text, marginBottom: 2 },
  modalSheetSubtitle: { fontSize: 12, color: Colors.textSecondary, marginBottom: 14 },

  inputLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600", marginBottom: 6, marginTop: 6 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, paddingHorizontal: 16, height: 52, marginBottom: 12, backgroundColor: "#FFF8FA" },
  currencyPrefix: { fontSize: 20, fontWeight: "800", color: Colors.primary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: "800", color: Colors.text },
  
  fieldInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, color: Colors.text, marginBottom: 10, backgroundColor: "#FAFAFA" },

  chipsRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  chipBtn: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  chipText: { fontSize: 12, fontWeight: "700", color: Colors.text },

  modalActionRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, justifyContent: "center", alignItems: "center" },
  cancelText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 14 },
  confirmBtn: { flex: 1.2, height: 48, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  confirmText: { color: Colors.white, fontWeight: "800", fontSize: 14 },

  // Details Modal Card
  detailCard: { backgroundColor: Colors.white, width: "90%", alignSelf: "center", borderRadius: 22, padding: 22, marginBottom: "auto", marginTop: "auto", elevation: 8, alignItems: "center" },
  detailTitle: { fontSize: 16, fontWeight: "700", color: Colors.textSecondary, marginBottom: 4 },
  detailAmount: { fontSize: 30, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  detailDivider: { height: 1, backgroundColor: "#EEF2F6", width: "100%", marginVertical: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 10 },
  detailKey: { fontSize: 13, color: Colors.textSecondary },
  detailVal: { fontSize: 13, color: Colors.text, fontWeight: "600" },
  closeDetailBtn: { backgroundColor: Colors.primary, height: 44, width: "100%", borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 14 },
  closeDetailText: { color: Colors.white, fontWeight: "700", fontSize: 14 }
});
