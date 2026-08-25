import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ImageViewing from "react-native-image-viewing";
import Colors from "../../constants/Colors";
import { formatDate } from "../../utils/date";

export default function ArtistReviewsSection({ reviewsData, onPlayReviewVideo }) {
  const reviews = reviewsData?.reviews || [];
  const rating = Number(reviewsData?.avg_rating || 0);
  const total = Number(reviewsData?.total_reviews || reviews.length);
  const distribution = reviewsData?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const [helpfulVotes, setHelpfulVotes] = useState({});
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const toggleHelpful = (id) => {
    setHelpfulVotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenPhotoViewer = (photos, initialIndex = 0) => {
    const formatted = photos.map((p) => ({
      uri: typeof p === "string" ? p : p?.uri,
    }));
    setViewerImages(formatted);
    setViewerIndex(initialIndex);
    setViewerVisible(true);
  };

  if (!reviews || reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbox-ellipses-outline" size={40} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>No Reviews Yet</Text>
        <Text style={styles.emptyText}>
          Genuine customer reviews and verified photos will appear here once clients complete their mehndi appointments.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Customer Reviews</Text>
        {total > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.ratingText}>{rating.toFixed(1)} ({total})</Text>
          </View>
        )}
      </View>

      {/* Rating Breakdown Progress Bars - Computed Strictly from Real Database Data */}
      <View style={styles.breakdownCard}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

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

      {/* Individual Real Customer Review Cards */}
      {reviews.map((item, index) => {
        const id = item.id || index;
        const userName = item.user?.name || item.reviewer?.name || item.customer_name || "Verified Client";
        const userAvatar = item.user?.profile_image || item.reviewer?.profile_image || item.customer_avatar;
        const initial = userName.trim()[0]?.toUpperCase() || "C";
        const reviewText = item.comment || item.review_text || "";
        const score = Math.min(5, Math.max(1, Number(item.rating || 5)));
        const isHelpful = !!helpfulVotes[id];
        const reviewDate = item.created_at ? formatDate(item.created_at) : "Recent";
        
        let photos = [];
        if (Array.isArray(item.photos)) {
          photos = item.photos;
        } else if (typeof item.photos === "string" && item.photos.trim() !== "") {
          try {
            photos = JSON.parse(item.photos);
          } catch (_) {
            photos = [];
          }
        }

        const videoThumb = item.video_thumbnail || (item.video_url ? item.video_url.replace(/\.[^/.]+$/, ".jpg") : null);

        return (
          <View key={id} style={styles.reviewCard}>
            <View style={styles.cardHeader}>
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{userName}</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#059669" />
                    <Text style={styles.verifiedText}>Verified Booking</Text>
                  </View>
                </View>

                <View style={styles.subInfoRow}>
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
                  <Text style={styles.reviewDate}>{reviewDate}</Text>
                </View>
              </View>
            </View>

            {Boolean(reviewText) && (
              <Text style={styles.comment}>{reviewText}</Text>
            )}

            {/* Attached Real Photos with Fullscreen Click-to-Zoom */}
            {photos.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                  {photos.map((pUrl, pIdx) => (
                    <TouchableOpacity
                      key={pIdx}
                      activeOpacity={0.85}
                      onPress={() => handleOpenPhotoViewer(photos, pIdx)}
                      style={styles.photoThumbContainer}
                    >
                      <Image source={{ uri: pUrl }} style={styles.photoThumb} />
                      <View style={styles.photoZoomOverlay}>
                        <Ionicons name="expand-outline" size={12} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Attached Short Video Review with Visual Preview */}
            {Boolean(item.video_url) && (
              <TouchableOpacity
                style={styles.videoCardContainer}
                activeOpacity={0.85}
                onPress={() => onPlayReviewVideo && onPlayReviewVideo(item.video_url, userName, videoThumb)}
              >
                {videoThumb ? (
                  <Image source={{ uri: videoThumb }} style={styles.videoPoster} />
                ) : (
                  <View style={styles.videoFallbackBg}>
                    <Ionicons name="videocam" size={24} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.videoOverlay}>
                  <View style={styles.videoPlayCircle}>
                    <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                  </View>
                  <View style={styles.videoInfoCol}>
                    <Text style={styles.videoTitle}>Short Video Review</Text>
                    <Text style={styles.videoSub}>Watch authentic henna outcome (15-60s)</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Helpful Vote Button */}
            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={[styles.helpfulBtn, isHelpful && styles.helpfulBtnActive]}
                onPress={() => toggleHelpful(id)}
              >
                <Ionicons
                  name={isHelpful ? "thumbs-up" : "thumbs-up-outline"}
                  size={13}
                  color={isHelpful ? (Colors.primary || "#9C1344") : "#6B7280"}
                />
                <Text style={[styles.helpfulText, isHelpful && styles.helpfulTextActive]}>
                  Helpful {isHelpful ? "(1)" : ""}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Full-Screen Image Viewing Modal with Pinch to Zoom and Swipe */}
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
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
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  starLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    width: 32,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#FFB800",
    borderRadius: 3,
  },
  barCount: {
    fontSize: 11,
    color: "#64748B",
    width: 24,
    textAlign: "right",
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C3AED",
  },
  headerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  comment: {
    fontSize: 13,
    lineHeight: 19,
    color: "#334155",
    marginTop: 10,
  },
  photosScroll: {
    flexDirection: "row",
  },
  photoThumbContainer: {
    position: "relative",
    marginRight: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  photoZoomOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 3,
    borderRadius: 4,
  },
  videoCardContainer: {
    marginTop: 10,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1E1B4B",
    justifyContent: "center",
  },
  videoPoster: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
    resizeMode: "cover",
  },
  videoFallbackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2E1065",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.6,
  },
  videoOverlay: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  videoPlayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary || "#9C1344",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  videoInfoCol: {
    marginLeft: 10,
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  videoSub: {
    fontSize: 10,
    color: "#E2E8F0",
    marginTop: 1,
  },
  cardFooter: {
    marginTop: 12,
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
    backgroundColor: "#F8FAFC",
  },
  helpfulBtnActive: {
    backgroundColor: "#FDF2F8",
  },
  helpfulText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  helpfulTextActive: {
    color: Colors.primary || "#9C1344",
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});
