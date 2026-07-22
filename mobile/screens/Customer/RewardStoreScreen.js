import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import Alert from "../../utils/Alert";
import { listRewardOptions, claimRewardOption, getReferralDashboard } from "../../services/referral";

export default function RewardStoreScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [userXp, setUserXp] = useState(0);
  const [selectedReward, setSelectedReward] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const loadData = async () => {
    try {
      const [list, dash] = await Promise.all([
        listRewardOptions(),
        getReferralDashboard()
      ]);
      setRewards(list || []);
      setUserXp(dash?.xp?.currentXp || 0);
    } catch (err) {
      console.log("Failed to load rewards store:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClaimPress = (reward) => {
    if (userXp < reward.xp_cost) {
      Alert.alert("Insufficient XP ❌", `You need ${reward.xp_cost} XP to redeem this reward, but you currently have ${userXp} XP.`);
      return;
    }
    setSelectedReward(reward);
    setConfirmVisible(true);
  };

  const handleConfirmClaim = async () => {
    if (!selectedReward) return;
    setConfirmVisible(false);
    setClaiming(true);

    try {
      const result = await claimRewardOption(selectedReward.id);
      Alert.alert(
        "Reward Claimed! 🎉",
        `Successfully claimed: ${selectedReward.title}\n\nCoupon Code: ${result.claimCode || "Applied to Account"}`
      );
      // Reload stats
      loadData();
    } catch (err) {
      Alert.alert("Redemption Failed ❌", err.message || "Something went wrong.");
    } finally {
      setClaiming(false);
      setSelectedReward(null);
    }
  };

  const renderRewardCard = ({ item }) => {
    const isLocked = userXp < item.xp_cost;
    
    return (
      <View style={[styles.rewardCard, isLocked && styles.lockedCard]}>
        <View style={styles.rewardIconContainer}>
          <Ionicons
            name={item.type === "CASH" ? "wallet-outline" : item.type === "FEATURED_BOOST" ? "flash-outline" : "ticket-outline"}
            size={28}
            color={Colors.primary}
          />
        </View>

        <View style={styles.rewardDetails}>
          <Text style={styles.rewardTitle}>{item.title}</Text>
          <Text style={styles.rewardDesc}>{item.description}</Text>
          <View style={styles.costRow}>
            <Ionicons name="sparkles" size={14} color="#FFA000" />
            <Text style={styles.costText}>{item.xp_cost} XP</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.claimBtn, isLocked && styles.disabledClaimBtn]}
          onPress={() => handleClaimPress(item)}
          disabled={claiming}
        >
          <Text style={styles.claimBtnText}>Claim</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Reward Store</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* User XP stats info */}
      <View style={styles.xpStatsBox}>
        <View style={styles.xpLeft}>
          <Ionicons name="sparkles" size={24} color="#FFA000" />
          <Text style={styles.xpLabel}>My Current Balance</Text>
        </View>
        <Text style={styles.xpValue}>{userXp.toLocaleString()} XP</Text>
      </View>

      {loading || claiming ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          {claiming && <Text style={styles.loadingSub}>Redeeming your reward...</Text>}
        </View>
      ) : (
        <FlatList
          data={rewards}
          renderItem={renderRewardCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="gift-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No rewards available at the moment.</Text>
            </View>
          }
        />
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="help-circle-outline" size={44} color={Colors.primary} style={{ alignSelf: "center" }} />
            <Text style={styles.modalTitle}>Redeem Reward?</Text>
            <Text style={styles.modalBody}>
              {`Are you sure you want to claim "${selectedReward?.title}" for ${selectedReward?.xp_cost} XP?`}
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleConfirmClaim}
              >
                <Text style={styles.confirmText}>Claim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  xpStatsBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    margin: 16,
    backgroundColor: "#FFA00018",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFA00030"
  },
  xpLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  xpLabel: { fontSize: 14, fontWeight: "600", color: Colors.text },
  xpValue: { fontSize: 18, fontWeight: "800", color: "#FFA000" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingSub: { marginTop: 12, color: Colors.textSecondary, fontSize: 12 },
  listContent: { paddingHorizontal: 16, pb: 40 },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: Colors.white
  },
  lockedCard: { opacity: 0.8 },
  rewardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight + "15",
    justifyContent: "center",
    alignItems: "center"
  },
  rewardDetails: { flex: 1, marginLeft: 12, marginRight: 8 },
  rewardTitle: { fontSize: 14, fontWeight: "700", color: Colors.text },
  rewardDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, lineHeight: 14 },
  costRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  costText: { fontSize: 12, fontWeight: "700", color: "#FFA000" },
  claimBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18
  },
  disabledClaimBtn: { backgroundColor: Colors.placeholder, opacity: 0.6 },
  claimBtnText: { color: Colors.white, fontSize: 12, fontWeight: "700" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 100 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: "100%", elevation: 6 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, textAlign: "center", marginTop: 12 },
  modalBody: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginVertical: 12, lineHeight: 18 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  modalBtnCancel: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, justifyContent: "center", alignItems: "center" },
  modalBtnConfirm: { flex: 1, height: 44, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  cancelText: { color: Colors.textSecondary, fontWeight: "600" },
  confirmText: { color: Colors.white, fontWeight: "700" }
});
