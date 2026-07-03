import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import CustomButton from "../../components/CustomButton";
import {
  getUserWallet,
  getWalletHistory,
  addWalletMoney,
  requestWithdrawal,
  cancelWithdrawal,
  getWithdrawalHistory,
  getBankAccountDetails,
  saveBankAccountDetails
} from "../../services/wallet";
import { createPaymentOrder } from "../../services/payment";

export default function WalletScreen({ navigation }) {
  const { user } = useAuth();
  const isArtist = user?.role === "ARTIST";

  // State parameters
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [bankAccount, setBankAccount] = useState(null);
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState("overview"); // overview, ledger, bank (if artist), withdrawals (if artist)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL, RECHARGE, PAYMENT, REFUND, SETTLEMENT, WITHDRAWAL

  // Modal overlays
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("500");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [orderId, setOrderId] = useState("");

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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAllData = React.useCallback(async () => {
    try {
      const wallet = await getUserWallet();
      setBalance(wallet?.balance || 0);

      const txHistory = await getWalletHistory();
      setTransactions(txHistory || []);
      setFilteredTransactions(txHistory || []);

      if (isArtist) {
        const withdraws = await getWithdrawalHistory();
        setWithdrawRequests(withdraws || []);

        const bank = await getBankAccountDetails();
        setBankAccount(bank);
        if (bank) {
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
      console.log("Error loading wallet details:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isArtist]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAllData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAllData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadAllData();
    });
    return unsubscribe;
  }, [navigation, loadAllData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Search and filter handler
  useEffect(() => {
    let result = transactions;
    if (searchQuery) {
      result = result.filter(
        (tx) =>
          tx.id.toString().includes(searchQuery) ||
          (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (filterType !== "ALL") {
      result = result.filter((tx) => tx.transaction_type === filterType);
    }
    const timer = setTimeout(() => {
      setFilteredTransactions(result);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchQuery, filterType, transactions]);

  // Recharge workflow
  const handleInitiateRecharge = async () => {
    const amt = Number(rechargeAmount);
    if (isNaN(amt) || amt < 100 || amt > 10000) {
      Alert.alert("Invalid Amount", "Recharge amount must be between ₹100 and ₹10,000.");
      return;
    }
    setRechargeLoading(true);
    try {
      // Reuse payment order generation
      const order = await createPaymentOrder(1); // placeholder booking id for topup orders
      setOrderId(order.id);
      setRechargeModalVisible(false);
      setCheckoutModalVisible(true);
    } catch (err) {
      Alert.alert("Checkout Error", "Failed to initiate Razorpay transaction.");
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleRechargeSuccess = async () => {
    setCheckoutModalVisible(false);
    setLoading(true);
    try {
      const rechargeDetails = {
        amount: rechargeAmount,
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 10)}`,
        razorpay_signature: `sig_${Math.random().toString(36).substring(2, 10)}`
      };
      await addWalletMoney(rechargeDetails);
      Alert.alert("Success", `₹${rechargeAmount} credited to your wallet balance successfully!`);
      loadAllData();
    } catch (err) {
      Alert.alert("Recharge Failed", err.message || "Failed to credit money.");
      setLoading(false);
    }
  };

  // Withdrawal workflow
  const handleWithdrawalRequest = async () => {
    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt <= 0 || amt > balance) {
      Alert.alert("Invalid Amount", "Please enter a valid amount within your current balance.");
      return;
    }
    if (!bankAccount) {
      Alert.alert("Bank Missing", "Please register your bank account details first before requesting payout.");
      return;
    }
    setWithdrawLoading(true);
    try {
      await requestWithdrawal(amt);
      Alert.alert("Request Submitted", `Withdrawal request of ₹${amt} is pending approval.`);
      setWithdrawModalVisible(false);
      setWithdrawAmount("");
      loadAllData();
    } catch (err) {
      Alert.alert("Payout Error", err.message || "Withdrawal request failed.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleCancelWithdrawal = async (requestId) => {
    Alert.alert(
      "Cancel Payout",
      "Are you sure you want to cancel this pending withdrawal request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          onPress: async () => {
            setLoading(true);
            try {
              await cancelWithdrawal(requestId);
              Alert.alert("Cancelled", "Withdrawal request cancelled. Balance restored.");
              loadAllData();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to cancel request.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Bank setup workflow
  const handleSaveBankDetails = async () => {
    const { accountHolderName, accountNumber, ifscCode, bankName } = bankForm;
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      Alert.alert("Incomplete Form", "Please fill in all required bank details.");
      return;
    }
    setBankLoading(true);
    try {
      await saveBankAccountDetails(bankForm);
      Alert.alert("Success", "Bank account details saved successfully.");
      setBankModalVisible(false);
      loadAllData();
    } catch (err) {
      Alert.alert("Error", "Failed to save bank information.");
    } finally {
      setBankLoading(false);
    }
  };

  const renderTransactionCard = ({ item }) => {
    const isCredit = [
      "RECHARGE",
      "REFUND",
      "CASHBACK",
      "REFERRAL",
      "SETTLEMENT",
      "MANUAL_CREDIT"
    ].includes(item.transaction_type);

    return (
      <View style={styles.transactionCard}>
        <View style={[styles.transactionLeft, { flex: 1, marginRight: 16 }]}>
          <View style={[styles.iconBox, { backgroundColor: isCredit ? "#EAFaf1" : "#FDEDEC" }]}>
            <Ionicons
              name={isCredit ? "arrow-down-outline" : "arrow-up-outline"}
              size={18}
              color={isCredit ? Colors.success : Colors.error}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.transactionTitle}>{item.transaction_type}</Text>
            <Text style={styles.transactionDesc}>{item.description}</Text>
            <Text style={styles.transactionDate}>{new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={[styles.statusBadgeText, { color: item.status === "SUCCESS" || item.status === "APPROVED" ? Colors.success : (item.status === "PENDING" ? "#E2B93B" : Colors.error) }]}>
              Status: {item.status || "SUCCESS"}
            </Text>
          </View>
        </View>
        <Text style={[styles.amountText, { color: isCredit ? Colors.success : Colors.error }]}>
          {isCredit ? "+" : "-"} ₹{item.amount}
        </Text>
      </View>
    );
  };

  const renderWithdrawalCard = ({ item }) => {
    const isPending = item.status === "PENDING";
    return (
      <View style={styles.transactionCard}>
        <View style={[styles.transactionLeft, { flex: 1, marginRight: 16 }]}>
          <View style={[styles.iconBox, { backgroundColor: "#FFF0F4" }]}>
            <Ionicons name="cash-outline" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.transactionTitle}>Payout Request</Text>
            <Text style={styles.transactionDate}>Requested on: {new Date(item.createdAt).toDateString()}</Text>
            <Text style={styles.statusBadgeText}>Status: {item.status}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.amountText}>₹{item.amount}</Text>
          {isPending && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelWithdrawal(item.id)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
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

  // Earnings Stats calculations
  const totalSettlements = transactions
    .filter((tx) => tx.transaction_type === "SETTLEMENT" && tx.status === "SUCCESS")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isArtist ? "Artist Ledger" : "My Wallet"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{balance.toLocaleString()}</Text>

          <View style={styles.actionRow}>
            {isArtist ? (
              <>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setWithdrawModalVisible(true)}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.actionBtnText}>Request Payout</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setBankModalVisible(true)}>
                  <Ionicons name="card-outline" size={16} color={Colors.primary} />
                  <Text style={styles.actionBtnText}>
                    {bankAccount ? "Edit Bank" : "Link Bank"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={() => setRechargeModalVisible(true)}>
                <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.actionBtnText}>Add Money</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Grid for Artists */}
        {isArtist && (
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>₹{totalSettlements.toLocaleString()}</Text>
              <Text style={styles.statLbl}>Lifetime Earnings</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>
                {withdrawRequests.filter((r) => r.status === "PENDING").length}
              </Text>
              <Text style={styles.statLbl}>Pending Payouts</Text>
            </View>
          </View>
        )}

        {/* Dynamic Navigation Segment Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "overview" && styles.activeTab]}
            onPress={() => setActiveTab("overview")}
          >
            <Text style={[styles.tabText, activeTab === "overview" && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "ledger" && styles.activeTab]}
            onPress={() => setActiveTab("ledger")}
          >
            <Text style={[styles.tabText, activeTab === "ledger" && styles.activeTabText]}>
              Ledger
            </Text>
          </TouchableOpacity>

          {isArtist && (
            <TouchableOpacity
              style={[styles.tab, activeTab === "withdrawals" && styles.activeTab]}
              onPress={() => setActiveTab("withdrawals")}
            >
              <Text style={[styles.tabText, activeTab === "withdrawals" && styles.activeTabText]}>
                Payouts
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Overview Tab Content */}
        {activeTab === "overview" && (
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>Recent Account Ledger</Text>
            {transactions.slice(0, 3).map((item) => (
              <View key={item.id.toString()}>
                {renderTransactionCard({ item })}
              </View>
            ))}
            {transactions.length === 0 && (
              <Text style={styles.emptyText}>No ledger logs generated yet.</Text>
            )}
          </View>
        )}

        {/* Ledger Tab Content (with filters and search) */}
        {activeTab === "ledger" && (
          <View style={styles.ledgerSection}>
            {/* Search Box */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={Colors.textTertiary} />
              <TextInput
                placeholder="Search by Tx ID or desc..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>

            {/* Filters Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
              {["ALL", "RECHARGE", "PAYMENT", "REFUND", "SETTLEMENT", "WITHDRAWAL"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setFilterType(type)}
                  style={[styles.filterChip, filterType === type && styles.activeFilterChip]}
                >
                  <Text style={[styles.filterChipText, filterType === type && styles.activeFilterChipText]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredTransactions.map((item) => (
              <View key={item.id.toString()}>
                {renderTransactionCard({ item })}
              </View>
            ))}

            {filteredTransactions.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={32} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>No filtered transactions match.</Text>
              </View>
            )}
          </View>
        )}

        {/* Payouts Tab Content */}
        {activeTab === "withdrawals" && isArtist && (
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>Payout Statements</Text>
            {withdrawRequests.map((item) => (
              <View key={item.id.toString()}>
                {renderWithdrawalCard({ item })}
              </View>
            ))}
            {withdrawRequests.length === 0 && (
              <Text style={styles.emptyText}>No withdrawal history tracked.</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* 1. Add Money Modal */}
      <Modal visible={rechargeModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recharge Wallet</Text>
            <Text style={styles.inputLabel}>Enter Amount (Min ₹100 - Max ₹10,000)</Text>
            <TextInput
              keyboardType="number-pad"
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
              style={styles.inputField}
            />
            {rechargeLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setRechargeModalVisible(false)}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmModalBtn} onPress={handleInitiateRecharge}>
                  <Text style={styles.confirmModalText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 2. Topup Checkout Gateway Simulator Modal */}
      <Modal visible={checkoutModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Razorpay Gateway Recharge</Text>
            <Text style={styles.modalAmount}>₹{rechargeAmount}</Text>
            <TouchableOpacity style={styles.gatewaySuccessBtn} onPress={handleRechargeSuccess}>
              <Text style={styles.gatewaySuccessBtnText}>Confirm Success Payout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gatewayFailBtn}
              onPress={() => setCheckoutModalVisible(false)}
            >
              <Text style={styles.gatewayFailBtnText}>Cancel transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. Withdraw Request Modal */}
      <Modal visible={withdrawModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Bank Payout</Text>
            <Text style={styles.inputLabel}>Amount to withdraw (₹)</Text>
            <TextInput
              keyboardType="number-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder={`Available: ₹${balance}`}
              style={styles.inputField}
            />
            {withdrawLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setWithdrawModalVisible(false)}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmModalBtn} onPress={handleWithdrawalRequest}>
                  <Text style={styles.confirmModalText}>Submit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 4. Link/Edit Bank Account details Modal */}
      <Modal visible={bankModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { width: "90%" }]}>
            <Text style={styles.modalTitle}>Register Bank Credentials</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%", maxHeight: 350 }}>
              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                value={bankForm.accountHolderName}
                onChangeText={(val) => setBankForm({ ...bankForm, accountHolderName: val })}
                style={styles.inputField}
              />
              <Text style={styles.inputLabel}>Bank Account Number</Text>
              <TextInput
                value={bankForm.accountNumber}
                onChangeText={(val) => setBankForm({ ...bankForm, accountNumber: val })}
                style={styles.inputField}
              />
              <Text style={styles.inputLabel}>IFSC Code</Text>
              <TextInput
                value={bankForm.ifscCode}
                onChangeText={(val) => setBankForm({ ...bankForm, ifscCode: val })}
                style={styles.inputField}
              />
              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                value={bankForm.bankName}
                onChangeText={(val) => setBankForm({ ...bankForm, bankName: val })}
                style={styles.inputField}
              />
              <Text style={styles.inputLabel}>UPI ID (Optional)</Text>
              <TextInput
                value={bankForm.upiId}
                onChangeText={(val) => setBankForm({ ...bankForm, upiId: val })}
                style={styles.inputField}
              />
            </ScrollView>
            {bankLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setBankModalVisible(false)}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmModalBtn} onPress={handleSaveBankDetails}>
                  <Text style={styles.confirmModalText}>Save Details</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  balanceCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, margin: 16, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  balanceLabel: { color: Colors.textSecondary, fontSize: 12 },
  balanceAmount: { color: Colors.primary, fontSize: 36, fontWeight: "800", marginTop: 6 },
  actionRow: { flexDirection: "row", marginTop: 18, justifyContent: "space-between" },
  actionBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, width: "48%", justifyContent: "center" },
  actionBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 12, marginLeft: 6 },
  statsGrid: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  statBox: { backgroundColor: Colors.white, width: "48%", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  statVal: { fontSize: 16, fontWeight: "800", color: Colors.text },
  statLbl: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  tabContainer: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: 16 },
  tab: { paddingVertical: 14, marginRight: 24, borderBottomWidth: 2, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, color: Colors.textTertiary, fontWeight: "700" },
  activeTabText: { color: Colors.primary },
  overviewSection: { padding: 16 },
  ledgerSection: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, marginBottom: 14 },
  transactionCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  transactionLeft: { flexDirection: "row", alignItems: "center" },
  iconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  transactionTitle: { fontSize: 12, fontWeight: "800", color: Colors.text },
  transactionDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  transactionDate: { fontSize: 9, color: Colors.textTertiary, marginTop: 4 },
  amountText: { fontSize: 13, fontWeight: "800" },
  emptyText: { fontSize: 11, color: Colors.textSecondary, textAlign: "center", marginVertical: 32 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 12, color: Colors.text },
  filtersRow: { flexDirection: "row", marginBottom: 14 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, marginRight: 8, borderWidth: 1, borderColor: Colors.border, height: 34 },
  activeFilterChip: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 10, color: Colors.textSecondary, fontWeight: "700" },
  activeFilterChipText: { color: Colors.white },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  cancelBtn: { marginTop: 6, backgroundColor: "#FDEDEC", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  cancelBtnText: { color: Colors.error, fontSize: 10, fontWeight: "700" },
  statusBadgeText: { fontSize: 9, color: Colors.primary, fontWeight: "700", marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.white, width: "85%", borderRadius: 20, padding: 24, alignItems: "center" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 16 },
  inputLabel: { fontSize: 12, color: Colors.textSecondary, alignSelf: "flex-start", marginBottom: 6 },
  inputField: { width: "100%", height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 13, color: Colors.text, marginBottom: 18 },
  modalBtnRow: { flexDirection: "row", width: "100%", justifyContent: "space-between" },
  cancelModalBtn: { width: "48%", height: 44, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, justifyContent: "center", alignItems: "center" },
  cancelModalText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 13 },
  confirmModalBtn: { width: "48%", height: 44, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  confirmModalText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  modalAmount: { fontSize: 32, fontWeight: "800", color: Colors.primary, marginBottom: 20 },
  gatewaySuccessBtn: { width: "100%", height: 46, backgroundColor: Colors.success, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  gatewaySuccessBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  gatewayFailBtn: { width: "100%", height: 46, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  gatewayFailBtnText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 13 }
});
