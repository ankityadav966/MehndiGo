import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import OptimizedImage from "../OptimizedImage";

function ArtistReviewsSection({ reviewsData }) {
  const reviews = reviewsData?.reviews || [];
  const rating = reviewsData?.avg_rating || 4.9;
  const total = reviewsData?.total_reviews || reviews.length;
  const distribution = reviewsData?.distribution || { 5: 14, 4: 3, 3: 1, 2: 0, 1: 0 };

  const [helpfulVotes, setHelpfulVotes] = useState({});

  const toggleHelpful = (id) => {
    setHelpfulVotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbox-ellipses-outline" size={36} color="#CBD5E1" />
        <Text style={styles.emptyText}>No customer reviews yet. Be the first to book!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color="#FFB800" />
          <Text style={styles.ratingText}>{Number(rating).toFixed(1)} ({total})</Text>
        </View>
      </View>

      {/* Rating Breakdown Progress Bars */}
      <View style={styles.breakdownCard}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const percentage = total > 0 ? (count / total) * 100 : star === 5 ? 80 : star === 4 ? 15 : 5;

          return (
            <View key={star} style={styles.barRow}>
              <Text style={styles.starLabel}>{star} ★</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${percentage}%` }]} />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Individual Review Cards */}
      {reviews.slice(0, 5).map((item, index) => {
        const id = item.id || index;
        const userName = item.user?.name || item.customer_name || "Verified Customer";
        const userAvatar = item.user?.profile_image;
        const reviewText = item.comment || item.review_text || "Exceptional service and beautiful mehndi design!";
        const score = item.rating || 5;
        const isHelpful = !!helpfulVotes[id];

        return (
          <View key={id} style={styles.reviewCard}>
            <View style={styles.cardHeader}>
              <OptimizedImage
                source={{ uri: userAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" }}
                style={styles.avatar}
                width={40}
                height={40}
              />
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{userName}</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.verifiedText}>Verified Booking</Text>
                  </View>
                </View>

                <View style={styles.starsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < score ? "star" : "star-outline"}
                      size={12}
                      color="#FFB800"
                    />
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.comment}>{reviewText}</Text>

            {/* Helpful Vote Button */}
            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={[styles.helpfulBtn, isHelpful && styles.helpfulBtnActive]}
                onPress={() => toggleHelpful(id)}
              >
                <Ionicons
                  name={isHelpful ? "thumbs-up" : "thumbs-up-outline"}
                  size={13}
                  color={isHelpful ? Colors.primary || "#9C1344" : "#6B7280"}
                />
                <Text style={[styles.helpfulText, isHelpful && styles.helpfulTextActive]}>
                  Helpful {isHelpful ? "(1)" : ""}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text || "#1D1D1D",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D97706",
  },
  breakdownCard: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 2,
  },
  starLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    width: 24,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#FFB800",
    borderRadius: 3,
  },
  barCount: {
    fontSize: 11,
    color: "#9CA3AF",
    width: 16,
    textAlign: "right",
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text || "#1D1D1D",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#065F46",
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  comment: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  helpfulBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
  },
  helpfulBtnActive: {
    backgroundColor: "#FFF1F5",
  },
  helpfulText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  helpfulTextActive: {
    color: Colors.primary || "#9C1344",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 8,
  },
});

export default React.memo(ArtistReviewsSection);
