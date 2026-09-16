import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ImageViewing from "react-native-image-viewing";
import Colors from "../../constants/Colors";
import { getCustomerReviews } from "../../services/customer";
import { getNormalizedUrl } from "../../services/api";

const resolveImage = (uri) => {
  if (!uri || typeof uri !== "string") return null;
  const trimmed = uri.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  return getNormalizedUrl(trimmed);
};

const getBookingCode = (item) => {
  if (!item) return "N/A";
  
  // Direct booking code string
  const direct =
    item.booking?.booking_code ||
    item.booking?.bookingCode ||
    item.booking?.booking_number ||
    item.booking_code ||
    item.bookingCode ||
    item.booking_number;

  if (
    direct &&
    typeof direct === "string" &&
    direct.trim() !== "" &&
    direct.trim().toUpperCase() !== "N/A"
  ) {
    return direct.trim();
  }

  // Try booking ID
  const bookingId = item.booking?.id || item.booking_id || item.bookingId;
  if (bookingId && !isNaN(Number(bookingId))) {
    return `MG-${String(bookingId).padStart(6, "0")}`;
  }

  // Fallback to review ID
  if (item.id) {
    return `MG-REV-${String(item.id).padStart(5, "0")}`;
  }

  return "N/A";
};

const formatReviewDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch (_) {
    return "";
  }
};

export default function ReviewsScreen({ navigation }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleOpenPhotoViewer = (photos, initialIndex = 0) => {
    const formatted = photos.map((p) => ({
      uri: resolveImage(p),
    }));
    setViewerImages(formatted);
    setViewerIndex(initialIndex);
    setViewerVisible(true);
  };

  const fetchReviews = useCallback(async () => {
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
      if (__DEV__) console.log("Failed to load reviews:", err.message);
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

  // Compute review statistics
  const total = reviews.length;
  const avgRating =
    total > 0
      ? (reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / total).toFixed(1)
      : "0.0";

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating || 5))));
    counts[star] = (counts[star] || 0) + 1;
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
    const artistName =
      item.artist?.user?.name ||
      item.artist?.name ||
      item.artist_name ||
      "Mehndi Artist";
    const initial = (artistName[0] || "A").toUpperCase();
    const artistAvatar =
      item.artist?.profile_image ||
      item.artist?.avatar ||
      item.artist?.user?.avatar ||
      item.artist_avatar ||
      null;
    const photos = Array.isArray(item.photos)
      ? item.photos
      : typeof item.photos === "string"
      ? JSON.parse(item.photos || "[]")
      : [];
    const artistId = item.artist_id || item.artist?.id || item.artist?.user_id;
    const videoThumb =
      item.video_thumbnail ||
      (item.video_url ? item.video_url.replace(/\.[^/.]+$/, ".jpg") : null);
    const bookingCode = getBookingCode(item);
    const formattedDate = formatReviewDate(item.created_at);
    const ratingValue = Number(item.rating || 5).toFixed(1);

    const hasDetailedScores =
      Boolean(item.design_quality) ||
      Boolean(item.punctuality) ||
      Boolean(item.professionalism);

    return (
      <View style={styles.reviewCard}>
        {/* Card Header: Artist Profile Info & Rating Pill */}
        <TouchableOpacity
          style={styles.reviewHeader}
          activeOpacity={artistId ? 0.75 : 1}
          onPress={() => {
            if (artistId) {
              navigation.navigate("ArtistProfile", { artistId });
            }
          }}
        >
          {/* Avatar Container with Image or Initial fallback */}
          <View style={styles.avatarContainer}>
            {artistAvatar ? (
              <Image
                source={{ uri: resolveImage(artistAvatar) }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>

          {/* Artist & Date Metadata */}
          <View style={styles.reviewMeta}>
            <View style={styles.artistNameRow}>
              <Text style={styles.artistName} numberOfLines={1}>
                {artistName}
              </Text>
              <Ionicons name="checkmark-circle" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
            </View>
            <View style={styles.artistSubRow}>
              <Text style={styles.artistRoleTag}>Artist</Text>
              {formattedDate ? (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.reviewDate}>{formattedDate}</Text>
                </>
              ) : null}
            </View>
          </View>

          {/* Golden Rating Pill */}
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={13} color="#D97706" />
            <Text style={styles.ratingScoreText}>{ratingValue}</Text>
          </View>
        </TouchableOpacity>

        {/* Booking Code Tag & Verification Status Row */}
        <View style={styles.tagStrip}>
          <View style={styles.bookingBadge}>
            <Ionicons name="receipt-outline" size={13} color={Colors.primary} />
            <Text style={styles.bookingBadgeText}>Booking ID: {bookingCode}</Text>
          </View>

          {item.status === "PENDING" ? (
            <View style={[styles.statusBadge, styles.statusPending]}>
              <Ionicons name="time-outline" size={11} color="#D97706" />
              <Text style={styles.statusTextPending}>Under Review</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusVerified]}>
              <Ionicons name="shield-checkmark" size={11} color="#059669" />
              <Text style={styles.statusTextVerified}>Verified Booking</Text>
            </View>
          )}
        </View>

        {/* Review Comment / Feedback */}
        <View style={styles.commentBox}>
          <Ionicons
            name="quote"
            size={13}
            color="rgba(156, 19, 68, 0.35)"
            style={styles.quoteIcon}
          />
          <Text style={styles.reviewComment}>
            {item.comment && item.comment.trim()
              ? item.comment.trim()
              : "No written comments provided."}
          </Text>
        </View>

        {/* Optional Detailed Service Scores (Quality, Punctuality, Service) */}
        {hasDetailedScores && (
          <View style={styles.detailedScoresRow}>
            {item.design_quality ? (
              <View style={styles.subScoreChip}>
                <Text style={styles.subScoreLabel}>Quality:</Text>
                <Text style={styles.subScoreVal}>{item.design_quality}★</Text>
              </View>
            ) : null}
            {item.punctuality ? (
              <View style={styles.subScoreChip}>
                <Text style={styles.subScoreLabel}>Punctual:</Text>
                <Text style={styles.subScoreVal}>{item.punctuality}★</Text>
              </View>
            ) : null}
            {item.professionalism ? (
              <View style={styles.subScoreChip}>
                <Text style={styles.subScoreLabel}>Professional:</Text>
                <Text style={styles.subScoreVal}>{item.professionalism}★</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Media Preview Gallery (Video & Photo Attachments) */}
        {(item.video_url || photos.length > 0) && (
          <View style={styles.mediaContainer}>
            <Text style={styles.mediaLabel}>Attached Photos & Videos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaScrollContent}
            >
              {item.video_url && (
                <TouchableOpacity
                  style={styles.videoCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("VideoPlayer", {
                      videoUrl: item.video_url,
                      posterUrl: resolveImage(videoThumb),
                      title: `Review for ${artistName}`,
                    })
                  }
                >
                  {videoThumb ? (
                    <Image
                      source={{ uri: resolveImage(videoThumb) }}
                      style={styles.mediaThumbnail}
                    />
                  ) : (
                    <View style={styles.videoPlaceholder}>
                      <Ionicons name="videocam" size={24} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.playOverlay}>
                    <View style={styles.playIconCircle}>
                      <Ionicons name="play" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
                    </View>
                  </View>
                  <View style={styles.videoBadge}>
                    <Text style={styles.videoBadgeText}>VIDEO</Text>
                  </View>
                </TouchableOpacity>
              )}

              {photos.map((photo, pIdx) => (
                <TouchableOpacity
                  key={pIdx}
                  activeOpacity={0.85}
                  style={styles.photoCard}
                  onPress={() => handleOpenPhotoViewer(photos, pIdx)}
                >
                  <Image
                    source={{ uri: resolveImage(photo) }}
                    style={styles.mediaThumbnail}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your reviews...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
        renderItem={renderReview}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="star-outline" size={38} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Reviews Yet</Text>
              <Text style={styles.emptySubtitle}>
                You have not submitted any reviews for your Mehndi bookings yet. Completed bookings will appear here for you to rate.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate("MyBookings")}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionText}>View My Bookings</Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListHeaderComponent={
          <>
            {/* Rating Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.ratingScoreBlock}>
                  <Text style={styles.averageRating}>{avgRating}</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= Math.round(Number(avgRating)) ? "star" : "star-outline"}
                        size={15}
                        color={star <= Math.round(Number(avgRating)) ? "#F59E0B" : "#E2E8F0"}
                      />
                    ))}
                  </View>
                  <Text style={styles.totalReviewsCount}>
                    {total} {total === 1 ? "Review" : "Reviews"} Shared
                  </Text>
                </View>

                {/* Vertical Divider */}
                <View style={styles.summaryDivider} />

                {/* Rating Distribution Bars */}
                <View style={styles.breakdownContainer}>
                  {ratingBreakdown.map(renderRatingBar)}
                </View>
              </View>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons name="document-text" size={17} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Review Logs</Text>
              </View>
              {total > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {total} {total === 1 ? "entry" : "entries"}
                  </Text>
                </View>
              )}
            </View>
          </>
        }
      />

      {/* Full-Screen Image Viewer Modal */}
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background || "#FFF8FA",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background || "#FFF8FA",
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 10,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(156, 19, 68, 0.08)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(156, 19, 68, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  listContent: {
    paddingBottom: 40,
  },

  // Summary Card
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(156, 19, 68, 0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#9C1344",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingScoreBlock: {
    alignItems: "center",
    justifyContent: "center",
    width: 105,
    paddingRight: 8,
  },
  averageRating: {
    fontSize: 38,
    fontWeight: "800",
    color: "#1F2937",
    lineHeight: 44,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  totalReviewsCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 5,
    fontWeight: "600",
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    height: 80,
    backgroundColor: "rgba(156, 19, 68, 0.08)",
    marginHorizontal: 6,
  },
  breakdownContainer: {
    flex: 1,
    paddingLeft: 8,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  barLabel: {
    width: 24,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  progressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  percentageText: {
    width: 32,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "right",
    fontWeight: "600",
  },

  // Section Header Row
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: "rgba(156, 19, 68, 0.07)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
  },

  // Review Card
  reviewCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(156, 19, 68, 0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#9C1344",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(156, 19, 68, 0.15)",
    backgroundColor: "rgba(156, 19, 68, 0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(156, 19, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
  },
  reviewMeta: {
    flex: 1,
    marginLeft: 12,
  },
  artistNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  artistName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#111827",
    maxWidth: "85%",
  },
  artistSubRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  artistRoleTag: {
    fontSize: 11.5,
    fontWeight: "600",
    color: Colors.primary,
  },
  dotSeparator: {
    fontSize: 11,
    color: "#9CA3AF",
    marginHorizontal: 5,
  },
  reviewDate: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // Rating Pill
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ratingScoreText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B45309",
  },

  // Tag Strip (Booking Code + Status)
  tagStrip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(156, 19, 68, 0.05)",
  },
  bookingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(156, 19, 68, 0.05)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(156, 19, 68, 0.12)",
  },
  bookingBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusVerified: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusTextVerified: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  statusPending: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  statusTextPending: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D97706",
  },

  // Comment Box
  commentBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FAF7F8",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(156, 19, 68, 0.04)",
  },
  quoteIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  reviewComment: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
    fontWeight: "400",
  },

  // Detailed Scores
  detailedScoresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  subScoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subScoreLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  subScoreVal: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "700",
  },

  // Media
  mediaContainer: {
    marginTop: 12,
  },
  mediaLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  mediaScrollContent: {
    gap: 8,
  },
  photoCard: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  videoCard: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  mediaThumbnail: {
    width: 86,
    height: 86,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: 86,
    height: 86,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  playIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(156, 19, 68, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyActionText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
