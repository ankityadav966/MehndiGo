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
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { getReels, likePortfolio, unlikePortfolio, commentPortfolio, getPortfolioComments, addViewToPortfolio } from "../../services/customer";

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get("window");
// Approximate height for bottom tab to subtract from total height if necessary
// But if header is hidden and tab bar is absolute, the item should be full height.
const ITEM_HEIGHT = WINDOW_HEIGHT; 
const resolveMedia = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("file://")) return url;
  return `https://api.mehndigo.in${url.startsWith("/") ? "" : "/"}${url}`;
};

const ReelItem = ({ item, isActive, isFocused, shouldLoadVideo, onNavigateToArtist, onOpenComments }) => {
  const [isLiked, setIsLiked] = useState(item.isLiked || false);
  const [likesCount, setLikesCount] = useState(item.likes_count || 0);
  const [paused, setPaused] = useState(false);

  const player = useVideoPlayer(shouldLoadVideo ? resolveMedia(item.video_url) : null, (player) => {
    player.loop = true;
    player.showsPlaybackControls = false;
  });

  const hasViewed = useRef(false);

  useEffect(() => {
    if (isActive && isFocused && !paused) {
      player.play();
      if (!hasViewed.current) {
        hasViewed.current = true;
        addViewToPortfolio(item.id);
      }
    } else {
      player.pause();
    }
  }, [isActive, isFocused, paused, player]);

  const togglePlayPause = () => {
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
        setLikesCount(Math.max(0, likesCount - 1));
        await unlikePortfolio(item.id);
      } else {
        setIsLiked(true);
        setLikesCount(likesCount + 1);
        await likePortfolio(item.id);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this Mehndi design by ${item.artist?.user?.name || "an artist"} on MehndiGo!`,
        url: item.video_url, // URL fallback for iOS
      });
    } catch (error) {
      console.log("Error sharing", error);
    }
  };

  return (
    <View style={styles.reelContainer}>
      {shouldLoadVideo ? (
        <VideoView
          style={StyleSheet.absoluteFillObject}
          player={player}
          allowsFullscreen={false}
          nativeControls={false}
          showsPlaybackControls={false}
          contentFit="cover"
        />
      ) : (
        <Image 
          source={{ uri: resolveMedia(item.thumbnail_url || item.image_url || item.video_url) }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={togglePlayPause} />

      {/* Overlay UI */}
      <View style={styles.overlayContainer}>
        <View style={styles.leftOverlay}>
          <TouchableOpacity 
            style={styles.artistInfo}
            onPress={() => onNavigateToArtist(item.artist_id)}
          >
            <Image
              source={{ uri: resolveMedia(item.artist_avatar) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150" }}
              style={styles.artistAvatar}
            />
            <Text style={styles.artistName}>@{item.artist_name || "artist"}</Text>
          </TouchableOpacity>
          
          {item.title ? (
            <Text style={styles.caption} numberOfLines={2}>{item.title}</Text>
          ) : null}
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          ) : null}
          
          <TouchableOpacity 
            style={[styles.bookButton, { marginTop: 12, alignSelf: 'flex-start' }]}
            onPress={() => onNavigateToArtist(item.artist_id)}
          >
            <Text style={styles.bookButtonText}>Book Artist</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightOverlay}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={36}
              color={isLiked ? Colors.error : Colors.white}
            />
            <Text style={styles.actionText}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onOpenComments(item.id)}>
            <Ionicons name="chatbubble-outline" size={32} color={Colors.white} />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social" size={32} color={Colors.white} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onNavigateToArtist(item.artist_id)}
          >
            <View style={styles.profileButtonContainer}>
              <Image
                source={{ uri: resolveMedia(item.artist_avatar) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150" }}
                style={styles.profileButtonAvatar}
              />
              <View style={styles.plusIconContainer}>
                <Ionicons name="add" size={14} color={Colors.white} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      {/* Original Book Action Container removed */}

      {paused && (
        <View style={styles.pauseIconContainer} pointerEvents="none">
          <Ionicons name="play" size={64} color="rgba(255, 255, 255, 0.5)" />
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

  const fetchReels = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      setError(null);
      const res = await getReels(pageNum, 10);
      const reelsArray = res.reels || res.data || [];
      const validReels = reelsArray.filter((r) => r.video_url && typeof r.video_url === "string" && r.video_url.trim() !== "" && r.video_url !== "null");
      
      if (pageNum === 1) {
        setReels(validReels);
      } else {
        setReels((prev) => [...prev, ...validReels]);
      }
      
      setHasMore(res.hasMore ?? (validReels.length === 10));
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      if (pageNum === 1) setError("Unable to load Reels. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchReels(1);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      fetchReels(page + 1);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  });

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
      setComments(res.data || []);
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
      // Optimistic append
      setComments([{
        id: newComment.id,
        text: commentText,
        user: { name: "You", profile_image: null }, // Mock current user
        createdAt: new Date().toISOString()
      }, ...comments]);
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error && reels.length === 0) {
    return (
      <View style={styles.centerContainer}>
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
        <Ionicons name="videocam-outline" size={64} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No Reels Yet</Text>
        <Text style={styles.emptySub}>Artists haven't uploaded any video portfolios yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reels}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={({ item, index }) => (
          <ReelItem 
            item={item} 
            isActive={index === activeIndex} 
            shouldLoadVideo={Math.abs(index - activeIndex) <= 1}
            isFocused={isFocused}
            onNavigateToArtist={navigateToArtist}
            onOpenComments={openComments}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
      />

      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={() => setCommentsModalVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentsModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator style={{ margin: 20 }} color={Colors.primary} />
            ) : comments.length === 0 ? (
              <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Image 
                      source={{ uri: resolveMedia(item.user?.profile_image) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150" }} 
                      style={styles.commentAvatar} 
                    />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUser}>{item.user?.name || "User"}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
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
                placeholderTextColor={Colors.textTertiary}
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
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="send" size={20} color={Colors.white} />
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
    backgroundColor: Colors.black,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reelContainer: {
    width: WINDOW_WIDTH,
    height: ITEM_HEIGHT,
    backgroundColor: Colors.black,
  },
  overlayContainer: {
    position: "absolute",
    bottom: 90, // Leave space for bottom tab bar
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
  },
  leftOverlay: {
    flex: 1,
    paddingRight: 20,
  },
  artistInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  artistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.white,
    marginRight: 10,
  },
  artistName: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  caption: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  description: {
    color: Colors.white,
    fontSize: 13,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  rightOverlay: {
    alignItems: "center",
  },
  actionButton: {
    alignItems: "center",
    marginBottom: 20,
  },
  actionText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  profileButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileButtonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  plusIconContainer: {
    position: "absolute",
    bottom: -8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  pauseIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  bookActionContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  bookButtonText: {
    color: Colors.white,
    fontWeight: "bold",
    fontSize: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  bottomSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: WINDOW_HEIGHT * 0.6,
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  noCommentsText: {
    textAlign: "center",
    color: Colors.textTertiary,
    marginTop: 30,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: "bold",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: Colors.text,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.background,
    color: Colors.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    minHeight: 40,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  }
});
