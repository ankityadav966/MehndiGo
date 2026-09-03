import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import moment from "moment";
import {
  getUserWallet,
  requestWithdrawal,
  getWithdrawalStatus,
  getBankAccountDetails,
  saveBankAccountDetails
} from "../../services/wallet";

export default function WithdrawEarningsScreen({ navigation }) {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [bankAccount, setBankAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Day & Pending Request State (Source of truth from backend)
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [dayInfo, setDayInfo] = useState({ allowed: false, currentDayName: "", message: "" });
  const [pendingRequest, setPendingRequest] = useState(null);

  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: ""
  });
  const [savingBank, setSavingBank] = useState(false);

  // Check IST Day locally as UX fallback while syncing with backend
  const checkLocalDayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const day = istDate.getUTCDay();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const allowed = day === 3 || day === 6; // Wed (3) or Sat (6)
    return {
      allowed,
      currentDayName: days[day],
      message: allowed
        ? `Withdrawals are open today (${days[day]}).`
        : "Withdrawals are available only on Wednesday and Saturday."
    };
  };

  const loadData = useCallback(async () => {
    try {
      const localDay = checkLocalDayIST();
      setIsWithdrawalOpen(localDay.allowed);
      setDayInfo(localDay);

      const [statusRes, walletRes, bankRes] = await Promise.all([
        getWithdrawalStatus().catch(() => null),
        getUserWallet().catch(() => ({ balance: 0 })),
        getBankAccountDetails().catch(() => null)
      ]);

      if (statusRes?.day_info) {
        setIsWithdrawalOpen(!!statusRes.is_withdrawal_open);
        setDayInfo(statusRes.day_info);
      }

      if (statusRes?.has_pending_request && statusRes?.pending_request) {
        setPendingRequest(statusRes.pending_request);
      } else {
        setPendingRequest(null);
      }

      const avail = Number(
        statusRes?.available_balance !== undefined
          ? statusRes.available_balance
          : walletRes?.available_balance !== undefined
          ? walletRes.available_balance
          : (walletRes?.balance || 0)
      );
      const pending = Number(
        statusRes?.pending_balance !== undefined
          ? statusRes.pending_balance
          : walletRes?.pending_balance || 0
      );
      const lifetime = Number(walletRes?.total_earnings || walletRes?.lifetime_earnings || 0);

      setBalance(avail);
      setPendingBalance(pending);
      setTotalEarnings(lifetime);

      const activeBank = statusRes?.bank_details || bankRes;
      setBankAccount(activeBank);
      if (activeBank) {
        setBankForm({
          accountHolderName: activeBank.account_holder_name || activeBank.accountHolderName || "",
          accountNumber: activeBank.account_number || activeBank.accountNumber || "",
          ifscCode: activeBank.ifsc_code || activeBank.ifscCode || "",
          bankName: activeBank.bank_name || activeBank.bankName || "",
          upiId: activeBank.upi_id || activeBank.upiId || ""
        });
      }
    } catch (err) {
      if (__DEV__) console.log("Error loading payout data:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveBank = async () => {
    const { accountHolderName, accountNumber, ifscCode, bankName } = bankForm;
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      Alert.alert("Required Fields", "Please provide Account Name, Account Number, IFSC, and Bank Name.");
      return;
    }
    setSavingBank(true);
    try {
      await saveBankAccountDetails(bankForm);
      Alert.alert("Bank Linked", "Your bank account has been saved and verified successfully.");
      setShowBankForm(false);
      loadData();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save bank details.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleWithdraw = async () => {
    // 1. Day of Week Check
    if (!isWithdrawalOpen) {
      Alert.alert(
        "Withdrawal Not Available Today",
        "Withdrawals are available only on Wednesday and Saturday. Please submit your request on the upcoming payout day."
      );
      return;
    }

    // 2. Single Pending Request Guard
    if (pendingRequest) {
      Alert.alert(
        "Pending Request Active",
        "You already have a pending withdrawal request. Please wait until it is processed by administration."
      );
      return;
    }

    // 3. Bank Account Validation
    if (!bankAccount || (!bankAccount.account_number && !bankAccount.accountNumber) || !bankAccount.account_holder_name) {
      Alert.alert("Bank Details Required", "Please add and verify your bank details before requesting withdrawal.");
      setShowBankForm(true);
      return;
    }

    // 4. Amount Validation
    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount to withdraw.");
      return;
    }
    if (amt < 100) {
      Alert.alert("Minimum Limit", "Minimum payout request amount is ₹100.");
      return;
    }
    if (amt > balance) {
      Alert.alert("Insufficient Balance", `You only have ₹${balance.toLocaleString("en-IN")} available in your withdrawable online escrow balance.`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await requestWithdrawal(amt);
      if (__DEV__) console.log("[PAYOUT_SUBMITTED]", response);
      Alert.alert(
        "Withdrawal Request Submitted 🎉",
        `Your payout request of ₹${amt.toLocaleString("en-IN")} has been submitted for admin manual verification & bank settlement.`
      );
      setAmount("");
      loadData();
    } catch (err) {
      console.error("Payout request error:", err);
      Alert.alert("Withdrawal Request Failed", err.message || "Failed to process withdrawal request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = useCallback(() => {
    if (showBankForm) {
      setShowBankForm(false);
      return true;
    }
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("ArtistTabs", { screen: "Wallet" });
    }
    return true;
  }, [showBankForm, navigation]);

  useEffect(() => {
    const { BackHandler } = require("react-native");
    const backSub = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => backSub.remove();
  }, [handleBack]);

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Withdraw Earnings</Text>
            <View style={styles.placeholder} />
          </View>

          {/* 1. Day of Week Restriction Banner */}
          {isWithdrawalOpen ? (
            <View style={styles.dayBannerOpen}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.dayBannerOpenTitle}>Withdrawals are OPEN Today ({dayInfo.currentDayName || "Wed/Sat"})</Text>
                <Text style={styles.dayBannerOpenSub}>Payout requests submitted today will be processed to your linked bank account.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.dayBannerClosed}>
              <Ionicons name="time" size={18} color="#D97706" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.dayBannerClosedTitle}>Withdrawals Available: Wednesday & Saturday</Text>
                <Text style={styles.dayBannerClosedSub}>Today is {dayInfo.currentDayName || "not a payout day"}. Payout requests are strictly accepted on Wednesday and Saturday only.</Text>
              </View>
            </View>
          )}

          {/* 2. Active Pending Request Live Tracker Card */}
          {pendingRequest && (
            <View style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>⏳ PENDING ADMIN PAYOUT</Text>
                </View>
                <Text style={styles.pendingDate}>
                  {moment(pendingRequest.requested_at).format("DD MMM, hh:mm A")}
                </Text>
              </View>

              <Text style={styles.pendingAmount}>
                ₹{Number(pendingRequest.amount).toLocaleString("en-IN")}
              </Text>
              <Text style={styles.pendingRef}>Reference: {pendingRequest.reference_id}</Text>

              <View style={styles.pendingDivider} />

              <View style={styles.pendingBankRow}>
                <Ionicons name="business" size={16} color="#0284C7" />
                <Text style={styles.pendingBankText}>
                  {pendingRequest.bank_name || "Linked Bank"} ({pendingRequest.account_number_masked || "••••"})
                </Text>
              </View>

              <View style={styles.pendingNoticeBox}>
                <Ionicons name="information-circle" size={16} color="#0369A1" />
                <Text style={styles.pendingNoticeText}>
                  You already have an active pending withdrawal request. Funds are safely held in your pending balance. Once administration completes the bank transfer, this request will be marked as settled.
                </Text>
              </View>
            </View>
          )}

          {/* 3. Balance Overview Card */}
          <View style={styles.balanceCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="shield-checkmark" size={16} color="#34D399" style={{ marginRight: 5 }} />
              <Text style={styles.balanceLabel}>Available Withdrawable Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>₹{balance.toLocaleString("en-IN")}</Text>
            
            <View style={styles.balanceStatsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Held in Payouts</Text>
                <Text style={styles.statBoxValue}>₹{pendingBalance.toLocaleString("en-IN")}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Lifetime Earned</Text>
                <Text style={styles.statBoxValue}>₹{totalEarnings.toLocaleString("en-IN")}</Text>
              </View>
            </View>

            <Text style={styles.balanceSubtitle}>
              • Only online customer payments (held in escrow) can be withdrawn to bank. Direct cash is collected in-hand.
            </Text>
          </View>

          {/* 4. Enter Amount Section (Visible only when no pending request is active) */}
          {!pendingRequest ? (
            <View style={styles.section}>
              <Text style={styles.label}>Enter Withdrawal Amount (₹)</Text>
              <View style={[styles.inputWrapper, !isWithdrawalOpen && { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" }]}>
                <Text style={[styles.currencyPrefix, !isWithdrawalOpen && { color: "#94A3B8" }]}>₹</Text>
                <TextInput
                  placeholder={isWithdrawalOpen ? "e.g. 500" : "Withdrawals open Wed & Sat"}
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  editable={isWithdrawalOpen}
                  style={[styles.input, !isWithdrawalOpen && { color: "#94A3B8" }]}
                />
                {isWithdrawalOpen && balance > 0 && (
                  <TouchableOpacity
                    style={styles.maxBtn}
                    onPress={() => setAmount(String(balance))}
                  >
                    <Text style={styles.maxBtnText}>MAX</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Amount Chips */}
              {isWithdrawalOpen && (
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
              )}
            </View>
          ) : null}

          {/* 5. Bank Account Section */}
          <View style={styles.section}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={styles.label}>Verified Bank Account</Text>
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
                    A/C: ****{String(bankAccount.account_number || bankAccount.accountNumber || "").slice(-4)} • {bankAccount.ifsc_code || bankAccount.ifscCode || "IFSC"}
                  </Text>
                  <Text style={styles.bankHolder}>Beneficiary: {bankAccount.account_holder_name || bankAccount.accountHolderName || "Artist"}</Text>
                  {!!(bankAccount.upi_id || bankAccount.upiId) && (
                    <Text style={[styles.bankHolder, { color: "#0284C7", marginTop: 2 }]}>
                      UPI: {bankAccount.upi_id || bankAccount.upiId}
                    </Text>
                  )}
                </View>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              </View>
            ) : showBankForm ? (
              <View style={styles.bankFormCard}>
                <Text style={styles.formTitle}>Link & Verify Bank Details</Text>
                
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
                <TextInput
                  placeholder="UPI ID (Optional, e.g. artist@upi)"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="none"
                  value={bankForm.upiId}
                  onChangeText={(v) => setBankForm({ ...bankForm, upiId: v })}
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
                    <Text style={styles.saveBankText}>Save & Verify Bank Details</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBankPrompt}
                onPress={() => setShowBankForm(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                <Text style={styles.addBankPromptText}>Please add and verify your bank details before requesting withdrawal.</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 6. Security & Policy Information */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#166534" />
              <Text style={styles.infoText}>Withdrawals are open strictly every Wednesday & Saturday.</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#166534" />
              <Text style={styles.infoText}>Manual admin verification ensures 100% verified settlement with 0% hidden deductions.</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="lock-closed-outline" size={16} color="#166534" />
              <Text style={styles.infoText}>One pending request allowed at a time for accounting accuracy.</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Action */}
        {!pendingRequest && (
          <View style={styles.footer}>
            <CustomButton
              title={
                !isWithdrawalOpen
                  ? "Withdrawals Open Wed & Sat Only"
                  : submitting
                  ? "Submitting Request..."
                  : `Request Withdrawal ₹${amount || "0"}`
              }
              onPress={handleWithdraw}
              disabled={submitting || !isWithdrawalOpen || !amount || Number(amount) <= 0 || !bankAccount}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 140 },
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

  // Day Banners
  dayBannerOpen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14
  },
  dayBannerOpenTitle: { fontSize: 13, fontWeight: "800", color: "#065F46" },
  dayBannerOpenSub: { fontSize: 11, color: "#047857", marginTop: 2 },

  dayBannerClosed: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14
  },
  dayBannerClosedTitle: { fontSize: 13, fontWeight: "800", color: "#92400E" },
  dayBannerClosedSub: { fontSize: 11, color: "#B45309", marginTop: 2 },

  // Active Pending Card
  pendingCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  },
  pendingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pendingBadge: { backgroundColor: "#E0F2FE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pendingBadgeText: { fontSize: 11, fontWeight: "800", color: "#0369A1" },
  pendingDate: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },
  pendingAmount: { fontSize: 26, fontWeight: "900", color: "#0369A1", marginTop: 10 },
  pendingRef: { fontSize: 12, color: Colors.textTertiary, marginTop: 2, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  pendingDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  pendingBankRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pendingBankText: { fontSize: 13, fontWeight: "700", color: Colors.text },
  pendingNoticeBox: { flexDirection: "row", gap: 8, backgroundColor: "#F0F9FF", padding: 10, borderRadius: 10, marginTop: 10 },
  pendingNoticeText: { fontSize: 11, color: "#0369A1", flex: 1, lineHeight: 16 },

  // Balance Card
  balanceCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#831843",
    borderRadius: 20,
    padding: 20,
    elevation: 4
  },
  balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  balanceAmount: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", marginVertical: 6 },
  balanceStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10
  },
  statBox: { flex: 1, alignItems: "center" },
  statBoxLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  statBoxValue: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.2)" },
  balanceSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2, lineHeight: 16 },

  section: { marginHorizontal: 16, marginTop: 18 },
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
  input: { flex: 1, fontSize: 18, fontWeight: "800", color: Colors.text },
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
    padding: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  addBankPromptText: { marginTop: 6, fontSize: 12, fontWeight: "700", color: Colors.primary, textAlign: "center" },

  bankFormCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  formTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  formInput: { height: 48, backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, fontSize: 14, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 10 },
  saveBankBtn: { backgroundColor: Colors.primary, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 4 },
  saveBankText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  infoSection: { marginHorizontal: 16, marginTop: 18, backgroundColor: "#F0FDF4", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#DCFCE7", gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { fontSize: 11, color: "#166534", flex: 1, lineHeight: 16 },

  footer: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2E8F0" }
});
