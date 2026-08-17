import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
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
import CustomButton from "../../components/CustomButton";
import {
  getUserWallet,
  requestWithdrawal,
  getBankAccountDetails,
  saveBankAccountDetails
} from "../../services/wallet";

export default function WithdrawEarningsScreen({ navigation }) {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [bankAccount, setBankAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: ""
  });
  const [savingBank, setSavingBank] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [walletRes, bankRes] = await Promise.all([
        getUserWallet().catch(() => ({ balance: 0 })),
        getBankAccountDetails().catch(() => null)
      ]);
      setBalance(Number(walletRes?.balance || 0));
      setBankAccount(bankRes);
      if (bankRes) {
        setBankForm({
          accountHolderName: bankRes.account_holder_name || "",
          accountNumber: bankRes.account_number || "",
          ifscCode: bankRes.ifsc_code || "",
          bankName: bankRes.bank_name || "",
          upiId: bankRes.upi_id || ""
        });
      }
    } catch (err) {
      console.log("Error loading payout data:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveBank = async () => {
    const { accountHolderName, accountNumber, ifscCode, bankName } = bankForm;
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      Alert.alert("Required Fields", "Please provide Account Name, Account Number, IFSC, and Bank Name.");
      return;
    }
    setSavingBank(true);
    try {
      await saveBankAccountDetails(bankForm);
      Alert.alert("Bank Linked", "Your bank account has been saved successfully.");
      setShowBankForm(false);
      loadData();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save bank details.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount to withdraw.");
      return;
    }
    if (amt > balance) {
      Alert.alert("Insufficient Balance", `You only have ₹${balance.toLocaleString("en-IN")} available for payout.`);
      return;
    }
    if (amt < 100) {
      Alert.alert("Minimum Limit", "Minimum payout request amount is ₹100.");
      return;
    }
    if (!bankAccount) {
      Alert.alert("Bank Account Required", "Please link your bank account first to receive payouts.");
      setShowBankForm(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await requestWithdrawal(amt);
      console.log("[PAYOUT_SUCCESS]", response);
      if (navigation.navigate) {
        navigation.navigate("WithdrawalSuccessScreen", {
          amount: amt,
          bankName: bankAccount.bank_name || "Bank Account",
          accountNumber: bankAccount.account_number ? `****${String(bankAccount.account_number).slice(-4)}` : "Direct Transfer"
        });
      } else {
        Alert.alert("Payout Submitted 🎉", `₹${amt} transfer request has been submitted to your bank.`);
        setAmount("");
        loadData();
      }
    } catch (err) {
      console.error("Payout request error:", err);
      Alert.alert("Payout Request Failed", err.message || "Failed to process withdrawal request.");
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [500, 1000, 2000, 5000];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Withdraw Earnings</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available for Payout</Text>
          <Text style={styles.balanceAmount}>₹{balance.toLocaleString("en-IN")}</Text>
          <Text style={styles.balanceSubtitle}>Instant transfer via Razorpay Payouts</Text>
        </View>

        {/* Enter Amount Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Enter Withdrawal Amount (₹)</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              placeholder="e.g. 1500"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
            />
            {balance > 0 && (
              <TouchableOpacity
                style={styles.maxBtn}
                onPress={() => setAmount(String(balance))}
              >
                <Text style={styles.maxBtnText}>MAX</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Amount Chips */}
          <View style={styles.chipsRow}>
            {quickAmounts.map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.chip, amount === String(val) && styles.activeChip]}
                onPress={() => setAmount(String(val))}
              >
                <Text style={[styles.chipText, amount === String(val) && styles.activeChipText]}>
                  ₹{val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bank Account Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={styles.label}>Receiving Bank Account</Text>
            <TouchableOpacity onPress={() => setShowBankForm(!showBankForm)}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.primary }}>
                {showBankForm ? "Cancel" : bankAccount ? "Change Bank" : "+ Add Bank"}
              </Text>
            </TouchableOpacity>
          </View>

          {bankAccount && !showBankForm ? (
            <View style={styles.bankCard}>
              <View style={styles.bankIconCircle}>
                <Ionicons name="business" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.bankName}>{bankAccount.bank_name || "Bank Account"}</Text>
                <Text style={styles.bankNumber}>
                  A/C: ****{String(bankAccount.account_number || "").slice(-4)} • {bankAccount.ifsc_code || "IFSC"}
                </Text>
                <Text style={styles.bankHolder}>Beneficiary: {bankAccount.account_holder_name || "Artist"}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          ) : showBankForm ? (
            <View style={styles.bankFormCard}>
              <Text style={styles.formTitle}>Link Bank Account</Text>
              
              <TextInput
                placeholder="Account Holder Full Name"
                placeholderTextColor={Colors.textTertiary}
                value={bankForm.accountHolderName}
                onChangeText={(v) => setBankForm({ ...bankForm, accountHolderName: v })}
                style={styles.formInput}
              />
              <TextInput
                placeholder="Bank Account Number"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={bankForm.accountNumber}
                onChangeText={(v) => setBankForm({ ...bankForm, accountNumber: v })}
                style={styles.formInput}
              />
              <TextInput
                placeholder="IFSC Code (e.g. HDFC0001234)"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="characters"
                value={bankForm.ifscCode}
                onChangeText={(v) => setBankForm({ ...bankForm, ifscCode: v.toUpperCase() })}
                style={styles.formInput}
              />
              <TextInput
                placeholder="Bank Name (e.g. HDFC Bank, SBI)"
                placeholderTextColor={Colors.textTertiary}
                value={bankForm.bankName}
                onChangeText={(v) => setBankForm({ ...bankForm, bankName: v })}
                style={styles.formInput}
              />

              <TouchableOpacity
                style={styles.saveBankBtn}
                onPress={handleSaveBank}
                disabled={savingBank}
              >
                {savingBank ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBankText}>Save Bank Account</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBankPrompt}
              onPress={() => setShowBankForm(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
              <Text style={styles.addBankPromptText}>Please link a bank account to receive payout</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security & Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="flash-outline" size={16} color="#059669" />
            <Text style={styles.infoText}>Payouts processed via IMPS/NEFT with zero platform deductions.</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
            <Text style={styles.infoText}>100% secure 256-bit bank encrypted transfer.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={submitting ? "Processing Transfer..." : `Withdraw ₹${amount || "0"}`}
          onPress={handleWithdraw}
          disabled={submitting || !amount || Number(amount) <= 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 30 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9"
  },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  placeholder: { width: 40 },
  
  balanceCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#831843",
    borderRadius: 20,
    padding: 22,
    elevation: 4
  },
  balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  balanceAmount: { fontSize: 32, fontWeight: "800", color: "#FFFFFF", marginVertical: 6 },
  balanceSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.75)" },

  section: { marginHorizontal: 16, marginTop: 20 },
  label: { fontSize: 14, fontWeight: "700", color: Colors.text },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    height: 56,
    marginTop: 8
  },
  currencyPrefix: { fontSize: 22, fontWeight: "800", color: Colors.primary, marginRight: 8 },
  input: { flex: 1, fontSize: 20, fontWeight: "800", color: Colors.text },
  maxBtn: { backgroundColor: "#FDF2F8", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#FBCFE8" },
  maxBtnText: { color: Colors.primary, fontWeight: "800", fontSize: 11 },

  chipsRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  chip: { flex: 1, backgroundColor: "#FFFFFF", paddingVertical: 10, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  activeChip: { backgroundColor: "#FDF2F8", borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: Colors.text },
  activeChipText: { color: Colors.primary },

  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  bankIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FDF2F8", justifyContent: "center", alignItems: "center" },
  bankName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  bankNumber: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  bankHolder: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },

  addBankPrompt: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  addBankPromptText: { marginTop: 6, fontSize: 13, fontWeight: "700", color: Colors.primary },

  bankFormCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  formTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  formInput: { height: 48, backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, fontSize: 14, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 10 },
  saveBankBtn: { backgroundColor: Colors.primary, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 4 },
  saveBankText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  infoSection: { marginHorizontal: 16, marginTop: 20, backgroundColor: "#F0FDF4", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#DCFCE7", gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 11, color: "#166534", flex: 1 },

  footer: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2E8F0" }
});
