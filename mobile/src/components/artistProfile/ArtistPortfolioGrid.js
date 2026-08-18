import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import OptimizedImage from "../OptimizedImage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function ArtistPortfolioGrid({ portfolio = [], onSelectPhoto }) {
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

  const displayList = (portfolio || []).slice(0, 24);
  displayList.forEach((item, index) => {
    if (index % 2 === 0) leftColumn.push({ item, index });
    else rightColumn.push({ item, index });
  });

  const handleItemPress = (item, index) => {
    setSelectedItem(item);
    setModalVisible(true);
    if (onSelectPhoto) {
      const uri = typeof item === "string" ? item : item.image_url || item.url || item.uri;
      onSelectPhoto(uri, index);
    }
  };

  const renderMasonryCard = ({ item, index }) => {
    const imageUri = typeof item === "string" ? item : item.image_url || item.url || item.uri;
    const isVideo = !!(item.video_url || item.isVideo);
    const categoryTag = item.category || item.tag || (index % 3 === 0 ? "Bridal" : index % 3 === 1 ? "Arabic" : "Portrait");

    // Alternate aspect ratios for staggered Pinterest masonry aesthetic
    const itemHeight = index % 3 === 0 ? 220 : index % 3 === 1 ? 160 : 190;

    if (!imageUri) return null;

    return (
      <TouchableOpacity
        key={item.id || index}
        style={[styles.masonryCard, { height: itemHeight }]}
        onPress={() => handleItemPress(item, index)}
        activeOpacity={0.9}
      >
        <OptimizedImage
          source={{ uri: imageUri }}
          style={styles.cardImage}
          width={220}
          height={itemHeight}
        />

        {/* Video Overlay Badge */}
        {isVideo && (
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={32} color="#FFFFFF" />
          </View>
        )}

        {/* Category Tag Overlay */}
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{categoryTag}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Portfolio Gallery ({portfolio.length})</Text>
        <Text style={styles.subtitle}>Pinterest-Style Masonry</Text>
      </View>

      {/* 2-Column Pinterest Staggered Masonry Grid */}
      <View style={styles.masonryContainer}>
        <View style={styles.column}>{leftColumn.map(renderMasonryCard)}</View>
        <View style={styles.column}>{rightColumn.map(renderMasonryCard)}</View>
      </View>

      {/* Fullscreen Preview Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedItem && (
            <View style={styles.modalContent}>
              <OptimizedImage
                source={{
                  uri: typeof selectedItem === "string" ? selectedItem : selectedItem.image_url || selectedItem.url || selectedItem.uri,
                }}
                style={styles.fullscreenImage}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT * 0.7}
                resizeMode="contain"
              />
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
    fontSize: 11,
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
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
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
    fontWeight: "600",
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 99,
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
  fullscreenImage: {
    width: SCREEN_WIDTH * 0.92,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 16,
  },
  modalDesc: {
    color: "#D1D5DB",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});

export default React.memo(ArtistPortfolioGrid);
