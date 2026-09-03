import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getWalletTransactions } from "../../services/customer";
import { formatDateTime } from "../../utils/date";

export default function WalletScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      const txRes = await getWalletTransactions().catch(() => []);
      setTransactions(Array.isArray(txRes) ? txRes : []);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  // Load data on focus — no loading spinner, renders immediately
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // Filter transactions by tab
  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === "ALL") return true;
    const isCredit =
      t.type === "CREDIT" ||
      t.type === "credit" ||
      t.type === "recharge" ||
      t.type === "cashback" ||
      t.type === "refund";
    if (activeTab === "CREDIT") return isCredit;
    if (activeTab === "DEBIT") return !isCredit;
    return true;
  });

  const renderTransactionItem = ({ item }) => {
    const isCredit =
      item.type === "CREDIT" ||
      item.type === "credit" ||
      item.type === "recharge" ||
      item.type === "cashback" ||
      item.type === "refund";
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
        onPress={() => setSelectedTx(item)}
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
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === "completed" || item.status === "COMPLETED" || !item.status
                    ? "#EBF7EE"
                    : "#FDE8E8",
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color:
                    item.status === "completed" || item.status === "COMPLETED" || !item.status
                      ? Colors.success
                      : Colors.error,
                },
              ]}
            >
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
          onPress={() => navigation?.goBack?.()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.headerIconBtn} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: "ALL", label: "All" },
          { key: "CREDIT", label: "Money Added" },
          { key: "DEBIT", label: "Spent" },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabBtn, activeTab === key && styles.activeTabBtn]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabBtnText, activeTab === key && styles.activeTabBtnText]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.txCount}>{filteredTransactions.length} records</Text>
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `tx-${index}`)}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
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

      {/* Transaction Detail Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            {selectedTx && (
              <>
                <View style={styles.txDetailHeader}>
                  <View
                    style={[
                      styles.txDetailIconCircle,
                      {
                        backgroundColor:
                          selectedTx.type === "CREDIT" || selectedTx.type === "credit"
                            ? "#E8F8EE"
                            : "#FEECEE",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        selectedTx.type === "CREDIT" || selectedTx.type === "credit"
                          ? "arrow-down-circle"
                          : "arrow-up-circle"
                      }
                      size={32}
                      color={
                        selectedTx.type === "CREDIT" || selectedTx.type === "credit"
                          ? Colors.success
                          : Colors.error
                      }
                    />
                  </View>
                  <Text style={styles.txDetailAmount}>
                    {selectedTx.type === "CREDIT" || selectedTx.type === "credit" ? "+" : "-"}₹
                    {Number(selectedTx.amount || 0).toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.txDetailTitle}>
                    {selectedTx.description || selectedTx.title || "Wallet Transaction"}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Transaction ID</Text>
                  <Text style={styles.detailVal}>#{selectedTx.id || selectedTx.reference_id || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Date & Time</Text>
                  <Text style={styles.detailVal}>
                    {formatDateTime(
                      selectedTx.created_at || selectedTx.createdAt || selectedTx.date || selectedTx.timestamp
                    )}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Payment Method</Text>
                  <Text style={styles.detailVal}>
                    {selectedTx.payment_method || "Razorpay / Wallet"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Status</Text>
                  <Text style={[styles.detailVal, { color: Colors.success }]}>
                    {(selectedTx.status || "COMPLETED").toUpperCase()}
                  </Text>
                </View>

                <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setSelectedTx(null)}>
                  <Text style={styles.closeDetailText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAF9" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },

  // Filter Tabs Row
  tabContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#EFEFEF",
  },
  activeTabBtn: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  activeTabBtnText: { color: Colors.white, fontWeight: "700" },
  txCount: {
    marginLeft: "auto",
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },

  // List
  listContent: { paddingTop: 10, paddingBottom: 40 },

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
    elevation: 1,
  },
  txIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txInfo: { flex: 1, marginRight: 8 },
  txTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 3 },
  txDate: { fontSize: 11, color: Colors.textTertiary },
  txRightCol: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontWeight: "800", marginBottom: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  emptyText: { color: Colors.textTertiary, fontSize: 13, textAlign: "center" },

  // Detail Modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.white,
    width: "100%",
    borderRadius: 22,
    padding: 22,
    elevation: 8,
  },
  txDetailHeader: { alignItems: "center", marginBottom: 14 },
  txDetailIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  txDetailAmount: { fontSize: 28, fontWeight: "800", color: Colors.text, marginBottom: 4 },
  txDetailTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  divider: { height: 1, backgroundColor: "#EEF2F6", marginVertical: 14 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  detailKey: { fontSize: 13, color: Colors.textSecondary },
  detailVal: { fontSize: 13, color: Colors.text, fontWeight: "600" },
  closeDetailBtn: {
    backgroundColor: Colors.primary,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  closeDetailText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
