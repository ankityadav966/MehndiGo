import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, ActivityIndicator, RefreshControl, Animated, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { getArtistReferralDashboard } from "../../services/referral";

function ProgressBar({ current, total, color = Colors.primary }) {
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const widthAnim = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color, width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

export default function ArtistReferralScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getArtistReferralDashboard();
      setData(res?.data || res);
    } catch (e) {
      Alert.alert("Error", "Could not load referral data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleShare = async () => {
    if (!data?.referralLink) return;
    try {
      await Share.share({
        message: `🌸 Join MehndiGo as an artist and grow your business!\nRegister via my link:\n${data.referralLink}`,
        url: data.referralLink,
        title: "Join MehndiGo as an Artist"
      });
    } catch (e) {
      Alert.alert("Share failed", e.message);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.center} edges={["top"]}><ActivityIndicator color={Colors.primary} size="large" /></SafeAreaView>;
  }

  // Use the new stats object from backend, defaulting gracefully
  const stats = data?.stats || {};
  const currentCount = stats.artistReferredCount || 0;
  const pendingCount = stats.pendingInvites || 0;
  const threshold = 20;
  const unlocked = currentCount >= threshold;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Artist Refer & Earn</Text>
          <Text style={styles.headerSub}>Invite artists, get featured</Text>
        </View>
      </View>

      {/* Referral code banner */}
      <View style={styles.codeBanner}>
        <View>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <Text style={styles.codeValue}>{data?.referralCode || "—"}</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Featured status indicator */}
      {unlocked && (
        <View style={styles.featuredBanner}>
          <Ionicons name="star" size={18} color="#FFD700" style={{ marginRight: 8 }} />
          <Text style={styles.featuredText}>⭐ Your profile is currently Featured on the home screen!</Text>
        </View>
      )}

      {/* Artist referral progress */}
      <Text style={styles.sectionTitle}>Artist Referrals</Text>
      <View style={styles.card}>
        <View style={styles.statRow}>
          <Ionicons name="brush-outline" size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>Artists Joined & Approved</Text>
          <Text style={styles.statValue}>
            <Text style={styles.statCurrent}>{currentCount}</Text>
            <Text style={styles.statTotal}> / {threshold}</Text>
          </Text>
        </View>
        <ProgressBar current={currentCount} total={threshold} />

        {pendingCount > 0 && (
          <Text style={styles.pendingNote}>⏳ {pendingCount} referral{pendingCount > 1 ? "s" : ""} awaiting admin approval</Text>
        )}

        {/* Reward card */}
        <View style={[styles.rewardCard, unlocked && styles.rewardCardUnlocked]}>
          <View style={[styles.rewardIcon, unlocked && styles.rewardIconUnlocked]}>
            <Ionicons name="star-outline" size={22} color={unlocked ? "#fff" : "#FFD700"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardTitle}>Top Profile / Featured Artist</Text>
            <Text style={styles.rewardSub}>Your profile appears at the top of the home screen</Text>
          </View>
          <View style={[styles.rewardBadge, unlocked && styles.rewardBadgeUnlocked]}>
            <Text style={[styles.rewardBadgeText, unlocked && { color: "#fff" }]}>
              {unlocked ? "ACTIVE ✓" : "LOCKED"}
            </Text>
          </View>
        </View>
      </View>

      {/* How it works */}
      <View style={styles.howCard}>
        <Text style={styles.howTitle}>How It Works</Text>
        {[
          { icon: "share-outline",    text: "Share your referral link with other mehndi artists" },
          { icon: "person-add-outline", text: "They register & get approved on MehndiGo" },
          { icon: "star-outline",     text: "Refer 20 approved artists to unlock Featured Profile status" },
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
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: 20 },
  center:    { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },

  header:       { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  backBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.cardBackground, alignItems: "center", justifyContent: "center", elevation: 2 },
  headerTitle:  { fontSize: 22, fontWeight: "700", color: Colors.text },
  headerSub:    { fontSize: 13, color: Colors.textSecondary },

  codeBanner: { backgroundColor: Colors.primary, borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, elevation: 4 },
  codeLabel:  { color: "rgba(255,255,255,0.8)", fontSize: 12, marginBottom: 4 },
  codeValue:  { color: "#fff", fontSize: 26, fontWeight: "700", letterSpacing: 3 },
  shareBtn:   { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  shareBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  featuredBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFDE7", borderWidth: 1, borderColor: "#FFD700", borderRadius: 12, padding: 12, marginBottom: 16 },
  featuredText:   { flex: 1, fontSize: 13, color: "#795548", fontWeight: "600" },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 10 },
  card:         { backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 18, elevation: 2 },

  statRow:    { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statLabel:  { flex: 1, fontSize: 14, color: Colors.textSecondary, marginLeft: 8 },
  statValue:  { fontSize: 14 },
  statCurrent: { fontWeight: "700", color: Colors.text, fontSize: 16 },
  statTotal:  { color: Colors.textSecondary, fontSize: 13 },

  progressTrack: { height: 7, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  progressFill:  { height: "100%", borderRadius: 4 },

  pendingNote: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, marginBottom: 4, fontStyle: "italic" },

  rewardCard:         { flexDirection: "row", alignItems: "center", marginTop: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, gap: 10 },
  rewardCardUnlocked: { borderColor: "#FFD700", backgroundColor: "#FFFDE7" },
  rewardIcon:         { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FFF8E1", alignItems: "center", justifyContent: "center" },
  rewardIconUnlocked: { backgroundColor: "#FFD700" },
  rewardTitle:        { fontSize: 14, fontWeight: "700", color: Colors.text },
  rewardSub:          { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  rewardBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.border },
  rewardBadgeUnlocked:{ backgroundColor: "#FFD700" },
  rewardBadgeText:    { fontSize: 10, fontWeight: "700", color: Colors.textSecondary },

  howCard:  { backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 16, elevation: 1 },
  howTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  howRow:   { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  howIcon:  { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3E5F5", alignItems: "center", justifyContent: "center" },
  howText:  { flex: 1, fontSize: 13, color: Colors.textSecondary } });



