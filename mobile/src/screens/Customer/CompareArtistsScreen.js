import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import OptimizedImage from "../../components/OptimizedImage";
import { getArtistById } from "../../services/customer";

export default function CompareArtistsScreen({ route, navigation }) {
  const { artistIds = [] } = route.params || {};
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArtistsToCompare() {
      if (!artistIds || artistIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const list = await Promise.all(
          artistIds.slice(0, 3).map((id) => getArtistById(id))
        );
        setArtists(list.filter(Boolean));
      } catch (e) {
        console.log("Error loading artists to compare:", e);
      } finally {
        setLoading(false);
      }
    }

    loadArtistsToCompare();
  }, [artistIds]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary || "#9C1344"} />
      </View>
    );
  }

  if (artists.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text || "#1D1D1D"} />
          </TouchableOpacity>
          <Text style={styles.title}>Compare Artists</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons name="git-compare-outline" size={48} color={Colors.primary || "#9C1344"} />
          <Text style={styles.emptyTitle}>Select Artists to Compare</Text>
          <Text style={styles.emptySub}>Select 2 or 3 artists from the listing screen to compare pricing, ratings & availability side-by-side.</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.exploreBtnText}>Go to Listing</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text || "#1D1D1D"} />
        </TouchableOpacity>
        <Text style={styles.title}>Compare Artists ({artists.length})</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Header Row with Artist Cards */}
        <View style={styles.artistsGrid}>
          {artists.map((artist) => {
            const user = artist.user || {};
            return (
              <View key={artist.id} style={styles.artistCol}>
                <OptimizedImage
                  source={{ uri: user.profile_image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300" }}
                  style={styles.artistAvatar}
                  width={72}
                  height={72}
                />
                <Text style={styles.artistName} numberOfLines={1}>{user.name || "Artist"}</Text>
                <Text style={styles.categoryText}>{artist.services?.[0]?.category || "Bridal Mehndi"}</Text>
              </View>
            );
          })}
        </View>

        {/* Metric Comparison Table */}
        <View style={styles.comparisonTable}>
          {/* Row 1: Starting Price */}
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Starting Price</Text>
            <View style={styles.valuesRow}>
              {artists.map((a) => (
                <Text key={a.id} style={styles.priceVal}>
                  ₹{a.services?.[0]?.minimum_price || 1500}
                </Text>
              ))}
            </View>
          </View>

          {/* Row 2: Average Rating */}
          <View style={[styles.metricRow, styles.altRow]}>
            <Text style={styles.metricLabel}>Rating & Reviews</Text>
            <View style={styles.valuesRow}>
              {artists.map((a) => (
                <View key={a.id} style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#FFB800" />
                  <Text style={styles.ratingText}>{Number(a.avg_rating || 4.8).toFixed(1)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Row 3: Experience */}
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Experience</Text>
            <View style={styles.valuesRow}>
              {artists.map((a) => (
                <Text key={a.id} style={styles.metricValText}>
                  {a.experience_years || 3}+ Yrs
                </Text>
              ))}
            </View>
          </View>

          {/* Row 4: Verification Status */}
          <View style={[styles.metricRow, styles.altRow]}>
            <Text style={styles.metricLabel}>Verification</Text>
            <View style={styles.valuesRow}>
              {artists.map((a) => (
                <View key={a.id} style={styles.verifiedRow}>
                  <Ionicons
                    name={a.verification_status === "APPROVED" ? "checkmark-circle" : "alert-circle"}
                    size={14}
                    color={a.verification_status === "APPROVED" ? "#059669" : "#D97706"}
                  />
                  <Text style={[styles.verifiedText, { color: a.verification_status === "APPROVED" ? "#065F46" : "#B45309" }]}>
                    {a.verification_status === "APPROVED" ? "Verified" : "Pending"}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Row 5: Response Time */}
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Response Time</Text>
            <View style={styles.valuesRow}>
              {artists.map((a) => (
                <Text key={a.id} style={styles.metricValText}>
                  ⚡ {a.response_time || "15 mins"}
                </Text>
              ))}
            </View>
          </View>

          {/* Row 6: Total Bookings */}
          <View style={[styles.metricRow, styles.altRow]}>
            <Text style={styles.metricLabel}>Completed Jobs</Text>
            <View style={styles.valuesRow}>
              {artists.map((a) => (
                <Text key={a.id} style={styles.metricValText}>
                  {a.total_bookings || 10}+ Jobs
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionGrid}>
          {artists.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.bookBtn}
              onPress={() => navigation.navigate("SelectService", { artistId: a.id })}
            >
              <Text style={styles.bookBtnText}>Book Now</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background || "#F9FAFB" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white || "#FFFFFF", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  scrollContent: { paddingBottom: 40 },
  artistsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: Colors.white || "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  artistCol: { flex: 1, alignItems: "center" },
  artistAvatar: { borderRadius: 36 },
  artistName: { fontSize: 14, fontWeight: "700", color: Colors.text || "#1D1D1D", marginTop: 8 },
  categoryText: { fontSize: 11, color: Colors.textSecondary || "#666666", marginTop: 2 },
  comparisonTable: { marginHorizontal: 16, marginTop: 16, backgroundColor: Colors.white || "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  metricRow: { paddingVertical: 14, paddingHorizontal: 14 },
  altRow: { backgroundColor: "#F9FAFB" },
  metricLabel: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary || "#666666", marginBottom: 6 },
  valuesRow: { flexDirection: "row", justifyContent: "space-around" },
  priceVal: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800", color: Colors.primary || "#9C1344" },
  metricValText: { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "600", color: Colors.text || "#1D1D1D" },
  ratingBadge: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 13, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  verifiedRow: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 },
  verifiedText: { fontSize: 11, fontWeight: "700" },
  actionGrid: { flexDirection: "row", paddingHorizontal: 16, marginTop: 20, gap: 12 },
  bookBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: Colors.primary || "#9C1344", justifyContent: "center", alignItems: "center" },
  bookBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: Colors.text || "#1D1D1D", marginTop: 12 },
  emptySub: { fontSize: 13, color: Colors.textSecondary || "#666666", textAlign: "center", marginTop: 6, lineHeight: 18 },
  exploreBtn: { marginTop: 20, backgroundColor: Colors.primary || "#9C1344", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  exploreBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});
