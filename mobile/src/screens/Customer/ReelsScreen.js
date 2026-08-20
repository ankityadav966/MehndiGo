import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  Image,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import {
  getReels,
  likePortfolio,
  unlikePortfolio,
  commentPortfolio,
  getPortfolioComments,
  addViewToPortfolio,
  sharePortfolio
} from "../../services/customer";
import { createArtistDeepLink } from "../../services/deepLink";

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get("window");

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 60
};

const resolveMedia = (url) => {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }
  return `https://api.mehndigo.in${url.startsWith("/") ? "" : "/"}${url}`;
};

const ReelItem = ({
  item,
  isActive,
  isFocused,
  itemHeight,
  itemWidth,
  onNavigateToArtist,
  onOpenComments
}) => {
  const [isLiked, setIsLiked] = useState(item.isLiked || item.is_liked || false);
  const [likesCount, setLikesCount] = useState(Number(item.likes_count || item.likes || 0));
  const [paused, setPaused] = useState(false);

  const videoUri = resolveMedia(item.video_url);
  const posterUri = resolveMedia(item.thumbnail_url || item.image_url || item.artist_avatar);

  // Initialize expo-video player with valid media source
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.showsPlaybackControls = false;
    p.muted = false;
  });

  const hasViewed = useRef(false);

  // Update media source if video_url changes dynamically
  useEffect(() => {
    if (videoUri && player) {
      try {
        if (typeof player.replaceAsync === "function") {
          player.replaceAsync(videoUri).catch((err) => {
            console.log("Player replaceAsync notice:", err.message);
          });
        } else if (typeof player.replace === "function") {
          player.replace(videoUri);
        }
      } catch (err) {
        console.log("Player replace notice:", err.message);
      }
    }
  }, [videoUri, player]);

  // Handle active playback lifecycle
  useEffect(() => {
    if (!player) return;

    if (isActive && isFocused && !paused) {
      try {
        player.play();
      } catch (err) {
        console.log("Player play notice:", err.message);
      }

      if (!hasViewed.current && item.id) {
        hasViewed.current = true;
        addViewToPortfolio(item.id).catch(() => {});
      }
    } else {
      try {
        player.pause();
      } catch (err) {
        console.log("Player pause notice:", err.message);
      }
    }
  }, [isActive, isFocused, paused, player, item.id]);

  const togglePlayPause = () => {
    if (!player) return;
    if (player.playing) {
      player.pause();
      setPaused(true);
    } else {
      player.play();
      setPaused(false);
    }
  };

  const handleLike = async () => {
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
        await unlikePortfolio(item.id);
      } else {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        await likePortfolio(item.id);
      }
    } catch (_error) {
      setIsLiked(item.isLiked || item.is_liked || false);
      setLikesCount(Number(item.likes_count || item.likes || 0));
    }
  };

  const handleShare = async () => {
    try {
      const artId = item.artist_id || item.artistProfileId;
      const shareUrl = artId ? createArtistDeepLink(artId) : (videoUri || item.video_url || "https://mehendigoo.com");
      await Share.share({
        message: `Check out this stunning Mehndi design by ${item.artist_name || "Mehndi Artist"} on MehndiGo!\n\nView Artist: ${shareUrl}`,
        title: `Mehndi Design by ${item.artist_name || "Artist"}`,
        url: shareUrl
      });
    } catch (error) {
      console.log("Error sharing reel:", error);
    }
  };

  const heightStyle = { height: itemHeight || WINDOW_HEIGHT, width: itemWidth || WINDOW_WIDTH };

  return (
    <View style={[styles.reelContainer, heightStyle]}>
      {/* 1. Poster / Thumbnail Background (Fallback layer) */}
      {posterUri ? (
        <Image
          source={{ uri: posterUri }}
          style={[styles.videoSurface, heightStyle]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.videoSurface, heightStyle, { backgroundColor: "#111827" }]} />
      )}

      {/* 2. Native Video Surface Layer (ExoPlayer SurfaceView on Android) */}
      {videoUri ? (
        <VideoView
          style={[styles.videoSurface, heightStyle]}
          player={player}
          allowsFullscreen={false}
          nativeControls={false}
          contentFit="cover"
          showsPlaybackControls={false}
        />
      ) : null}

      {/* 3. Transparent Touch Layer for Play / Pause Gestures */}
      <Pressable style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]} onPress={togglePlayPause} />

      {/* 4. Luxury Dark Gradient Overlay for High Readability */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.88)"]}
        locations={[0.45, 0.7, 1]}
        style={styles.gradientOverlay}
        pointerEvents="box-none"
      >
        {/* Left Content (Artist, Caption, Booking CTA) */}
        <View style={styles.leftOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.artistInfo}
            onPress={() => onNavigateToArtist(item.artist_id)}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: resolveMedia(item.artist_avatar || item.artist_profile_image) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150"
              }}
              style={styles.artistAvatar}
            />
            <View>
              <View style={styles.artistNameRow}>
                <Text style={styles.artistName}>@{item.artist_name || "mehndi_artist"}</Text>
                <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginLeft: 4 }} />
              </View>
              {item.city || item.artist_city ? (
                <Text style={styles.artistLocation}>📍 {item.city || item.artist_city}</Text>
              ) : null}
            </View>
          </TouchableOpacity>

          {item.title ? (
            <Text style={styles.caption} numberOfLines={2}>
              {item.title}
            </Text>
          ) : null}

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Book Artist Direct CTA */}
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => onNavigateToArtist(item.artist_id)}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.bookButtonText}>Book This Artist</Text>
          </TouchableOpacity>
        </View>

        {/* Right Actions (Like, Comment, Share, Avatar Profile) */}
        <View style={styles.rightOverlay} pointerEvents="box-none">
          <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.7}>
            <View style={[styles.actionIconCircle, isLiked && styles.actionIconCircleLiked]}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={26}
                color={isLiked ? "#E91E63" : "#FFFFFF"}
              />
            </View>
            <Text style={styles.actionText}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onOpenComments(item.id)} activeOpacity={0.7}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionText}>Comments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.7}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigateToArtist(item.artist_id)}
            activeOpacity={0.8}
          >
            <View style={styles.profileButtonContainer}>
              <Image
                source={{
                  uri: resolveMedia(item.artist_avatar || item.artist_profile_image) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150"
                }}
                style={styles.profileButtonAvatar}
              />
              <View style={styles.plusIconContainer}>
                <Ionicons name="add" size={12} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* 5. Play / Pause Indicator */}
      {paused && (
        <View style={styles.pauseIconContainer} pointerEvents="none">
          <View style={styles.pauseCircle}>
            <Ionicons name="play" size={44} color="#FFFFFF" />
          </View>
        </View>
      )}
    </View>
  );
};

export default function ReelsScreen({ navigation }) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(true);
  const [error, setError] = useState(null);

  // Dynamic layout measurement to adapt to device screen & bottom tab
  const [containerHeight, setContainerHeight] = useState(WINDOW_HEIGHT);
  const [containerWidth, setContainerWidth] = useState(WINDOW_WIDTH);

  // Comments state
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [activeReelId, setActiveReelId] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  const fetchReels = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum > 1) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const res = await getReels(pageNum, 10);
      const reelsArray = res.reels || res.data?.reels || res.data || [];
      const validReels = reelsArray.filter(
        (r) => r.video_url && typeof r.video_url === "string" && r.video_url.trim() !== "" && r.video_url !== "null"
      );

      if (pageNum === 1) {
        setReels(validReels);
      } else {
        setReels((prev) => [...prev, ...validReels]);
      }

      setHasMore(res.hasMore ?? (validReels.length === 10));
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      if (pageNum === 1) setError("Unable to load Reels. Please check connection.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchReels(1);
    });
    return unsubscribe;
  }, [navigation, fetchReels]);

  const handleLayout = (e) => {
    const { height, width } = e.nativeEvent.layout;
    if (height > 0 && Math.abs(height - containerHeight) > 1) {
      setContainerHeight(height);
    }
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchReels(page + 1);
    }
  };

  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const navigateToArtist = (artistId) => {
    if (!artistId) return;
    navigation.navigate("ArtistProfile", { artistId });
  };

  const openComments = async (reelId) => {
    setActiveReelId(reelId);
    setCommentsModalVisible(true);
    setLoadingComments(true);
    setComments([]);
    try {
      const res = await getPortfolioComments(reelId, 1, 50);
      setComments(res.data || res.comments || []);
    } catch (err) {
      console.log("Error loading comments", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !activeReelId) return;
    setSubmittingComment(true);
    try {
      const newComment = await commentPortfolio(activeReelId, commentText);
      setComments((prev) => [
        {
          id: newComment.id || Date.now(),
          text: commentText,
          user: { name: "You", profile_image: null },
          created_at: new Date().toISOString()
        },
        ...prev
      ]);
      setCommentText("");
      Keyboard.dismiss();
    } catch (err) {
      console.log("Error submitting comment", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading && page === 1) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.loadingText}>Loading Mehndi Reels...</Text>
      </View>
    );
  }

  if (error && reels.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchReels(1)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="videocam-outline" size={64} color="#6B7280" />
        <Text style={styles.emptyTitle}>No Reels Yet</Text>
        <Text style={styles.emptySub}>Artists will upload video henna portfolios soon.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <FlatList
        data={reels}
        keyExtractor={(item, index) => String(item.id || index)}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            isActive={index === activeIndex}
            isFocused={isFocused}
            itemHeight={containerHeight}
            itemWidth={containerWidth}
            onNavigateToArtist={navigateToArtist}
            onOpenComments={openComments}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={false}
        snapToInterval={containerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: containerHeight,
          offset: containerHeight * index,
          index
        })}
      />

      {/* Comments Bottom Sheet Modal */}
      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentsModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={() => setCommentsModalVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#212121" />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator style={{ margin: 20 }} color="#E91E63" />
            ) : comments.length === 0 ? (
              <Text style={styles.noCommentsText}>No comments yet. Share your appreciation!</Text>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Image
                      source={{
                        uri: resolveMedia(item.user?.profile_image) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150"
                      }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUser}>{item.user?.name || "Customer"}</Text>
                      <Text style={styles.commentText}>{item.text || item.comment}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ padding: 16 }}
              />
            )}

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !commentText.trim() && { opacity: 0.5 }]}
                onPress={submitComment}
                disabled={submittingComment || !commentText.trim()}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  loadingText: {
    color: "#E2E8F0",
    fontSize: 13,
    marginTop: 10,
    fontWeight: "600"
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center"
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#E91E63",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12
  },
  emptySub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center"
  },
  reelContainer: {
    position: "relative",
    backgroundColor: "#000000",
    overflow: "hidden"
  },
  videoSurface: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%"
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
    zIndex: 10
  },
  leftOverlay: {
    flex: 1,
    paddingRight: 16
  },
  artistInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  artistAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#E91E63",
    marginRight: 10
  },
  artistNameRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  artistName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  },
  artistLocation: {
    color: "#E2E8F0",
    fontSize: 11,
    marginTop: 1
  },
  caption: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  },
  description: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 16,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E91E63",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: "flex-start",
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  rightOverlay: {
    alignItems: "center",
    gap: 16
  },
  actionButton: {
    alignItems: "center"
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)"
  },
  actionIconCircleLiked: {
    backgroundColor: "rgba(233, 30, 99, 0.3)",
    borderColor: "#E91E63"
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  profileButtonContainer: {
    alignItems: "center",
    justifyContent: "center"
  },
  profileButtonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FFFFFF"
  },
  plusIconContainer: {
    position: "absolute",
    bottom: -4,
    backgroundColor: "#E91E63",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  pauseIconContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20
  },
  pauseCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: WINDOW_HEIGHT * 0.65,
    paddingBottom: 20
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121"
  },
  noCommentsText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 13,
    marginVertical: 24
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 12
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10
  },
  commentContent: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 12
  },
  commentUser: {
    fontSize: 12,
    fontWeight: "700",
    color: "#212121"
  },
  commentText: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6"
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: "#212121",
    maxHeight: 80
  },
  sendButton: {
    backgroundColor: "#E91E63",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8
  }
});
