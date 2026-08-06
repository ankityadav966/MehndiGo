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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import Alert from "../../utils/Alert";
import { getCustomerWishlist, removeArtistFavorite } from "../../services/customer";
import OptimizedImage from "../../components/OptimizedImage";
import CustomButton from "../../components/CustomButton";

export default function WishlistScreen({ navigation }) {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = useCallback(async () => {
    try {
      const data = await getCustomerWishlist();
      setWishlist(data || []);
    } catch (err) {
      console.log("Failed to fetch customer wishlist:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchWishlist();
    });
    return unsubscribe;
  }, [navigation, fetchWishlist]);

  const handleRemoveFavorite = async (artistId) => {
    try {
      // Optimistic removal
      setWishlist((prev) => prev.filter((item) => item.id !== artistId));
      await removeArtistFavorite(artistId);
    } catch (err) {
      console.log("Remove favorite error:", err.message);
      fetchWishlist(); // Revert on failure
    }
  };

  const handleShareWishlist = async () => {
    if (wishlist.length === 0) return;
    try {
      const names = wishlist.map((a) => a.user?.name || a.name || "Mehndi Specialist").join(", ");
      await Share.share({
        message: `Check out my favorite MehndiGo artists collection: ${names}\n\nBook top home mehendi specialists on MehndiGo!`,
        title: "My Favorite Mehndi Artists Collection",
      });
    } catch (e) {
      console.log("Share wishlist error:", e.message);
    }
  };

  const renderItem = ({ item }) => {
    const artist = item || {};
    const userObj = artist.user || {};
    const artistName = artist.name || artist.full_name || userObj.name || "Mehndi Specialist";
    const artistImage =
      artist.profile_image ||
      artist.avatar ||
      userObj.profile_image ||
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400";

    const ratingVal = Number(artist.rating || artist.avg_rating || 4.8).toFixed(1);
    const reviewsCount = artist.total_reviews ? `(${artist.total_reviews})` : "(45+)";
    const expText = artist.experience_years ? `${artist.experience_years} Yrs Exp` : "3+ Yrs Exp";
    const cityText = artist.city || "Jaipur, Rajasthan";
    const minPrice = artist.starting_price
      ? `Starting ₹${artist.starting_price}`
      : artist.services?.[0]?.minimum_price
      ? `Starting ₹${artist.services[0].minimum_price}`
      : "Starting ₹1,500";
    const isApproved = artist.verification_status === "APPROVED";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: artist.id })}
      >
        {/* Left Avatar */}
        <View style={styles.imageWrap}>
          <OptimizedImage
            source={{ uri: artistImage }}
            style={styles.artistImage}
            width={84}
            height={84}
          />
          {isApproved && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Center Details */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.artistName}>
              {artistName}
            </Text>
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => handleRemoveFavorite(artist.id)}
            >
              <Ionicons name="heart" size={20} color={Colors.primary || "#9C1344"} />
            </TouchableOpacity>
          </View>

          {/* Specialization Badge */}
          <View style={styles.specBadge}>
            <Text style={styles.specBadgeText}>Bridal & Festival Specialist</Text>
          </View>

          {/* Rating & Exp Row */}
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={styles.ratingText}>{ratingVal}</Text>
            </View>
            <Text style={styles.reviewsText}>{reviewsCount}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.metaText}>{expText}</Text>
          </View>

          {/* Location & Price Row */}
          <View style={styles.bottomRow}>
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={12} color={Colors.textSecondary || "#666666"} />
              <Text style={styles.locationText} numberOfLines={1}>
                {cityText}
              </Text>
            </View>
            <Text style={styles.priceText}>{minPrice}</Text>
          </View>

          {/* Book Now Action */}
          <TouchableOpacity
            style={styles.bookNowBtn}
            onPress={() => navigation.navigate("ArtistProfile", { artistId: artist.id })}
          >
            <Text style={styles.bookNowText}>Book Artist</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 14,
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
  imageWrap: {
    position: "relative",
  },
  artistImage: {
    width: 84,
    height: 84,
    borderRadius: 14,
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
