import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Share,
  ScrollView,
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { getNormalizedUrl } from "../../services/api";
import { savePortfolioItem, unsavePortfolioItem, likePortfolioItem } from "../../services/customer";
import { createDesignDeepLink } from "../../services/deepLink";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const resolveImage = (uri) => {
  if (!uri || typeof uri !== "string") return "";
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

export default function DesignDetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    artistId,
    serviceId,
    initialDesignIndex = 0,
    designs = [],
    artist = {},
    service = {}
  } = route.params || {};

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialDesignIndex), Math.max(0, designs.length - 1))
  );
  const [saved, setSaved] = useState({});
  const [liked, setLiked] = useState({});
  const [likeCounts, setLikeCounts] = useState({});

  const flatListRef = useRef(null);

  const currentDesign = designs[currentIndex] || {};

  const handleToggleLike = async (designId) => {
    try {
      const isLiked = liked[designId];
      setLiked(prev => ({ ...prev, [designId]: !isLiked }));
      setLikeCounts(prev => ({
        ...prev,
        [designId]: (prev[designId] || currentDesign.likes_count || 0) + (isLiked ? -1 : 1)
      }));
      await likePortfolioItem(designId).catch(() => {});
    } catch (e) {
      if (__DEV__) console.log("Like error:", e.message);
    }
  };

  const handleToggleSave = async (designId) => {
    try {
      const isSaved = saved[designId];
      setSaved(prev => ({ ...prev, [designId]: !isSaved }));
      if (isSaved) {
        await unsavePortfolioItem(designId).catch(() => {});
      } else {
        await savePortfolioItem(designId).catch(() => {});
      }
    } catch (e) {
      if (__DEV__) console.log("Save error:", e.message);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = createDesignDeepLink(artistId, currentDesign.id);
      const artistName = artist.name || "Mehndi Artist";
      await Share.share({
        title: `${currentDesign.title || "Mehndi Design"} by ${artistName}`,
        message: `Look at this incredible ${currentDesign.title || "Mehndi Design"} by ${artistName} on MehndiGo!\n\nView Design: ${shareUrl}`,
        url: shareUrl
      });
    } catch (e) {
      if (__DEV__) console.log("Share error:", e.message);
    }
  };

  const handleBookThisDesign = () => {
    navigation.navigate("SelectDate", {
      artistId: artistId || artist.id,
      serviceId: serviceId || service.id || currentDesign.service_id,
      selectedArt: {
        id: currentDesign.id,
        title: currentDesign.title || service.specialization_name || "Mehndi Design",
        image_url: currentDesign.image_url || currentDesign.url,
        art_tier: currentDesign.art_tier || "STANDARD",
        duration_minutes: currentDesign.duration_minutes || service.duration_minutes || 60,
        price: currentDesign.price || service.minimum_price || service.price || 0
      }
    });
  };

  const handleRequestSimilar = () => {
    navigation.navigate("CustomDesignRequest", {
      artistId: artistId || artist.id,
      serviceId: serviceId || service.id,
      serviceTitle: service.specialization_name,
      artist,
      initialReference: currentDesign.image_url || currentDesign.url,
      preferredStyle: currentDesign.category || currentDesign.occasion || "Custom Inspired"
    });
  };

  const onScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index >= 0 && index < designs.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const currentLikes = likeCounts[currentDesign.id] !== undefined
    ? likeCounts[currentDesign.id]
    : Number(currentDesign.likes_count || 0);

  const isCurrentSaved = Boolean(saved[currentDesign.id]);
  const isCurrentLiked = Boolean(liked[currentDesign.id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Full-Screen Swipeable Image Carousel */}
      <FlatList
        ref={flatListRef}
        data={designs.length > 0 ? designs : [{ id: 1, image_url: currentDesign.image_url }]}
        keyExtractor={(item, index) => `detail-img-${item.id || index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.min(initialDesignIndex, Math.max(0, designs.length - 1))}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index
        })}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={styles.imageSlide}>
            <Image
              source={{ uri: resolveImage(item.image_url || item.url) }}
              style={styles.fullImage}
              resizeMode="cover"
            />
            {/* Top overlay shadow for contrast */}
            <View style={styles.topShadowOverlay} />
          </View>
        )}
      />

      {/* Floating Header */}
      <View style={[styles.topHeader, { top: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.glassCircleBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Counter Badge */}
        {designs.length > 1 && (
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{currentIndex + 1} / {designs.length}</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity style={styles.glassCircleBtn} onPress={() => handleToggleLike(currentDesign.id)}>
            <Ionicons name={isCurrentLiked ? "heart" : "heart-outline"} size={22} color={isCurrentLiked ? "#E11D48" : "#FFFFFF"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.glassCircleBtn} onPress={() => handleToggleSave(currentDesign.id)}>
            <Ionicons name={isCurrentSaved ? "bookmark" : "bookmark-outline"} size={22} color={isCurrentSaved ? "#F59E0B" : "#FFFFFF"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.glassCircleBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Floating Info Sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.38 }}>
          {/* Tier & Complexity Badges */}
          <View style={styles.tagRow}>
            <View style={[
              styles.tierTag,
              currentDesign.art_tier === "BRIDAL_EXCLUSIVE" ? styles.bridalTag :
              currentDesign.art_tier === "PREMIUM" ? styles.premiumTag : styles.standardTag
            ]}>
              <Text style={styles.tierTagText}>
                {currentDesign.art_tier === "BRIDAL_EXCLUSIVE" ? "👑 Bridal Masterpiece" :
                 currentDesign.art_tier === "PREMIUM" ? "💎 Premium Art" : "✨ Standard Design"}
              </Text>
            </View>
            {currentDesign.complexity_level && (
              <View style={styles.complexityTag}>
                <Text style={styles.complexityTagText}>{currentDesign.complexity_level}</Text>
              </View>
            )}
            {currentDesign.occasion && (
              <View style={styles.occasionTag}>
                <Text style={styles.occasionTagText}>🎉 {currentDesign.occasion}</Text>
              </View>
            )}
          </View>

          {/* Title & Artist */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.designTitle}>
                {currentDesign.title || service.specialization_name || "Exquisite Mehndi Art"}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("ArtistProfile", { artistId: artist.id || artistId })}
                style={styles.artistLinkRow}
              >
                <Text style={styles.artistLinkText}>Crafted by {artist.name || "Mehndi Artist"}</Text>
                <Ionicons name="chevron-forward" size={14} color="#C084FC" />
              </TouchableOpacity>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Estimated</Text>
              <Text style={styles.priceValue}>₹{currentDesign.price || service.minimum_price || 0}</Text>
            </View>
          </View>

          {/* Specs bar */}
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Ionicons name="time-outline" size={15} color="#94A3B8" />
              <Text style={styles.specText}>{currentDesign.duration_minutes || 60} mins</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Ionicons name="heart-outline" size={15} color="#94A3B8" />
              <Text style={styles.specText}>{currentLikes} Likes</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Ionicons name="leaf-outline" size={15} color="#34D399" />
              <Text style={[styles.specText, { color: "#34D399" }]}>100% Organic Henna</Text>
            </View>
          </View>

          {/* Description */}
          {Boolean(currentDesign.description || currentDesign.caption) && (
            <Text style={styles.descriptionText}>
              {currentDesign.description || currentDesign.caption}
            </Text>
          )}
        </ScrollView>

        {/* CTA Buttons */}
        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleRequestSimilar}>
            <Ionicons name="color-palette-outline" size={18} color="#C084FC" />
            <Text style={styles.secondaryBtnText}>Request Similar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBookThisDesign}>
            <Text style={styles.primaryBtnText}>Book This Design</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  imageSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative"
  },
  fullImage: {
    width: "100%",
    height: "100%"
  },
  topShadowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.4)"
  },
  topHeader: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10
  },
  glassCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center"
  },
  counterPill: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)"
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)"
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 8
  },
  tierTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  standardTag: {
    backgroundColor: "rgba(255, 255, 255, 0.15)"
  },
  premiumTag: {
    backgroundColor: "#D97706"
  },
  bridalTag: {
    backgroundColor: "#BE123C"
  },
  tierTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "750"
  },
  complexityTag: {
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    borderWidth: 1,
    borderColor: "#7C3AED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  complexityTagText: {
    color: "#C084FC",
    fontSize: 11,
    fontWeight: "700"
  },
  occasionTag: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  occasionTagText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600"
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 4
  },
  designTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 22
  },
  artistLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  artistLinkText: {
    fontSize: 12,
    color: "#C084FC",
    fontWeight: "600"
  },
  priceContainer: {
    alignItems: "flex-end",
    marginLeft: 12
  },
  priceLabel: {
    fontSize: 10,
    color: "#94A3B8",
    textTransform: "uppercase",
    fontWeight: "600"
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "850",
    color: "#FBBF24",
    marginTop: 1
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    gap: 12
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  specText: {
    fontSize: 11,
    color: "#CBD5E1",
    fontWeight: "600"
  },
  specDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)"
  },
  descriptionText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 10,
    lineHeight: 17
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(192, 132, 252, 0.4)",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6
  },
  secondaryBtnText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700"
  },
  primaryBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 3
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  }
});
