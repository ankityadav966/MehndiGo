import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import {
  getUserWallet,
  getWalletHistory,
  requestWithdrawal,
  getWithdrawalHistory,
  getBankAccountDetails,
  saveBankAccountDetails
} from "../../services/wallet";

export default function WalletScreen({ route, navigation }) {
  const [balance, setBalance] = useState(0);
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdraws, setWithdraws] = useState([]);
  const [bankAccount, setBankAccount] = useState(null);

  const [activeTab, setActiveTab] = useState("Withdraw"); // Withdraw, Transactions

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal forms
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

  const loadWalletDataset = React.useCallback(async () => {
    try {
      const wallet = await getUserWallet();
      setWalletData(wallet);
      setBalance(wallet?.balance || 0);

      const history = await getWalletHistory();
      setTransactions(history || []);

      const requests = await getWithdrawalHistory();
      setWithdraws(requests || []);

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
    } catch (err) {
      console.log("Failed to load artist wallet info:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWalletDataset();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadWalletDataset]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadWalletDataset();
    });
    return unsubscribe;
  }, [navigation, loadWalletDataset]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWalletDataset();
  };

  const handleWithdrawalRequest = async () => {
    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive amount.");
      return;
    }
    if (amt > balance) {
      Alert.alert("Insufficient Balance", "You don't have enough wallet balance to complete this transaction.");
      return;
    }
    if (!bankAccount) {
      Alert.alert("Bank Required", "Please register your bank account details first before requesting payout.");
      return;
    }
    setWithdrawLoading(true);
    try {
      await requestWithdrawal(amt);
      Alert.alert("Request Submitted 🎉", `Withdrawal request of ₹${amt} is pending approval.`);
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
      Alert.alert("Incomplete Details", "Please fill in all required fields.");
      return;
    }
    setBankLoading(true);
    try {
      await saveBankAccountDetails(bankForm);
      Alert.alert("Success", "Bank account details saved successfully.");
      setBankModalVisible(false);
      loadWalletDataset();
    } catch (err) {
      Alert.alert("Save Error", "Failed to save bank information.");
    } finally {
      setBankLoading(false);
    }
  };

  const renderTransaction = ({ item }) => {
    const isCredit = [
      "RECHARGE",
      "REFUND",
      "CASHBACK",
      "SETTLEMENT",
      "MANUAL_CREDIT"
    ].includes(item.transaction_type);

    return (
      <View style={styles.transactionCard}>
        <View>
          <Text style={styles.transactionTitle}>{item.transaction_type}</Text>
          <Text style={styles.transactionDate}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        <Text style={[styles.amount, isCredit ? styles.credit : styles.debit]}>
          {isCredit ? "+" : "-"}₹{item.amount}
        </Text>
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={activeTab === "Transactions" ? transactions : withdraws}
        renderItem={activeTab === "Transactions" ? renderTransaction : ({ item }) => (
          <View style={styles.transactionCard}>
            <View>
              <Text style={styles.transactionTitle}>Withdrawal request</Text>
              <Text style={styles.transactionDate}>Status: {item.status} • {new Date(item.createdAt).toDateString()}</Text>
            </View>
            <Text style={styles.amount}>₹{item.amount}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.walletCard}>
              <View style={styles.walletTop}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Ionicons name="wallet-outline" size={20} color={Colors.white} />
              </View>
              <Text style={styles.balance}>₹{balance.toLocaleString()}</Text>
              <Text style={styles.available}>Processed and ready for bank payout</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.miniCard}>
                <Text style={styles.miniLabel}>Total Earnings</Text>
                <Text style={styles.miniValue}>₹{(walletData?.lifetime_earnings || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.miniCard}>
                <Text style={styles.miniLabel}>Pending Earnings</Text>
                <Text style={styles.miniValue}>₹{(walletData?.pending_balance || 0).toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "Withdraw" && styles.activeTab]}
                onPress={() => setActiveTab("Withdraw")}
              >
                <Text style={[styles.tabText, activeTab === "Withdraw" && styles.activeTabText]}>Payouts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "Transactions" && styles.activeTab]}
                onPress={() => setActiveTab("Transactions")}
              >
                <Text style={[styles.tabText, activeTab === "Transactions" && styles.activeTabText]}>Ledger</Text>
              </TouchableOpacity>
            </View>

            {activeTab === "Withdraw" && (
              <View style={styles.withdrawSection}>
                <CustomButton title="Request Bank Payout" onPress={() => setWithdrawModalVisible(true)} />
                <TouchableOpacity style={styles.bankLinkBtn} onPress={() => setBankModalVisible(true)}>
                  <Text style={styles.bankLinkText}>
                    {bankAccount ? "Modify Registered Payout Bank" : "Link bank credentials"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeTab === "Transactions" ? "Ledger entries log" : "Payout requests history"}
              </Text>
            </View>
          </>
        }
      />

      {/* 1. Withdraw Request Modal */}
      <Modal visible={withdrawModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Bank Withdrawal</Text>
            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              keyboardType="number-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder={`Available balance: ₹${balance}`}
              style={styles.inputField}
            />
            {withdrawLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setWithdrawModalVisible(false)}>
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

      {/* 2. Link/Edit Bank Account details Modal */}
      <Modal visible={bankModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { width: "90%" }]}>
            <Text style={styles.modalTitle}>Update Bank Credentials</Text>
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
            {bankLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setBankModalVisible(false)}>
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
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 12, marginTop: 12 },
  miniCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 12, marginHorizontal: 4, alignItems: "center", borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  miniLabel: { fontSize: 10, fontWeight: "700", color: Colors.textSecondary, marginBottom: 4 },
  miniValue: { fontSize: 14, fontWeight: "800", color: Colors.text },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  walletCard: { backgroundColor: Colors.primary, marginHorizontal: 16, borderRadius: 20, padding: 20, marginTop: 16, elevation: 1 },
  walletTop: { flexDirection: "row", justifyContent: "space-between" },
  balanceLabel: { color: Colors.white, fontSize: 12 },
  balance: { color: Colors.white, fontSize: 32, fontWeight: "800", marginTop: 8 },
  available: { color: Colors.white, fontSize: 11, marginTop: 4, opacity: 0.9 },
  tabContainer: { flexDirection: "row", backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8 },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { fontWeight: "700", color: Colors.textSecondary, fontSize: 12 },
  activeTabText: { color: Colors.white },
  withdrawSection: { paddingHorizontal: 16, paddingTop: 16 },
  bankLinkBtn: { alignItems: "center", marginTop: 12, padding: 8 },
  bankLinkText: { color: Colors.primary, fontWeight: "700", fontSize: 12 },
  sectionHeader: { marginTop: 20, marginHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary },
  listContainer: { paddingBottom: 120 },
  transactionCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  transactionTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  transactionDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  amount: { fontSize: 13, fontWeight: "800" },
  credit: { color: Colors.success },
  debit: { color: Colors.error },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.white, width: "85%", borderRadius: 20, padding: 24, alignItems: "center" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 16 },
  inputLabel: { fontSize: 12, color: Colors.textSecondary, alignSelf: "flex-start", marginBottom: 6 },
  inputField: { width: "100%", height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 13, color: Colors.text, marginBottom: 18 },
  modalBtnRow: { flexDirection: "row", width: "100%", justifyContent: "space-between" },
  cancelModalBtn: { width: "48%", height: 44, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, justifyContent: "center", alignItems: "center" },
  cancelModalText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 13 },
  confirmModalBtn: { width: "48%", height: 44, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  confirmModalText: { color: Colors.white, fontWeight: "700", fontSize: 13 }
});
