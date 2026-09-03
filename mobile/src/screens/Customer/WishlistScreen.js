import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import Alert from "../../utils/Alert";
import { getCustomerWishlist, removeArtistFavorite } from "../../services/customer";
import OptimizedImage from "../../components/OptimizedImage";
import Config from "../../constants/Config";

export default function WishlistScreen({ navigation }) {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await getCustomerWishlist();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.rows)
        ? res.rows
        : Array.isArray(res?.favorites)
        ? res.favorites
        : [];
      setWishlist(list);
    } catch (err) {
      if (__DEV__) console.log("Failed to fetch customer wishlist:", err.message);
      setWishlist([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Back handling: If subscreen -> goBack(), If tab -> switch to Home tab
  useEffect(() => {
    const { BackHandler } = require("react-native");
    const unsubscribeFocus = navigation.addListener("focus", () => {
      fetchWishlist();
    });

    const onBackPress = () => {
      if (navigation?.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("CustomerTabs", { screen: "Home" });
      }
      return true;
    };

    const backSub = BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () => {
      unsubscribeFocus();
      backSub.remove();
    };
  }, [navigation, fetchWishlist]);

  const handleRemoveFavorite = async (artistId) => {
    try {
      // Optimistic removal
      setWishlist((prev) => prev.filter((item) => item.id !== artistId));
      await removeArtistFavorite(artistId);
    } catch (err) {
      if (__DEV__) console.log("Remove favorite notice:", err.message);
      fetchWishlist(); // Revert on failure
    }
  };

  const handleShareWishlist = async () => {
    if (wishlist.length === 0) return;
    try {
      const names = wishlist.map((a) => a.user?.name || a.name || "Mehndi Specialist").join(", ");
      const shareUrl = Config.PRIMARY_DOMAIN;
      await Share.share({
        message: `Check out my favorite MehndiGo artists collection: ${names}\n\nBook top home mehendi specialists on MehndiGo! ${shareUrl}`,
        title: "My Favorite Mehndi Artists Collection",
        url: shareUrl
      });
    } catch (e) {
      if (__DEV__) console.log("Share wishlist notice:", e.message);
    }
  };

  const resolveImage = useCallback((uri) => {
    if (!uri || typeof uri !== "string") return null;
    if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("data:")) {
      return uri;
    }
    if (uri.startsWith("/")) {
      return `https://api.mehndigo.in${uri}`;
    }
    return uri;
  }, []);

  const renderItem = useCallback(({ item }) => {
    const artist = item?.artist || item || {};
    const userObj = artist.user || item?.user || {};
    const artistName = artist.name || artist.full_name || userObj.name || userObj.full_name || "Mehndi Specialist";

    const rawImage =
      artist.profile_image ||
      artist.user_profile_image ||
      userObj.profile_image ||
      artist.avatar ||
      userObj.avatar ||
      artist.photo ||
      artist.image ||
      (Array.isArray(artist.portfolio_images) && artist.portfolio_images[0]?.url) ||
      (Array.isArray(artist.portfolio) && artist.portfolio[0]?.url) ||
      (Array.isArray(artist.images) && artist.images[0]);

    const resolvedImage = resolveImage(rawImage);
    const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=FFF0F4&color=9C1344&bold=true`;
    const artistImage = resolvedImage || avatarFallback;

    const ratingVal = artist.rating || artist.avg_rating ? Number(artist.rating || artist.avg_rating).toFixed(1) : null;
    const reviewsCount = artist.total_reviews ? `(${artist.total_reviews})` : "";
    const expText = artist.experience_years ? `${artist.experience_years} Yrs Exp` : "";
    const cityText = artist.locality || artist.city ? [artist.locality, artist.city].filter(Boolean).join(", ") : (artist.city || "");
    const minPrice = artist.starting_price
      ? `Starting ₹${artist.starting_price}`
      : artist.services?.[0]?.minimum_price
      ? `Starting ₹${artist.services[0].minimum_price}`
      : "Price on Request";
    const isApproved = artist.verification_status === "APPROVED" || artist.status === "APPROVED";

    const portfolioImages = Array.isArray(artist.portfolio_images) && artist.portfolio_images.length > 0
      ? artist.portfolio_images
      : Array.isArray(artist.portfolio) && artist.portfolio.length > 0
      ? artist.portfolio
      : [];

    const servicesList = Array.isArray(artist.services) ? artist.services : [];

    return (
      <View style={styles.card}>
        {/* Top Header Row */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.cardHeaderRow}
          onPress={() => navigation.navigate("ArtistProfile", { artistId: artist.id, artist, from: "Wishlist" })}
        >
          <View style={styles.imageWrap}>
            <OptimizedImage
              source={{ uri: artistImage }}
              fallbackUri={avatarFallback}
              style={styles.artistImage}
            />
            {isApproved && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.artistName}>
                {artistName}
              </Text>
              <TouchableOpacity
                style={styles.heartButton}
                onPress={() => handleRemoveFavorite(artist.id)}
              >
                <Ionicons name="heart" size={22} color={Colors.primary || "#9C1344"} />
              </TouchableOpacity>
            </View>

            {/* Specialization Badge */}
            <View style={styles.specBadge}>
              <Text style={styles.specBadgeText}>Bridal & Event Mehndi Specialist</Text>
            </View>

            {/* Rating & Exp Row */}
            <View style={styles.metaRow}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#FFB800" />
                <Text style={styles.ratingText}>{ratingVal || "4.8"}</Text>
              </View>
              <Text style={styles.reviewsText}>{reviewsCount || "(12+ reviews)"}</Text>
              {!!expText && (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.metaText}>{expText}</Text>
                </>
              )}
            </View>

            {/* Location & Starting Price */}
            <View style={styles.bottomRow}>
              {!!cityText && (
                <View style={styles.locRow}>
                  <Ionicons name="location-outline" size={12} color={Colors.textSecondary || "#666666"} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {cityText}
                  </Text>
                </View>
              )}
              {!!minPrice && <Text style={styles.priceText}>{minPrice}</Text>}
            </View>
          </View>
        </TouchableOpacity>

        {/* Artist Bio Snippet if available */}
        {!!artist.bio && (
          <Text style={styles.bioText} numberOfLines={2}>
            "{artist.bio}"
          </Text>
        )}

        {/* Portfolio Photos Gallery Strip */}
        {portfolioImages.length > 0 && (
          <View style={styles.portfolioSection}>
            <Text style={styles.sectionLabel}>Portfolio Work Samples</Text>
            <View style={styles.portfolioGrid}>
              {portfolioImages.slice(0, 4).map((img, pIdx) => {
                const imgUri = resolveImage(img?.url || img?.image_url || img);
                return (
                  <Image
                    key={pIdx}
                    source={{ uri: imgUri || avatarFallback }}
                    style={styles.portfolioThumb}
                    resizeMode="cover"
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Services Offered List Pills */}
        {servicesList.length > 0 && (
          <View style={styles.servicesSection}>
            <Text style={styles.sectionLabel}>Popular Services</Text>
            <View style={styles.servicesWrap}>
              {servicesList.slice(0, 3).map((srv, sIdx) => (
                <View key={sIdx} style={styles.servicePill}>
                  <Text style={styles.servicePillTitle} numberOfLines={1}>
                    {srv.title || srv.name || "Mehndi Service"}
                  </Text>
                  <Text style={styles.servicePillPrice}>₹{srv.price || srv.minimum_price || "500"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => navigation.navigate("ArtistProfile", { artistId: artist.id, artist, from: "Wishlist" })}
          >
            <Text style={styles.outlineBtnText}>View Full Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBookBtn}
            onPress={() => navigation.navigate("ArtistProfile", { artistId: artist.id, artist, from: "Wishlist" })}
          >
            <Text style={styles.primaryBookBtnText}>Book Artist Now</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [navigation, resolveImage]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary || "#9C1344"} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text || "#1D1D1D"} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Wishlist Collection</Text>
          <Text style={styles.headerSubtitle}>{wishlist.length} Saved Artists</Text>
        </View>

        {wishlist.length > 0 ? (
          <TouchableOpacity onPress={handleShareWishlist} style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={20} color={Colors.primary || "#9C1344"} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* List Body */}
      {wishlist.length > 0 ? (
        <FlatList
          data={wishlist}
          renderItem={renderItem}
          keyExtractor={(item, index) => (item?.id ? item.id.toString() : index.toString())}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchWishlist}
              colors={[Colors.primary || "#9C1344"]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="heart-outline" size={54} color={Colors.primary || "#9C1344"} />
          </View>
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Save your favorite Mehendi artists by tapping the heart icon on their profiles.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate("Categories")}
          >
            <Text style={styles.exploreBtnText}>Explore Artists</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF0F4",
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingVertical: 16,
    paddingBottom: 180,
  },

  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
  },
  imageWrap: {
    position: "relative",
  },
  artistImage: {
    width: 84,
    height: 84,
    borderRadius: 14,
  },
  bioText: {
    fontSize: 12.5,
    fontStyle: "italic",
    color: "#4B5563",
    marginTop: 10,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  portfolioSection: {
    marginTop: 12,
  },
  portfolioGrid: {
    flexDirection: "row",
    gap: 8,
  },
  portfolioThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  servicesSection: {
    marginTop: 12,
  },
  servicesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  servicePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#FCE7F3",
  },
  servicePillTitle: {
    fontSize: 11.5,
    fontWeight: "600",
    color: Colors.primary || "#9C1344",
    marginRight: 6,
  },
  servicePillPrice: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#111827",
  },
  cardActionsRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary || "#9C1344",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: {
    color: Colors.primary || "#9C1344",
    fontSize: 12.5,
    fontWeight: "700",
  },
  primaryBookBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary || "#9C1344",
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBookBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#059669",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  artistName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  heartButton: {
    padding: 4,
  },
  specBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  specBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary || "#9C1344",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
  },
  reviewsText: {
    fontSize: 12,
    color: "#6B7280",
  },
  dotSeparator: {
    fontSize: 12,
    color: "#9CA3AF",
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  locationText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 3,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary || "#9C1344",
  },
  bookNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary || "#9C1344",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  bookNowText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFF0F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  exploreBtn: {
    backgroundColor: Colors.primary || "#9C1344",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    marginTop: 24,
  },
  exploreBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
