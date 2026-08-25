import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, Image } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function isVideoItem(item) {
  if (!item) return false;
  if (item.video_url || item.isVideo || item.media_type === "video" || item.is_video) return true;
  const rawUrl = typeof item === "string" ? item : (item.image_url || item.url || item.media_url || "");
  return /\.(mp4|mov|webm|avi|mkv)$/i.test(rawUrl) || /\/video\/upload\//.test(rawUrl);
}

function resolveMediaUrl(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.video_url || item.image_url || item.url || item.uri || "";
}

function resolveThumbnailUrl(item) {
  if (!item) return "";
  if (typeof item === "string") {
    if (/\.(mp4|mov|webm|avi|mkv)$/i.test(item)) {
      return item.replace(/\.[^/.]+$/, ".jpg");
    }
    return item;
  }
  let img = item.thumbnail_url || item.image_url || item.url || item.uri || "";
  if (/\.(mp4|mov|webm|avi|mkv)$/i.test(img)) {
    img = img.replace(/\.[^/.]+$/, ".jpg");
  }
  return img;
}

// Modal Video Player Component
function PortfolioVideoModalPlayer({ videoUrl, posterUrl }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.showsPlaybackControls = true;
    try {
      p.play();
    } catch (_) {}
  });

  return (
    <View style={styles.modalVideoContainer}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : null}
      {player ? (
        <VideoView
          style={styles.modalVideoSurface}
          player={player}
          allowsFullscreen={true}
          showsPlaybackControls={true}
          contentFit="contain"
        />
      ) : null}
    </View>
  );
}

export default function ArtistPortfolioGrid({ portfolio = [], onSelectPhoto, onOpenVideoPlayer }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  if (!portfolio || portfolio.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={36} color="#CBD5E1" />
        <Text style={styles.emptyText}>No portfolio items uploaded yet.</Text>
      </View>
    );
  }

  // Divide portfolio into 2 staggered columns for Pinterest-style masonry
  const leftColumn = [];
  const rightColumn = [];

  const displayList = (portfolio || []).slice(0, 30);
  displayList.forEach((item, index) => {
    if (index % 2 === 0) leftColumn.push({ item, index });
    else rightColumn.push({ item, index });
  });

  const handleItemPress = (item, index) => {
    setSelectedItem(item);
    setModalVisible(true);
    if (onSelectPhoto) {
      const uri = resolveMediaUrl(item);
      onSelectPhoto(uri, index);
    }
  };

  const renderMasonryCard = ({ item, index }) => {
    const thumbUri = resolveThumbnailUrl(item);
    const isVideo = isVideoItem(item);
    const categoryTag = item.category || item.tag || (index % 3 === 0 ? "Bridal" : index % 3 === 1 ? "Arabic" : "Traditional");
    const itemHeight = index % 3 === 0 ? 220 : index % 3 === 1 ? 160 : 190;

    if (!thumbUri) return null;

    return (
      <TouchableOpacity
        key={item.id || index}
        style={[styles.masonryCard, { height: itemHeight }]}
        onPress={() => handleItemPress(item, index)}
        activeOpacity={0.88}
      >
        <Image
          source={{ uri: thumbUri }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {/* Video Play Overlay Badge */}
        {isVideo && (
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={36} color="#FFFFFF" />
          </View>
        )}

        {/* Category Tag Overlay */}
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{categoryTag}</Text>
        </View>

        {/* Tier Badge */}
        {item.art_tier && (
          <View style={[styles.tierBadge, item.art_tier === "PREMIUM" ? styles.tierPremium : styles.tierStandard]}>
            <Text style={styles.tierText}>
              {item.art_tier === "PREMIUM" ? "💎 Premium" : "✨ Standard"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const isSelectedVideo = selectedItem ? isVideoItem(selectedItem) : false;
  const selectedMediaUri = selectedItem ? resolveMediaUrl(selectedItem) : "";
  const selectedPosterUri = selectedItem ? resolveThumbnailUrl(selectedItem) : "";

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Portfolio Gallery ({portfolio.length})</Text>
        <Text style={styles.subtitle}>Photos & Video Reels</Text>
      </View>

      {/* 2-Column Pinterest Staggered Masonry Grid */}
      <View style={styles.masonryContainer}>
        <View style={styles.column}>{leftColumn.map(renderMasonryCard)}</View>
        <View style={styles.column}>{rightColumn.map(renderMasonryCard)}</View>
      </View>

      {/* Fullscreen Preview / Video Playback Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedItem && (
            <View style={styles.modalContent}>
              {isSelectedVideo ? (
                <PortfolioVideoModalPlayer
                  videoUrl={selectedMediaUri}
                  posterUrl={selectedPosterUri}
                />
              ) : (
                <Image
                  source={{ uri: selectedPosterUri || selectedMediaUri }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              )}

              {selectedItem.title ? <Text style={styles.modalTitle}>{selectedItem.title}</Text> : null}
              {selectedItem.description ? <Text style={styles.modalDesc}>{selectedItem.description}</Text> : null}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text || "#1D1D1D",
  },
  subtitle: {
    fontSize: 12,
    color: Colors.primary || "#9C1344",
    fontWeight: "600",
  },
  masonryContainer: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  masonryCard: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  tagBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tierBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierPremium: {
    backgroundColor: "rgba(112, 29, 219, 0.85)",
  },
  tierStandard: {
    backgroundColor: "rgba(16, 185, 129, 0.85)",
  },
  tierText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    alignItems: "center",
  },
  modalVideoContainer: {
    width: SCREEN_WIDTH * 0.92,
    height: SCREEN_HEIGHT * 0.6,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  modalVideoSurface: {
    width: "100%",
    height: "100%",
  },
  fullscreenImage: {
    width: SCREEN_WIDTH * 0.92,
    height: SCREEN_HEIGHT * 0.6,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 14,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 13,
    color: "#CBD5E1",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 8,
  },
});
