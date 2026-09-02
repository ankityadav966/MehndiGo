import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, ActivityIndicator, RefreshControl, Animated, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { getCustomerReferralDashboard } from "../../services/referral";

// ── Progress ring component ───────────────────────────────────────────────────
function ProgressBar({ current, total, color = Colors.primary }) {
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const widthAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          { backgroundColor: color, width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }
        ]}
      />
    </View>
  );
}

// ── Reward card component ─────────────────────────────────────────────────────
function RewardCard({ icon, title, status, unlockedAt }) {
  const unlocked = status === "UNLOCKED" || status === "REDEEMED";
  return (
    <View style={[styles.rewardCard, unlocked && styles.rewardCardUnlocked]}>
      <View style={[styles.rewardIcon, unlocked && styles.rewardIconUnlocked]}>
        <Ionicons name={icon} size={22} color={unlocked ? "#fff" : Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rewardTitle}>{title}</Text>
        {unlocked && unlockedAt && (
          <Text style={styles.rewardDate}>Unlocked {new Date(unlockedAt).toLocaleDateString()}</Text>
        )}
      </View>
      <View style={[styles.rewardBadge, unlocked && styles.rewardBadgeUnlocked]}>
        <Text style={[styles.rewardBadgeText, unlocked && { color: "#fff" }]}>
          {unlocked ? (status === "REDEEMED" ? "REDEEMED" : "UNLOCKED ✓") : "LOCKED"}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ReferralDashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getCustomerReferralDashboard();
      setData(res?.data || res);
    } catch (e) {
      Alert.alert("Error", "Could not load referral data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleShare = async () => {
    if (!data?.referralLink) return;
    setShareLoading(true);
    try {
      await Share.share({
        message: `🌸 Join MehndiGo — India's #1 Mehndi booking app!\nUse my referral link to get started:\n${data.referralLink}`,
        url: data.referralLink,
        title: "Join MehndiGo"
      });
    } catch (e) {
      Alert.alert("Share failed", e.message);
    } finally {
      setShareLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const c2c = data?.customerReferrals || {};
  const c2a = data?.artistReferrals || {};

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
          <Text style={styles.headerSub}>Invite friends, unlock rewards</Text>
        </View>
      </View>

      {/* Referral Code Banner */}
      <View style={styles.codeBanner}>
        <View>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <Text style={styles.codeValue}>{data?.referralCode || "—"}</Text>
        </View>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          disabled={shareLoading}
          activeOpacity={0.8}
        >
          {shareLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="share-social-outline" size={16} color="#fff" style={{ marginRight: 6 }} /><Text style={styles.shareBtnText}>Share</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* ── Customer → Customer ────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Customer Referrals</Text>
      <View style={styles.card}>
        <View style={styles.statRow}>
          <Ionicons name="people-outline" size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>Friends Joined</Text>
          <Text style={styles.statValue}>
            <Text style={styles.statCurrent}>{c2c.count || 0}</Text>
            <Text style={styles.statTotal}> / {c2c.threshold || 50}</Text>
          </Text>
        </View>
        <ProgressBar current={c2c.count || 0} total={c2c.threshold || 50} />

        <View style={[styles.statRow, { marginTop: 10 }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
          <Text style={styles.statLabel}>Qualifying Bookings</Text>
          <Text style={styles.statValue}>
            <Text style={styles.statCurrent}>{c2c.qualifyingBookings || 0}</Text>
            <Text style={styles.statTotal}> / {c2c.bookingsThreshold || 3}</Text>
          </Text>
        </View>
        <ProgressBar current={c2c.qualifyingBookings || 0} total={c2c.bookingsThreshold || 3} color="#4CAF50" />

        {c2c.pending > 0 && (
          <Text style={styles.pendingNote}>⏳ {c2c.pending} referral{c2c.pending > 1 ? "s" : ""} pending qualification</Text>
        )}

        <RewardCard
          icon="pricetag-outline"
          title="50% Mehndi Offer"
          status={c2c.reward?.status}
          unlockedAt={c2c.reward?.unlockedAt}
        />
      </View>

      {/* ── Customer → Artist ──────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Artist Referrals</Text>
      <View style={styles.card}>
        <View style={styles.statRow}>
          <Ionicons name="brush-outline" size={20} color="#9C27B0" />
          <Text style={styles.statLabel}>Artists Invited</Text>
          <Text style={styles.statValue}>
            <Text style={styles.statCurrent}>{c2a.count || 0}</Text>
            <Text style={styles.statTotal}> / {c2a.threshold || 10}</Text>
          </Text>
        </View>
        <ProgressBar current={c2a.count || 0} total={c2a.threshold || 10} color="#9C27B0" />

        {c2a.pending > 0 && (
          <Text style={styles.pendingNote}>⏳ {c2a.pending} artist referral{c2a.pending > 1 ? "s" : ""} awaiting approval</Text>
        )}

        <RewardCard
          icon="sparkles-outline"
          title="70% Mehndi Offer"
          status={c2a.reward?.status}
          unlockedAt={c2a.reward?.unlockedAt}
        />
      </View>

      {/* How it works */}
      <View style={styles.howCard}>
        <Text style={styles.howTitle}>How It Works</Text>
        {[
          { icon: "share-outline",   text: "Share your referral link with friends" },
          { icon: "person-add-outline", text: "They join MehndiGo via your link" },
          { icon: "gift-outline",    text: "Earn offers once milestones are reached" },
        ].map((step, i) => (
          <View key={i} style={styles.howRow}>
            <View style={styles.howIcon}><Ionicons name={step.icon} size={16} color={Colors.primary} /></View>
            <Text style={styles.howText}>{step.text}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: Colors.background },
  container:    { flex: 1, backgroundColor: Colors.background },
  content:      { padding: 20 },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },

  header:       { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  backBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.cardBackground, alignItems: "center", justifyContent: "center", elevation: 2 },
  headerTitle:  { fontSize: 22, fontWeight: "700", color: Colors.text },
  headerSub:    { fontSize: 13, color: Colors.textSecondary },

  codeBanner:   { backgroundColor: Colors.primary, borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, elevation: 4 },
  codeLabel:    { color: "rgba(255,255,255,0.8)", fontSize: 12, marginBottom: 4 },
  codeValue:    { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: 3 },
  shareBtn:     { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  shareBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 10 },
  card:         { backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 18, elevation: 2 },

  statRow:      { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statLabel:    { flex: 1, fontSize: 14, color: Colors.textSecondary, marginLeft: 8 },
  statValue:    { fontSize: 14 },
  statCurrent:  { fontWeight: "800", color: Colors.text, fontSize: 16 },
  statTotal:    { color: Colors.textSecondary, fontSize: 13 },

  progressTrack: { height: 7, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  progressFill:  { height: "100%", borderRadius: 4 },

  pendingNote:  { fontSize: 12, color: Colors.textSecondary, marginTop: 8, marginBottom: 4, fontStyle: "italic" },

  // Reward card
  rewardCard:         { flexDirection: "row", alignItems: "center", marginTop: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, gap: 12 },
  rewardCardUnlocked: { borderColor: Colors.primary, backgroundColor: "#FFF0F5" },
  rewardIcon:         { width: 38, height: 38, borderRadius: 10, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center" },
  rewardIconUnlocked: { backgroundColor: Colors.primary },
  rewardTitle:        { fontSize: 14, fontWeight: "700", color: Colors.text },
  rewardDate:         { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  rewardBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.border },
  rewardBadgeUnlocked:{ backgroundColor: Colors.primary },
  rewardBadgeText:    { fontSize: 10, fontWeight: "700", color: Colors.textSecondary },

  // How it works
  howCard:   { backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 16, elevation: 1 },
  howTitle:  { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  howRow:    { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  howIcon:   { width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center" },
  howText:   { flex: 1, fontSize: 13, color: Colors.textSecondary },
});
