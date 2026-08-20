import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Clipboard,
  FlatList,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { getReferralDashboard, getReferralHistory } from "../../services/referral";
import { createReferralDeepLink } from "../../services/deepLink";

export default function ReferralDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [history, setHistory] = useState([]);

  const loadData = async () => {
    try {
      const [dbInfo, histList] = await Promise.all([
        getReferralDashboard(),
        getReferralHistory()
      ]);
      setDashboardData(dbInfo);
      setHistory(histList || []);
    } catch (err) {
      console.log("Failed to load referrals:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyCode = () => {
    if (!dashboardData?.referralCode) return;
    Clipboard.setString(dashboardData.referralCode);
    Alert.alert("Copied! 📋", "Referral code copied to clipboard.");
  };

  const handleShareInvite = async () => {
    const refCode = dashboardData?.referralCode;
    if (!refCode) return;
    const shareLink = dashboardData?.referralLink || createReferralDeepLink(refCode);
    try {
      const messageText = `Hey! Join MehndiGo for premium home mehndi artists. Sign up with my link and verify your phone number to get welcome wallet cashbacks! Use my invite code: ${refCode}\n\n${shareLink}`;
      await Share.share({
        message: messageText,
        title: "MehndiGo Invitation",
        url: shareLink
      });
    } catch (err) {
      console.log("Share failed:", err.message);
    }
  };

  const renderFriend = ({ item }) => {
    const isCompleted = item.status === "COMPLETED";
    
    return (
      <View style={styles.friendCard}>
        <View style={styles.friendInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>
              {item.friendName ? item.friendName.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.friendName}>{item.friendName}</Text>
            <Text style={styles.friendDate}>
              Joined: {new Date(item.joinedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, isCompleted ? styles.completedBadge : styles.pendingBadge]}>
          <Ionicons
            name={isCompleted ? "checkmark-circle" : "time-outline"}
            size={14}
            color={isCompleted ? "#2E7D32" : "#E65100"}
          />
          <Text style={[styles.statusText, isCompleted ? styles.completedText : styles.pendingText]}>
            {isCompleted ? `Earned ₹${item.rewardAmount}` : "Pending"}
          </Text>
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

  const stats = dashboardData?.stats || { totalInvites: 0, pendingInvites: 0, completedInvites: 0, totalEarnings: 0 };
  const campaign = dashboardData?.campaign || { title: "Standard Campaign", referrerReward: 100 };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={history}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadData();
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            {/* Promo banner */}
            <View style={styles.heroCard}>
              <Ionicons name="gift" size={40} color={Colors.white} />
              <Text style={styles.heroTitle}>{campaign.title}</Text>
              <Text style={styles.heroDesc}>
                {"Invite your friends to try MehndiGo. When they complete their first service, we'll credit ₹" + campaign.referrerReward + " to your wallet!"}
              </Text>
            </View>

            {/* Level & XP Card */}
            <View style={styles.xpCard}>
              <View style={styles.xpHeader}>
                <View>
                  <Text style={styles.levelLabel}>Level {dashboardData?.xp?.level || 1}</Text>
                  <Text style={styles.tierTagText}>{dashboardData?.xp?.tier || "BEGINNER"} AMBASSADOR</Text>
                </View>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankLabel}>RANK</Text>
                  <Text style={styles.rankValText}>#{dashboardData?.xp?.rank || "--"}</Text>
                </View>
              </View>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, ((dashboardData?.xp?.currentXp || 0) / (dashboardData?.xp?.nextLevelXp || 500)) * 100)}%` }]} />
              </View>

              <View style={styles.xpFooter}>
                <Text style={styles.xpFooterText}>{dashboardData?.xp?.currentXp || 0} / {dashboardData?.xp?.nextLevelXp || 500} XP</Text>
                <Text style={styles.xpTodayText}>+{dashboardData?.xp?.todayXp || 0} XP Today</Text>
              </View>
            </View>

            {/* Navigation Quick Links */}
            <View style={styles.navigationRow}>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate("Leaderboard")}>
                <Ionicons name="trophy-outline" size={20} color={Colors.primary} />
                <Text style={styles.navBtnText}>Leaderboard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate("RewardStore")}>
                <Ionicons name="gift-outline" size={20} color={Colors.primary} />
                <Text style={styles.navBtnText}>Reward Store</Text>
              </TouchableOpacity>
            </View>

            {/* Badges Earned */}
            {dashboardData?.badges?.length > 0 && (
              <View style={styles.badgesSection}>
                <Text style={styles.badgeSectionTitle}>My Unlocked Badges ({dashboardData.badges.length})</Text>
                <FlatList
                  horizontal
                  data={dashboardData.badges}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.badgeItemCard}>
                      <View style={styles.badgeIconWrapper}>
                        <Ionicons name={item.iconName || "ribbon"} size={22} color={Colors.primary} />
                      </View>
                      <Text style={styles.badgeItemName} numberOfLines={1}>{item.name}</Text>
                    </View>
                  )}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                />
              </View>
            )}

            {/* Code Box */}
            <View style={styles.shareContainer}>
              <Text style={styles.shareLabel}>YOUR UNIQUE REFERRAL CODE</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{dashboardData?.referralCode}</Text>
                <TouchableOpacity onPress={handleCopyCode} style={styles.iconBtn}>
                  <Ionicons name="copy-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleShareInvite} style={styles.shareBtn}>
                <Ionicons name="share-social-outline" size={18} color={Colors.white} />
                <Text style={styles.shareBtnText}>Share Invitation Link</Text>
              </TouchableOpacity>
            </View>

            {/* Stats Dashboard Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.totalInvites}</Text>
                <Text style={styles.statLabel}>Invited Friends</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.pendingInvites}</Text>
                <Text style={styles.statLabel}>Pending Installs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: Colors.primary }]}>₹{stats.totalEarnings}</Text>
                <Text style={styles.statLabel}>Total Earnings</Text>
              </View>
            </View>

            {/* History Label */}
            <Text style={styles.sectionTitle}>Referral Track Log</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>{"You haven't referred any friends yet."}</Text>
            <Text style={styles.emptySubText}>{"Invite your friends to start earning wallet cashbacks!"}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  xpCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1
  },
  xpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: 2
  },
  rankBadge: {
    alignItems: "flex-end"
  },
  rankLabel: {
    fontSize: 8,
    color: Colors.textSecondary,
    fontWeight: "700"
  },
  rankValText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 4
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4
  },
  xpFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6
  },
  xpFooterText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary
  },
  xpTodayText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2E7D32"
  },
  navigationRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12
  },
  navBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    gap: 8
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text
  },
  badgesSection: {
    marginTop: 16
  },
  badgeSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginHorizontal: 16,
    marginBottom: 10
  },
  badgeItemCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    width: 100,
    borderWidth: 1,
    borderColor: Colors.border
  },
  badgeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6
  },
  badgeItemName: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    textAlign: "center",
    width: "100%"
  },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  heroCard: { backgroundColor: Colors.primary, marginHorizontal: 16, borderRadius: 18, padding: 20, alignItems: "center", marginTop: 8 },
  heroTitle: { fontSize: 18, fontWeight: "800", color: Colors.white, marginTop: 10, textAlign: "center" },
  heroDesc: { fontSize: 12, color: "rgba(255, 255, 255, 0.8)", textAlign: "center", marginTop: 8, lineHeight: 18 },
  shareContainer: { backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, borderFocus: 1, borderColor: Colors.border, elevation: 1, alignItems: "center" },
  shareLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: "700", letterSpacing: 1 },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderStyle: "dashed", borderColor: Colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, width: "100%", marginVertical: 12, backgroundColor: "#FFF5F7" },
  codeText: { fontSize: 18, fontWeight: "800", color: Colors.primary, letterSpacing: 2 },
  iconBtn: { padding: 4 },
  shareBtn: { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%", height: 44, borderRadius: 10 },
  shareBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13, marginLeft: 8 },
  statsGrid: { flexDirection: "row", marginHorizontal: 16, justifyContent: "space-between", marginTop: 12 },
  statBox: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 14, alignItems: "center", marginHorizontal: 4, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  statVal: { fontSize: 18, fontWeight: "850", color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "750", color: Colors.text, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  friendCard: { backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: Colors.border },
  friendInfo: { flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.border, justifyContent: "center", alignItems: "center" },
  avatarLetter: { fontSize: 14, fontWeight: "700", color: Colors.textSecondary },
  friendName: { fontSize: 13, fontWeight: "700", color: Colors.text },
  friendDate: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  completedBadge: { backgroundColor: "#E8F5E9" },
  pendingBadge: { backgroundColor: "#FFF3E0" },
  statusText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  completedText: { color: "#2E7D32" },
  pendingText: { color: "#E65100" },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, fontWeight: "700", color: Colors.textSecondary, marginTop: 10 },
  emptySubText: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 }
});
