import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getCustomerReviews } from "../../services/customer";

export default function ReviewsScreen({ navigation }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = React.useCallback(async () => {
    try {
      const data = await getCustomerReviews();
      if (data && data.reviews) {
        setReviews(data.reviews);
      } else if (Array.isArray(data)) {
        setReviews(data);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.log("Failed to load reviews:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchReviews]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  // Compute stats
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

  const resolveImage = (url) => {
    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("file://")) return url;
    return `https://api.mehndigo.in${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const renderReview = ({ item }) => {
    const artistName = item.artist?.user?.name || item.artist_name || "Artist Profile";
    const initial = artistName[0]?.toUpperCase() || "A";
    const photos = Array.isArray(item.photos) ? item.photos : (typeof item.photos === 'string' ? JSON.parse(item.photos || "[]") : []);

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.reviewMeta}>
            <Text style={styles.reviewerName}>Reviewed: {artistName}</Text>
            <Text style={styles.reviewDate}>
              Booking Code: {item.booking?.booking_code || "N/A"}
            </Text>
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

        {/* Render Media */}
        {(item.video_url || photos.length > 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {item.video_url && (
              <View style={{ marginRight: 8, position: "relative" }}>
                <Image 
                  source={{ uri: resolveImage(item.video_thumbnail) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300" }} 
                  style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: "#f0f0f0" }} 
                />
                <View style={{ position: "absolute", top: "50%", left: "50%", marginLeft: -12, marginTop: -12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 4 }}>
                  <Ionicons name="play" size={16} color="#fff" />
                </View>
              </View>
            )}
            {photos.map((photo, pIdx) => (
              <Image 
                key={pIdx} 
                source={{ uri: resolveImage(photo) }} 
                style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8, backgroundColor: "#f0f0f0" }} 
              />
            ))}
          </ScrollView>
        )}
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
        <Text style={styles.headerTitle}>My Reviews</Text>
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
              <Text style={styles.averageRating}>{avgRating}</Text>
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
              <Text style={styles.totalReviews}>{total} Reviews Submitted</Text>
              <View style={styles.breakdownContainer}>{ratingBreakdown.map(renderRatingBar)}</View>
            </View>
            <Text style={styles.sectionTitle}>Review Logs</Text>
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
  listContent: { paddingBottom: 40 },
  summaryCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  averageRating: { fontSize: 44, fontWeight: "800", color: Colors.text },
  starsRow: { flexDirection: "row", gap: 4, marginTop: 6 },
  totalReviews: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  breakdownContainer: { width: "100%", marginTop: 16 },
  breakdownRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  starLabel: { width: 50, fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  barContainer: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.background, marginHorizontal: 10, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, backgroundColor: Colors.warning },
  percentageLabel: { width: 30, fontSize: 12, color: Colors.textSecondary, textAlign: "right", fontWeight: "600" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  reviewCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: Colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  reviewHeader: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 16, fontWeight: "800", color: Colors.white },
  reviewMeta: { flex: 1, marginLeft: 10 },
  reviewerName: { fontSize: 13, fontWeight: "700", color: Colors.text },
  reviewDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  reviewStars: { flexDirection: "row", gap: 1 },
  reviewText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginTop: 10 }
});
