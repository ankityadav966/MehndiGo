import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
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
  const [userXp, setUserXp] = useState(1250);
  const [redeemedPoints, setRedeemedPoints] = useState(300);
  const [pendingPoints, setPendingPoints] = useState(150);
  const [selectedReward, setSelectedReward] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const loadData = async () => {
    try {
      const [list, dash] = await Promise.all([
        listRewardOptions(),
        getReferralDashboard()
      ]);
      setRewards(list || []);
      if (dash?.xp?.currentXp !== undefined) {
        setUserXp(dash.xp.currentXp);
      }
    } catch (err) {
      if (__DEV__) console.log("Failed to load rewards store:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getTierInfo = (points) => {
    if (points >= 5000) return { name: "Platinum Legend", badge: "trophy", color: "#E5E7EB", bg: "#1F2937" };
    if (points >= 1500) return { name: "Gold Elite", badge: "ribbon", color: "#F59E0B", bg: "#FFFBEB" };
    if (points >= 500) return { name: "Silver VIP", badge: "medal", color: "#6B7280", bg: "#F3F4F6" };
    return { name: "Bronze Member", badge: "shield", color: "#D97706", bg: "#FEF3C7" };
  };

  const currentTier = getTierInfo(userXp);

  const handleClaimPress = (reward) => {
    if (userXp < reward.xp_cost) {
      Alert.alert("Insufficient Points ❌", `You need ${reward.xp_cost} Points to redeem this reward, but you currently have ${userXp} Points.`);
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
            color={Colors.primary || "#9C1344"}
          />
        </View>

        <View style={styles.rewardDetails}>
          <Text style={styles.rewardTitle}>{item.title}</Text>
          <Text style={styles.rewardDesc}>{item.description}</Text>
          <View style={styles.costRow}>
            <Ionicons name="sparkles" size={14} color="#FFB800" />
            <Text style={styles.costText}>{item.xp_cost} Points</Text>
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text || "#1D1D1D"} />
        </TouchableOpacity>
        <Text style={styles.title}>Loyalty & Rewards</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tier Card */}
      <View style={[styles.tierCard, { backgroundColor: currentTier.bg }]}>
        <View style={styles.tierHeader}>
          <Ionicons name={currentTier.badge} size={24} color={currentTier.color} />
          <Text style={[styles.tierName, { color: currentTier.color }]}>{currentTier.name}</Text>
        </View>
        <Text style={styles.tierSub}>Earn points on every booking, referral & review!</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCol}>
            <Text style={styles.metricVal}>{userXp}</Text>
            <Text style={styles.metricLabel}>Total Points</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricVal}>{redeemedPoints}</Text>
            <Text style={styles.metricLabel}>Redeemed</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricVal}>{pendingPoints}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Available Rewards List */}
      <FlatList
        data={rewards}
        renderItem={renderRewardCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Confirm Claim Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Ionicons name="gift-outline" size={40} color={Colors.primary || "#9C1344"} />
            <Text style={styles.modalTitle}>Confirm Redemption</Text>
            <Text style={styles.modalText}>
              Do you want to spend {selectedReward?.xp_cost} Points for {selectedReward?.title}?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmClaim}>
                <Text style={styles.modalConfirmText}>Redeem Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background || "#F9FAFB" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white || "#FFFFFF", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  tierCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tierHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierName: { fontSize: 18, fontWeight: "800" },
  tierSub: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  metricsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)" },
  metricCol: { alignItems: "center" },
  metricVal: { fontSize: 18, fontWeight: "800", color: Colors.text || "#1D1D1D" },
  metricLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  metricDivider: { width: 1, height: 24, backgroundColor: "rgba(0,0,0,0.1)" },
  rewardCard: {
    backgroundColor: Colors.white || "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border || "#E5E7EB",
  },
  lockedCard: { opacity: 0.7 },
  rewardIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center", marginRight: 12 },
  rewardDetails: { flex: 1 },
  rewardTitle: { fontSize: 14, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  rewardDesc: { fontSize: 12, color: Colors.textSecondary || "#666666", marginTop: 2 },
  costRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  costText: { fontSize: 12, fontWeight: "700", color: "#D97706" },
  claimBtn: { backgroundColor: Colors.primary || "#9C1344", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  disabledClaimBtn: { backgroundColor: "#94A3B8" },
  claimBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFFFF", width: "84%", borderRadius: 16, padding: 20, alignItems: "center" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.text || "#1D1D1D", marginTop: 12 },
  modalText: { fontSize: 13, color: Colors.textSecondary || "#666666", textAlign: "center", marginTop: 6, lineHeight: 18 },
  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 20, width: "100%" },
  modalCancelBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  modalCancelText: { color: Colors.text || "#1D1D1D", fontWeight: "600", fontSize: 13 },
  modalConfirmBtn: { flex: 1, height: 42, borderRadius: 10, backgroundColor: Colors.primary || "#9C1344", justifyContent: "center", alignItems: "center" },
  modalConfirmText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});
