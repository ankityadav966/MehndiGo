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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import {
  getReels,
  getReelById,
  likePortfolio,
  unlikePortfolio,
  commentPortfolio,
  getPortfolioComments,
  addViewToPortfolio,
  sharePortfolio
} from "../../services/customer";
import { createReelDeepLink, createArtistDeepLink } from "../../services/deepLink";

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

const ActiveReelVideoPlayer = React.memo(({ videoUri, isActive, isFocused, paused, heightStyle }) => {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.showsPlaybackControls = false;
    p.muted = false;
  });

  useEffect(() => {
    if (!player) return;
    if (isActive && isFocused && !paused) {
      try {
        player.play();
      } catch (err) {
        if (__DEV__) console.log("Player play notice:", err.message);
      }
    } else {
      try {
        player.pause();
      } catch (err) {
        if (__DEV__) console.log("Player pause notice:", err.message);
      }
    }
  }, [isActive, isFocused, paused, player]);

  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.pause();
        } catch {}
      }
    };
  }, [player]);

  if (!player) return null;

  return (
    <VideoView
      player={player}
      style={[styles.videoSurface, heightStyle]}
      contentFit="cover"
      nativeControls={false}
    />
  );
});

const ReelItem = React.memo(({
  item,
  isActive,
  isFocused,
  itemHeight,
  itemWidth,
  onNavigateToArtist,
  onOpenComments,
  onToggleLike
}) => {
  const [isLiked, setIsLiked] = useState(Boolean(item.isLiked || item.is_liked));
  const [likesCount, setLikesCount] = useState(Number(item.likes_count ?? item.likesCount ?? item.likes ?? 0));
  const [paused, setPaused] = useState(false);
  const likingRef = useRef(false);
  const hasViewed = useRef(false);

  useEffect(() => {
    setIsLiked(Boolean(item.isLiked || item.is_liked));
    setLikesCount(Number(item.likes_count ?? item.likesCount ?? item.likes ?? 0));
  }, [item.isLiked, item.is_liked, item.likes_count, item.likesCount, item.likes]);

  useEffect(() => {
    if (isActive && isFocused && !hasViewed.current && item.id) {
      hasViewed.current = true;
      addViewToPortfolio(item.id).catch(() => {});
    }
  }, [isActive, isFocused, item.id]);

  const videoUri = resolveMedia(item.video_url);
  const posterUri = resolveMedia(item.thumbnail_url || item.image_url || item.artist_avatar);

  const togglePlayPause = () => {
    setPaused(prev => !prev);
  };

  const handleLike = async () => {
    if (likingRef.current) return;
    likingRef.current = true;

    const prevLiked = isLiked;
    const prevCount = likesCount;

    // Optimistic toggle
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    if (typeof onToggleLike === "function") {
      onToggleLike(item.id, nextLiked, nextCount);
    }

    try {
      if (prevLiked) {
        const res = await unlikePortfolio(item.id);
        const serverCount = res?.likes_count ?? res?.likesCount ?? res?.data?.likes_count;
        if (serverCount !== undefined) {
          const finalCount = Number(serverCount);
          setLikesCount(finalCount);
          if (typeof onToggleLike === "function") onToggleLike(item.id, false, finalCount);
        }
      } else {
        const res = await likePortfolio(item.id);
        const serverCount = res?.likes_count ?? res?.likesCount ?? res?.data?.likes_count;
        if (serverCount !== undefined) {
          const finalCount = Number(serverCount);
          setLikesCount(finalCount);
          if (typeof onToggleLike === "function") onToggleLike(item.id, true, finalCount);
        }
      }
    } catch (_error) {
      // Safe rollback on error
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      if (typeof onToggleLike === "function") {
        onToggleLike(item.id, prevLiked, prevCount);
      }
    } finally {
      likingRef.current = false;
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
      if (__DEV__) console.log("Error sharing reel:", error);
    }
  };

  const heightStyle = { height: itemHeight || WINDOW_HEIGHT, width: itemWidth || WINDOW_WIDTH };

  const insets = useSafeAreaInsets();
  const bottomBarClearance = 68 + (insets.bottom > 0 ? insets.bottom + 6 : 12) + 12;
  const currentCommentCount = Number(item.comments_count ?? item.commentCount ?? item.comments ?? 0);

  return (
    <View style={[styles.reelContainer, heightStyle]}>
      {/* 1. Poster / Thumbnail Background (Fallback & Instant Display) */}
      {posterUri ? (
        <Image
          source={{ uri: posterUri }}
          style={[styles.videoSurface, heightStyle]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.videoSurface, styles.placeholderSurface, heightStyle]}>
          <ActivityIndicator size="small" color="#E91E63" />
        </View>
      )}

      {/* 2. Active Video Player Layer - Only rendered on active reel to prevent Android OOM */}
      {isActive && isFocused && videoUri ? (
        <ActiveReelVideoPlayer
          videoUri={videoUri}
          isActive={isActive}
          isFocused={isFocused}
          paused={paused}
          heightStyle={heightStyle}
        />
      ) : null}

      {/* 3. Touch to Play / Pause layer */}
      <Pressable style={styles.touchableArea} onPress={togglePlayPause} />

      {/* 4. Overlay Content: Artist Metadata (Bottom-Left) & Action Icons (Bottom-Right) */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)"]}
        style={[styles.bottomGradient, { bottom: bottomBarClearance }]}
        pointerEvents="box-none"
      >
        {/* Left Info (Artist Avatar, Name, Category, Title/Caption) */}
        <View style={styles.leftInfoContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.artistRow}
            onPress={() => onNavigateToArtist(item.artist_id)}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: resolveMedia(item.artist_avatar || item.artist_profile_image) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"
              }}
              style={styles.artistAvatar}
            />
            <View style={styles.artistTextCol}>
              <View style={styles.artistNameBadgeRow}>
                <Text style={styles.artistName} numberOfLines={1}>
                  {item.artist_name || item.artist?.name || "Mehndi Specialist"}
                </Text>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.artistLocation} numberOfLines={1}>
                {item.artist?.location || "Jaipur, Rajasthan"} • ⭐ {item.artist?.rating || "5.0"}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.reelTitle} numberOfLines={2}>
            {item.title || item.caption || item.description || "Bridal Mehndi Masterpiece"}
          </Text>

          <View style={styles.categoryPillRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category || "Bridal Mehndi"}</Text>
            </View>
          </View>

          {/* Quick Book Artist CTA */}
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
            <Text style={styles.actionText}>{currentCommentCount}</Text>
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
});

export default function ReelsScreen({ navigation, route }) {
  const [reels, setReels] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(true);
  const [dimensions, setDimensions] = useState({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT
  });

  const insets = useSafeAreaInsets();
  const targetReelId = route?.params?.reelId || route?.params?.id;

  // Comments Sheet State
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
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      let targetReel = null;
      if (pageNum === 1 && targetReelId) {
        try {
          targetReel = await getReelById(targetReelId);
        } catch (e) {
          if (__DEV__) console.log("Could not fetch targeted deep-link reel directly:", e.message);
        }
      }

      const res = await getReels(pageNum, 10);
      const reelsArray = res.reels || res.data?.reels || res.data || [];
      let validReels = reelsArray.filter(
        (r) => r.video_url && typeof r.video_url === "string" && r.video_url.trim() !== ""
      );

      if (targetReel && targetReel.video_url) {
        validReels = [targetReel, ...validReels.filter(r => Number(r.id) !== Number(targetReel.id))];
      }

      if (pageNum === 1) {
        setReels(validReels);
        setActiveIndex(0);
      } else {
        setReels((prev) => [...prev, ...validReels]);
      }
      setPage(pageNum);
      setHasMore(res.hasMore ?? (validReels.length === 10));
    } catch (err) {
      if (__DEV__) console.log("Error fetching reels:", err.message);
      if (pageNum === 1) setError("Unable to load Reels. Please check connection.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [targetReelId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchReels(1);
    });
    return unsubscribe;
  }, [navigation, fetchReels]);

  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setDimensions({ width, height });
    }
  };

  const containerHeight = dimensions.height > 0 ? dimensions.height : WINDOW_HEIGHT;
  const containerWidth = dimensions.width > 0 ? dimensions.width : WINDOW_WIDTH;

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

  const handleToggleLike = useCallback((reelId, liked, count) => {
    setReels((prev) =>
      prev.map((r) =>
        r.id === reelId
          ? { ...r, isLiked: liked, is_liked: liked, likes_count: count, likesCount: count, likes: count }
          : r
      )
    );
  }, []);

  const openComments = async (reelId) => {
    setActiveReelId(reelId);
    setCommentsModalVisible(true);
    setLoadingComments(true);
    setComments([]);
    try {
      const res = await getPortfolioComments(reelId, 1, 50);
      const list = Array.isArray(res) ? res : (res?.comments || res?.data || []);
      setComments(list);
    } catch (err) {
      if (__DEV__) console.log("Error loading comments", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !activeReelId || submittingComment) return;
    const textToSubmit = commentText.trim();
    setSubmittingComment(true);
    try {
      const res = await commentPortfolio(activeReelId, textToSubmit);
      const returnedComment = res?.data || res || {};
      const newComment = {
        id: returnedComment.id || Date.now(),
        text: textToSubmit,
        comment: textToSubmit,
        user: {
          name: returnedComment.user?.name || "You",
          profile_image: returnedComment.user?.profile_image || null
        },
        created_at: returnedComment.created_at || new Date().toISOString()
      };
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
      Keyboard.dismiss();

      // Update comments count on active reel in reels array
      setReels((prev) =>
        prev.map((r) => {
          if (r.id === activeReelId) {
            const currentC = Number(r.comments_count ?? r.commentCount ?? r.comments ?? 0);
            return {
              ...r,
              comments_count: currentC + 1,
              commentCount: currentC + 1,
              comments: currentC + 1
            };
          }
          return r;
        })
      );
    } catch (err) {
      if (__DEV__) console.log("Error submitting comment", err);
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
            onToggleLike={handleToggleLike}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={2}
        removeClippedSubviews={Platform.OS === "android"}
        updateCellsBatchingPeriod={50}
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
        onRequestClose={() => {
          Keyboard.dismiss();
          setCommentsModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            setCommentsModalVisible(false);
          }}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments ({comments.length})</Text>
              <TouchableOpacity onPress={() => {
                Keyboard.dismiss();
                setCommentsModalVisible(false);
              }}>
                <Ionicons name="close" size={24} color="#212121" />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#E91E63" />
                <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 8 }}>Loading comments...</Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Ionicons name="chatbubble-ellipses-outline" size={36} color="#9CA3AF" />
                <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item, idx) => String(item.id || idx)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Image
                      source={{
                        uri: resolveMedia(item.user?.profile_image) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150"
                      }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={styles.commentUser}>{item.user?.name || "Customer"}</Text>
                        <Text style={{ fontSize: 10, color: "#9CA3AF" }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Just now"}
                        </Text>
                      </View>
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
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={submitComment}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!commentText.trim() || submittingComment) && { opacity: 0.5 }]}
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
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 30,
    zIndex: 10
  },
  leftInfoContainer: {
    flex: 1,
    paddingRight: 16
  },
  artistRow: {
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
  artistTextCol: {
    flex: 1
  },
  artistNameBadgeRow: {
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
  reelTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    lineHeight: 18,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  },
  categoryPillRow: {
    flexDirection: "row",
    marginBottom: 8
  },
  categoryPill: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.35)"
  },
  categoryPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700"
  },
  placeholderSurface: {
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center"
  },
  touchableArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5
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
