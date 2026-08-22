import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { getLeaderboard } from "../../services/referral";

export default function LeaderboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState("XP"); // XP, REFERRALS
  const [period, setPeriod] = useState("all-time"); // daily, weekly, monthly, all-time
  const [boardData, setBoardData] = useState([]);
  const [myRankInfo, setMyRankInfo] = useState({ rank: 0, value: 0 });

  const loadData = async () => {
    try {
      const data = await getLeaderboard(type, period);
      setBoardData(data?.leaderboard || []);
      setMyRankInfo({
        rank: data?.myRank || 0,
        value: data?.myValue || 0
      });
    } catch (err) {
      if (__DEV__) console.log("Failed to load leaderboard:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [type, period]);

  const renderLeaderRow = ({ item }) => {
    const isTop3 = item.rank <= 3;
    let rankColor = Colors.textSecondary;
    let rankIcon = null;

    if (item.rank === 1) {
      rankColor = "#FFD700"; // Gold
      rankIcon = "trophy";
    } else if (item.rank === 2) {
      rankColor = "#C0C0C0"; // Silver
      rankIcon = "trophy";
    } else if (item.rank === 3) {
      rankColor = "#CD7F32"; // Bronze
      rankIcon = "trophy";
    }

    return (
      <View style={styles.rowCard}>
        <View style={styles.rankCol}>
          {rankIcon ? (
            <Ionicons name={rankIcon} size={18} color={rankColor} />
          ) : (
            <Text style={styles.rankNum}>{item.rank}</Text>
          )}
        </View>

        <Image
          source={{ uri: item.profileImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" }}
          style={styles.avatar}
        />

        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.badgeRow}>
            <Text style={styles.levelText}>Lv {item.level}</Text>
            <View style={styles.tierTag}>
              <Text style={styles.tierText}>{item.tier}</Text>
            </View>
          </View>
        </View>

        <View style={styles.valueCol}>
          <Text style={styles.valueText}>
            {item.value.toLocaleString()} {type === "XP" ? "XP" : "Invites"}
          </Text>
        </View>
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
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, type === "XP" && styles.activeTab]}
          onPress={() => setType("XP")}
        >
          <Text style={[styles.tabText, type === "XP" && styles.activeTabText]}>Experience (XP)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, type === "REFERRALS" && styles.activeTab]}
          onPress={() => setType("REFERRALS")}
        >
          <Text style={[styles.tabText, type === "REFERRALS" && styles.activeTabText]}>Referrals</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {["daily", "weekly", "monthly", "all-time"].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, period === p && styles.activeChip]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.chipText, period === p && styles.activeChipText]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={boardData}
          renderItem={renderLeaderRow}
          keyExtractor={(item) => item.id.toString()}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="stats-chart-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No data available for this period.</Text>
            </View>
          }
        />
      )}

      {/* Sticky Bottom My Rank Bar */}
      <View style={styles.myRankBar}>
        <View style={styles.myRankInfo}>
          <Text style={styles.myRankTitle}>My Rank</Text>
          <Text style={styles.myRankNum}>#{myRankInfo.rank > 0 ? myRankInfo.rank : "--"}</Text>
        </View>
        <View style={styles.myRankValue}>
          <Text style={styles.myRankTitle}>{type === "XP" ? "My Points" : "My Referrals"}</Text>
          <Text style={styles.myRankNum}>{myRankInfo.value} {type === "XP" ? "XP" : ""}</Text>
        </View>
      </View>
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
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center"
  },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  activeTabText: { color: Colors.white },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
    justifyContent: "space-around"
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border
  },
  activeChip: { backgroundColor: Colors.primaryLight + "30", borderColor: Colors.primary },
  chipText: { fontSize: 11, fontWeight: "500", color: Colors.textSecondary },
  activeChipText: { color: Colors.primary, fontWeight: "600" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white
  },
  rankCol: { width: 30, alignItems: "center" },
  rankNum: { fontSize: 14, fontWeight: "700", color: Colors.textSecondary },
  avatar: { width: 44, height: 44, borderRadius: 22, marginLeft: 12 },
  nameCol: { flex: 1, marginLeft: 12 },
  name: { fontSize: 14, fontWeight: "700", color: Colors.text },
  badgeRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 },
  levelText: { fontSize: 11, fontWeight: "600", color: Colors.primary },
  tierTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 4
  },
  tierText: { fontSize: 9, color: Colors.textSecondary, fontWeight: "700" },
  valueCol: { alignItems: "flex-end" },
  valueText: { fontSize: 13, fontWeight: "700", color: Colors.text },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 100 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, marginTop: 12 },
  myRankBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  myRankInfo: { flexDirection: "column" },
  myRankTitle: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  myRankNum: { fontSize: 18, color: Colors.white, fontWeight: "800", marginTop: 2 },
  myRankValue: { alignItems: "flex-end" }
});
