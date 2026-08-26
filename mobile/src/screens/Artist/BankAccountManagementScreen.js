import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import apiRequest from "../../services/api";

const PRIMARY = "#FF4D6D";

export default function BankAccountManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [bankAccount, setBankAccount] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");

  const fetchBankAccount = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("GET", "/bank-account", null, true);
      const data = res?.data || res;
      if (data && (data.account_number || data.accountNumber || data.upi_id || data.upiId)) {
        setBankAccount(data);
      } else {
        setBankAccount(null);
      }
    } catch (err) {
      console.warn("[BankAccountManagementScreen] Error fetching bank account:", err.message);
      setBankAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccount();
  }, []);

  const handleSaveBankAccount = async () => {
    if (!accountNumber && !upiId) {
      Alert.alert("Validation Error", "Please provide either an Account Number or a UPI ID.");
      return;
    }
    if (accountNumber && (!ifscCode || !holderName)) {
      Alert.alert("Validation Error", "Please provide Account Holder Name and IFSC Code for bank account.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        accountHolderName: holderName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        bankName: bankName.trim(),
        upiId: upiId.trim()
      };
      await apiRequest("POST", "/bank-account", payload, true);
      Alert.alert("Success", "Bank account details saved successfully.");
      setShowAddForm(false);
      await fetchBankAccount();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save bank account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bank & Payout Details</Text>
            <View style={styles.empty} />
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : bankAccount ? (
            <View style={styles.bankCard}>
              <View style={styles.bankCardHeader}>
                <View style={styles.bankIcon}>
                  <Ionicons name="business-outline" size={24} color={PRIMARY} />
                </View>
                <View style={styles.bankInfo}>
                  <Text style={styles.bankName}>{bankAccount.bank_name || bankAccount.bankName || "Linked Bank Account"}</Text>
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Active</Text>
                  </View>
                </View>
              </View>

              {bankAccount.account_number || bankAccount.accountNumber ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Number</Text>
                    <Text style={styles.detailValue}>
                      •••• •••• {String(bankAccount.account_number || bankAccount.accountNumber).slice(-4)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>IFSC Code</Text>
                    <Text style={styles.detailValue}>{bankAccount.ifsc_code || bankAccount.ifscCode || "N/A"}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Holder</Text>
                    <Text style={styles.detailValue}>{bankAccount.account_holder_name || bankAccount.accountHolderName || "N/A"}</Text>
                  </View>
                </>
              ) : null}

              {bankAccount.upi_id || bankAccount.upiId ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UPI ID</Text>
                  <Text style={styles.detailValue}>{bankAccount.upi_id || bankAccount.upiId}</Text>
                </View>
              ) : null}

              <View style={styles.bankCardActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setHolderName(bankAccount.account_holder_name || bankAccount.accountHolderName || "");
                    setBankName(bankAccount.bank_name || bankAccount.bankName || "");
                    setIfscCode(bankAccount.ifsc_code || bankAccount.ifscCode || "");
                    setUpiId(bankAccount.upi_id || bankAccount.upiId || "");
                    setShowAddForm(true);
                  }}
                >
                  <Ionicons name="create-outline" size={18} color={PRIMARY} />
                  <Text style={[styles.actionText, { color: PRIMARY }]}>Edit Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="card-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Bank Account Linked</Text>
              <Text style={styles.emptySubtitle}>
                Link your bank account or UPI ID to receive direct withdrawal payouts for completed customer bookings.
              </Text>
            </View>
          )}

          {showAddForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add / Update Bank Account</Text>

              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                value={holderName}
                onChangeText={setHolderName}
              />

              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. State Bank of India"
                value={bankName}
                onChangeText={setBankName}
              />

              <Text style={styles.inputLabel}>Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 123456789012"
                keyboardType="number-pad"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />

              <Text style={styles.inputLabel}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SBIN0001234"
                autoCapitalize="characters"
                value={ifscCode}
                onChangeText={setIfscCode}
              />

              <Text style={styles.inputLabel}>UPI ID (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. rahul@upi"
                autoCapitalize="none"
                value={upiId}
                onChangeText={setUpiId}
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowAddForm(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveBankAccount}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addCard}
              onPress={() => {
                setHolderName("");
                setAccountNumber("");
                setIfscCode("");
                setBankName("");
                setUpiId("");
                setShowAddForm(true);
              }}
            >
              <Ionicons name="add" size={24} color={PRIMARY} />
              <Text style={styles.addCardText}>
                {bankAccount ? "Update Bank Account" : "Add Bank Account"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  empty: { width: 40 },
  centerContainer: { padding: 40, alignItems: "center" },
  bankCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  bankCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  bankIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FFF1F7",
    justifyContent: "center",
    alignItems: "center",
  },
  bankInfo: { marginLeft: 14, flexDirection: "row", alignItems: "center", flex: 1 },
  bankName: { fontSize: 16, fontWeight: "700", color: "#111" },
  defaultBadge: {
    marginLeft: 10,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: "700", color: "#059669" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  detailLabel: { fontSize: 13, color: "#6B7280" },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#111" },
  bankCardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
    paddingTop: 10,
  },
  actionBtn: { flexDirection: "row", alignItems: "center" },
  actionText: { fontSize: 13, fontWeight: "600", marginLeft: 6 },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 6, lineHeight: 18 },
  addCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: PRIMARY,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
  },
  addCardText: { fontSize: 14, fontWeight: "600", color: PRIMARY, marginLeft: 8 },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#4B5563", marginBottom: 6, marginTop: 10 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#F9FAFB",
  },
  formActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20, gap: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, justifyContent: "center" },
  cancelBtnText: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
  saveBtn: { backgroundColor: PRIMARY, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, justifyContent: "center" },
  saveBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
