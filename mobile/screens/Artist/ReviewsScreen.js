import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getArtistReviewsData } from "../../services/artist";

export default function ReviewsScreen({ navigation }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviewsDataset = React.useCallback(async () => {
    try {
      const data = await getArtistReviewsData();
      setReviews(data || []);
    } catch (err) {
      console.log("Failed to load reviews:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviewsDataset();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchReviewsDataset]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviewsDataset();
  };

  const total = reviews.length;
  const avgRating = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : "0.0";

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    if (counts[r.rating] !== undefined) counts[r.rating]++;
  });

  const ratingBreakdown = [
    { stars: 5, percentage: total > 0 ? Math.round((counts[5] / total) * 100) : 0 },
    { stars: 4, percentage: total > 0 ? Math.round((counts[4] / total) * 100) : 0 },
    { stars: 3, percentage: total > 0 ? Math.round((counts[3] / total) * 100) : 0 },
    { stars: 2, percentage: total > 0 ? Math.round((counts[2] / total) * 100) : 0 },
    { stars: 1, percentage: total > 0 ? Math.round((counts[1] / total) * 100) : 0 }
  ];

  const renderRatingBar = (item) => (
    <View key={item.stars} style={styles.barRow}>
      <Text style={styles.barLabel}>{item.stars}★</Text>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${item.percentage}%` }]} />
      </View>
      <Text style={styles.percentageText}>{item.percentage}%</Text>
    </View>
  );

  const renderReview = ({ item }) => {
    const name = item.user?.name || "Client Name";
    const initial = name[0]?.toUpperCase() || "C";

    return (
      <View style={styles.reviewCard}>
        <View style={styles.userRow}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toDateString()}</Text>
          </View>
          <View style={styles.reviewStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= item.rating ? "star" : "star-outline"}
                size={12}
                color={star <= item.rating ? Colors.warning : Colors.border}
              />
            ))}
          </View>
        </View>
        <Text style={styles.reviewText}>{item.comment || "No comment provided."}</Text>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews & Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderReview}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.ratingNumber}>{avgRating}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name="star"
                    size={18}
                    color={star <= Math.round(Number(avgRating)) ? Colors.warning : Colors.border}
                  />
                ))}
              </View>
              <Text style={styles.reviewCount}>Based on {total} Client Reviews</Text>
              <View style={styles.barContainer}>{ratingBreakdown.map(renderRatingBar)}</View>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  listContent: { paddingBottom: 120 },
  summaryCard: { backgroundColor: Colors.white, margin: 16, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  ratingNumber: { fontSize: 44, fontWeight: "800", color: Colors.text, textAlign: "center" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 5 },
  reviewCount: { textAlign: "center", color: Colors.textSecondary, marginTop: 5, marginBottom: 20, fontSize: 12 },
  barContainer: { marginTop: 10 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  barLabel: { width: 30, fontWeight: "700", color: Colors.textSecondary, fontSize: 12 },
  progressBg: { flex: 1, height: 8, backgroundColor: Colors.background, borderRadius: 10 },
  progressFill: { height: 8, backgroundColor: Colors.warning, borderRadius: 10 },
  percentageText: { width: 30, fontSize: 11, color: Colors.textTertiary, textAlign: "right", fontWeight: "700" },
  reviewCard: { backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  userRow: { flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: "800", color: Colors.white },
  name: { fontWeight: "700", fontSize: 13, color: Colors.text },
  date: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  reviewStars: { flexDirection: "row", gap: 1 },
  reviewText: { color: Colors.textSecondary, marginTop: 10, lineHeight: 20, fontSize: 13 }
});
