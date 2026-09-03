import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { adminService } from '../../services/admin';
import {
  Check,
  X,
  Copy,
  Building,
  CreditCard,
  User,
  Phone,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Search,
  ArrowLeft
} from 'lucide-react-native';
import { router } from 'expo-router';

export default function AdminWithdrawals() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Approve / Mark Paid Modal
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approveItem, setApproveItem] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [approving, setApproving] = useState(false);

  // Reject Modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const data = await adminService.getWithdrawals("all");
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load admin withdrawals:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWithdrawals();
  };

  const copyToClipboard = async (text, label) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    Alert.alert("Copied", `${label} (${text}) copied to clipboard.`);
  };

  const openApproveModal = (item) => {
    setApproveItem(item);
    setUtrNumber("");
    setApproveModalVisible(true);
  };

  const handleApprove = async () => {
    if (!utrNumber.trim()) {
      Alert.alert("Required", "Please enter Bank Transfer Reference / UTR number for accounting.");
      return;
    }
    setApproving(true);
    try {
      await adminService.approveWithdrawal(approveItem.id, {
        payout_reference: utrNumber.trim()
      });
      Alert.alert("Payout Settled 🎉", `Withdrawal request #${approveItem.id} marked as completed.`);
      setApproveModalVisible(false);
      fetchWithdrawals();
    } catch (e) {
      Alert.alert("Approval Failed", e.message || "Could not complete payout approval.");
    } finally {
      setApproving(false);
    }
  };

  const openRejectModal = (item) => {
    setRejectItem(item);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Required", "Please provide a reason for rejecting this payout request.");
      return;
    }
    setRejecting(true);
    try {
      await adminService.rejectWithdrawal(rejectItem.id, rejectReason.trim());
      Alert.alert("Request Rejected", `Withdrawal #${rejectItem.id} rejected and funds restored to artist's available balance.`);
      setRejectModalVisible(false);
      fetchWithdrawals();
    } catch (e) {
      Alert.alert("Rejection Failed", e.message || "Could not reject withdrawal request.");
    } finally {
      setRejecting(false);
    }
  };

  const filteredList = withdrawals.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    let matchesStatus = true;
    if (activeFilter === "pending") {
      matchesStatus = status === "pending";
    } else if (activeFilter === "completed") {
      matchesStatus = status === "completed" || status === "approved" || status === "paid" || status === "success";
    } else if (activeFilter === "failed") {
      matchesStatus = status === "failed" || status === "rejected";
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesSearch =
      (item.artist_name && item.artist_name.toLowerCase().includes(q)) ||
      (item.artist_phone && item.artist_phone.includes(q)) ||
      (item.account_number && item.account_number.includes(q)) ||
      (item.reference_id && item.reference_id.toLowerCase().includes(q)) ||
      (item.ifsc_code && item.ifsc_code.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const pendingCount = withdrawals.filter(
    (w) => String(w.status || "").toLowerCase() === "pending"
  ).length;

  const renderCard = ({ item }) => {
    const statusLower = String(item.status || "pending").toLowerCase();
    const isPending = statusLower === "pending";
    const isCompleted = statusLower === "completed" || statusLower === "paid" || statusLower === "success";
    const isFailed = statusLower === "failed" || statusLower === "rejected";

    return (
      <View style={[localStyles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.borderColor }]}>
        {/* Top Header */}
        <View style={localStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[localStyles.artistName, { color: colors.textPrimary }]}>{item.artist_name || "Artist"}</Text>
              {item.kyc_status === "APPROVED" && (
                <ShieldCheck size={14} color={colors.success} />
              )}
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              {item.artist_phone ? `📞 ${item.artist_phone}` : "No Phone"} • Ref: {item.reference_id}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[localStyles.amount, { color: colors.accent }]}>
              ₹{Number(item.amount).toLocaleString("en-IN")}
            </Text>
            <View
              style={[
                localStyles.statusBadge,
                isPending && { backgroundColor: "#FEF3C7" },
                isCompleted && { backgroundColor: "#DCFCE7" },
                isFailed && { backgroundColor: "#FEE2E2" }
              ]}
            >
              <Text
                style={[
                  localStyles.statusBadgeText,
                  isPending && { color: "#B45309" },
                  isCompleted && { color: "#15803D" },
                  isFailed && { color: "#B91C1C" }
                ]}
              >
                {isPending ? "PENDING PAYOUT" : isCompleted ? "PAID / SETTLED" : "REJECTED"}
              </Text>
            </View>
          </View>
        </View>

        {/* Bank & Beneficiary Details Box */}
        <View style={[localStyles.bankBox, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor }]}>
          <View style={localStyles.bankRow}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[localStyles.bankKey, { color: colors.textSecondary }]}>Account Holder:</Text>
            <Text style={[localStyles.bankVal, { color: colors.textPrimary }]}>
              {item.account_holder_name || item.artist_name || "Artist"}
            </Text>
          </View>

          <View style={localStyles.bankRow}>
            <Building size={14} color={colors.textSecondary} />
            <Text style={[localStyles.bankKey, { color: colors.textSecondary }]}>Bank Name:</Text>
            <Text style={[localStyles.bankVal, { color: colors.textPrimary }]}>
              {item.bank_name || "Bank Transfer"}
            </Text>
          </View>

          <View style={localStyles.bankRow}>
            <CreditCard size={14} color={colors.textSecondary} />
            <Text style={[localStyles.bankKey, { color: colors.textSecondary }]}>A/C Number:</Text>
            <Text style={[localStyles.bankVal, { color: colors.accent, fontWeight: '700' }]}>
              {item.account_number || item.account_number_masked || "N/A"}
            </Text>
            {!!item.account_number && (
              <TouchableOpacity onPress={() => copyToClipboard(item.account_number, "Account Number")}>
                <Copy size={14} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>

          <View style={localStyles.bankRow}>
            <Building size={14} color={colors.textSecondary} />
            <Text style={[localStyles.bankKey, { color: colors.textSecondary }]}>IFSC Code:</Text>
            <Text style={[localStyles.bankVal, { color: colors.textPrimary, fontWeight: '700' }]}>
              {item.ifsc_code || "N/A"}
            </Text>
            {!!item.ifsc_code && (
              <TouchableOpacity onPress={() => copyToClipboard(item.ifsc_code, "IFSC Code")}>
                <Copy size={14} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>

          {!!item.upi_id && (
            <View style={localStyles.bankRow}>
              <CreditCard size={14} color={colors.textSecondary} />
              <Text style={[localStyles.bankKey, { color: colors.textSecondary }]}>UPI ID:</Text>
              <Text style={[localStyles.bankVal, { color: "#0284C7", fontWeight: '700' }]}>
                {item.upi_id}
              </Text>
              <TouchableOpacity onPress={() => copyToClipboard(item.upi_id, "UPI ID")}>
                <Copy size={14} color="#0284C7" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Date & Additional Status Info */}
        <View style={localStyles.metaRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              Requested: {new Date(item.requested_at || item.created_at).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          </View>

          {isFailed && item.rejection_reason && (
            <Text style={{ fontSize: 11, color: colors.danger, marginTop: 4 }}>
              Reason: {item.rejection_reason}
            </Text>
          )}
        </View>

        {/* Action Buttons for Pending Requests */}
        {isPending && (
          <View style={localStyles.actionRow}>
            <TouchableOpacity
              style={[localStyles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => openApproveModal(item)}
            >
              <Check size={16} color="#fff" />
              <Text style={localStyles.actionBtnText}>Approve & Mark Paid</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[localStyles.actionBtn, { backgroundColor: colors.danger }]}
              onPress={() => openRejectModal(item)}
            >
              <X size={16} color="#fff" />
              <Text style={localStyles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { padding: 16 }]}>
      {/* Top Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { marginBottom: 2, fontSize: 20 }]}>Artist Payouts & Withdrawals</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Manual bank transfer verification and settlement
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {[
          { key: "pending", label: `Pending (${pendingCount})` },
          { key: "completed", label: "Paid" },
          { key: "failed", label: "Rejected" },
          { key: "all", label: "All" }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              localStyles.tab,
              { backgroundColor: colors.bgSecondary, borderColor: colors.borderColor },
              activeFilter === tab.key && { backgroundColor: colors.accent, borderColor: colors.accent }
            ]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text
              style={[
                localStyles.tabText,
                { color: colors.textSecondary },
                activeFilter === tab.key && { color: '#fff', fontWeight: '800' }
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View style={[localStyles.searchBar, { backgroundColor: colors.bgSecondary, borderColor: colors.borderColor }]}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          placeholder="Search by artist name, phone, IFSC, A/C..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[localStyles.searchInput, { color: colors.textPrimary }]}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <AlertCircle size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                No {activeFilter} withdrawal requests found.
              </Text>
            </View>
          }
        />
      )}

      {/* Approve / Mark Paid Modal */}
      <Modal visible={approveModalVisible} transparent animationType="fade">
        <View style={localStyles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[localStyles.modalContent, { backgroundColor: colors.bgSecondary, borderColor: colors.borderColor }]}
          >
            <Text style={[localStyles.modalTitle, { color: colors.textPrimary }]}>
              Approve Bank Payout (₹{approveItem ? Number(approveItem.amount).toLocaleString("en-IN") : "0"})
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
              Beneficiary: {approveItem?.account_holder_name || approveItem?.artist_name} ({approveItem?.bank_name})
            </Text>

            <Text style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
              Enter Bank UTR / Transfer Reference ID *
            </Text>
            <TextInput
              placeholder="e.g. UTR123456789 / IMPS987654"
              placeholderTextColor={colors.textSecondary}
              value={utrNumber}
              onChangeText={setUtrNumber}
              style={[localStyles.modalInput, { backgroundColor: colors.bgPrimary, color: colors.textPrimary, borderColor: colors.borderColor }]}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.btnSecondary, { flex: 1 }]}
                onPress={() => setApproveModalVisible(false)}
                disabled={approving}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.success }]}
                onPress={handleApprove}
                disabled={approving}
              >
                {approving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Confirm Paid</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={localStyles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[localStyles.modalContent, { backgroundColor: colors.bgSecondary, borderColor: colors.borderColor }]}
          >
            <Text style={[localStyles.modalTitle, { color: colors.danger }]}>
              Reject Withdrawal Request
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
              Amount ₹{rejectItem ? Number(rejectItem.amount).toLocaleString("en-IN") : "0"} will be automatically refunded back to the artist's available balance.
            </Text>

            <Text style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
              Rejection Reason *
            </Text>
            <TextInput
              placeholder="e.g. Incorrect bank account number or IFSC code"
              placeholderTextColor={colors.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              style={[
                localStyles.modalInput,
                { backgroundColor: colors.bgPrimary, color: colors.textPrimary, borderColor: colors.borderColor, height: 75 }
              ]}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.btnSecondary, { flex: 1 }]}
                onPress={() => setRejectModalVisible(false)}
                disabled={rejecting}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.danger }]}
                onPress={handleReject}
                disabled={rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Confirm Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  artistName: {
    fontSize: 16,
    fontWeight: '800'
  },
  amount: {
    fontSize: 18,
    fontWeight: '900'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  bankBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
    gap: 6
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  bankKey: {
    fontSize: 12,
    fontWeight: '600'
  },
  bankVal: {
    fontSize: 12,
    flex: 1
  },
  metaRow: {
    marginBottom: 10
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6
  },
  modalInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14
  }
});
