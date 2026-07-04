import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { useAuth } from "../../context/AuthContext";
import { getHomeDashboard, getNearbyArtists, getCustomerProfile, getFavorites, addFavorite, removeFavorite, getCustomerDashboard } from "../../services/customer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen({ navigation }) {
  const { user, dispatch } = useAuth();

  // Dashboard Aggregated States
  const [categories, setCategories] = useState([]);
  const [offers, setOffers] = useState([]);
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [popularArtists, setPopularArtists] = useState([]);

  // Nearby Artists Paginated States
  const [nearbyArtists, setNearbyArtists] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyPage, setNearbyPage] = useState(1);
  const [hasMoreNearby, setHasMoreNearby] = useState(true);

  // Global Page Loading & Refresh States
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters State
  const [selectedFilter, setSelectedFilter] = useState("Nearest");

  // Favorites Map state (local toggle)
  const [favorites, setFavorites] = useState({});
  const [imageErrors, setImageErrors] = useState({});

  // Carousel slider state
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerFlatListRef = useRef(null);
  const bannerTimerRef = useRef(null);

  // Default coordinate location (Jaipur)
  const MOCK_LAT = 26.9124;
  const MOCK_LNG = 75.7873;

  // Load consolidated dashboard data
  const loadDashboard = async (isRefresh = false) => {
    if (!isRefresh) setDashboardLoading(true);
    try {
      const data = await getHomeDashboard(MOCK_LAT, MOCK_LNG);
      setCategories(data?.categories || []);
      setOffers(data?.offers || []);
      setFeaturedArtists(data?.featuredArtists || []);
      setPopularArtists(data?.popularArtists || []);
      
      // Load favorites from database
      try {
        const favs = await getFavorites();
        const favMap = {};
        (favs || []).forEach((artist) => {
          favMap[artist.id] = true;
        });
        setFavorites(favMap);
      } catch (favErr) {
        console.log("Failed to load favorites on dashboard:", favErr.message);
      }

      // Check for pending unreviewed or unpaid completed bookings!
      try {
        const custDash = await getCustomerDashboard();
        if (custDash?.pendingSettlementBooking) {
          const pending = custDash.pendingSettlementBooking;
          navigation.navigate("BookingSettlement", {
            bookingId: pending.id
          });
        } else if (custDash?.pendingReviewBooking) {
          const pending = custDash.pendingReviewBooking;
          // Navigate to ReviewSubmission screen
          navigation.navigate("ReviewSubmission", {
            bookingId: pending.id,
            artistName: pending.artist?.user?.name,
            artistImage: pending.artist?.user?.profile_image,
            specializationName: pending.service?.specialization_name
          });
        }
      } catch (dashErr) {
        console.log("Failed to check pending reviews/settlements on startup:", dashErr.message);
      }

      setError(null);
    } catch (err) {
      console.log("Failed to load dashboard:", err.message);
      setError("Failed to fetch dashboard data. Please try again.");
    } finally {
      setDashboardLoading(false);
    }
  };

  // Load nearby artists paginated
  const loadNearby = async (page = 1, isRefresh = false) => {
    if (nearbyLoading) return;
    setNearbyLoading(true);
    try {
      const data = await getNearbyArtists(MOCK_LAT, MOCK_LNG, 100, page, 6);
      const list = data?.rows || [];
      const total = data?.count || 0;

      if (page === 1) {
        setNearbyArtists(list);
      } else {
        setNearbyArtists((prev) => [...prev, ...list]);
      }

      setHasMoreNearby(list.length === 6 && nearbyArtists.length + list.length < total);
      setNearbyPage(page);
    } catch (err) {
      console.log("Failed to load nearby artists:", err.message);
    } finally {
      setNearbyLoading(false);
    }
  };

  // Pull to refresh trigger
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboard(true),
      loadNearby(1, true)
    ]);
    setRefreshing(false);
  };

  // Infinite Scroll Trigger
  const handleLoadMore = () => {
    if (hasMoreNearby && !nearbyLoading) {
      loadNearby(nearbyPage + 1);
    }
  };

  // Initial mount load
  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard();
      loadNearby(1);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      async function syncUserProfile() {
        try {
          const profileData = await getCustomerProfile();
          if (profileData) {
            dispatch({ type: "UPDATE_USER", payload: profileData });
          }
        } catch (e) {
          console.log("Failed to sync customer profile on Home:", e.message);
        }
      }
      syncUserProfile();
    }, [dispatch])
  );

  // Banner Auto-scrolling carousel setup
  useEffect(() => {
    if (offers.length === 0) return;
    
    if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);

    bannerTimerRef.current = setInterval(() => {
      let nextIndex = activeBannerIndex + 1;
      if (nextIndex >= offers.length) {
        nextIndex = 0;
      }
      setActiveBannerIndex(nextIndex);
      bannerFlatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 4000);

    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, [offers, activeBannerIndex]);

  // Toggle favorite
  const toggleFavorite = async (artistId) => {
    const isFav = !!favorites[artistId];
    // Optimistic UI update
    setFavorites((prev) => ({
      ...prev,
      [artistId]: !isFav
    }));
    try {
      if (isFav) {
        await removeFavorite(artistId);
      } else {
        await addFavorite(artistId);
      }
    } catch (err) {
      console.log("Failed to persist favorite:", err.message);
      // Rollback
      setFavorites((prev) => ({
        ...prev,
        [artistId]: isFav
      }));
    }
  };

const CATEGORY_IMAGES = {
  bridal: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?q=80&w=400",
  arabic: "https://images.unsplash.com/photo-1601054790522-d08317b75567?q=80&w=400",
  royal: "https://images.unsplash.com/photo-1601054790740-975949514f7b?q=80&w=400",
  portrait: "https://images.unsplash.com/photo-1601054791559-0a67ab92b6a2?q=80&w=400",
  engagement: "https://images.unsplash.com/photo-1601054791572-c510255b77ea?q=80&w=400",
  festival: "https://images.unsplash.com/photo-1601054791585-fb4050d24bf5?q=80&w=400",
  kids: "https://images.unsplash.com/photo-1601054791599-23efbf1c65d6?q=80&w=400",
  custom: "https://images.unsplash.com/photo-1601054791612-4029237c1d76?q=80&w=400"
};

const getCategoryImage = (item) => {
  const name = (item.name || "").toLowerCase();
  const slug = (item.slug || "").toLowerCase();

  const isUrlValid = item.image && 
    (item.image.startsWith("http://") || item.image.startsWith("https://")) &&
    !item.image.includes("localhost") &&
    !item.image.includes("127.0.0.1");

  if (isUrlValid) {
    return { uri: item.image };
  }

  let key = "custom";
  if (slug.includes("bridal") || name.includes("bridal")) key = "bridal";
  else if (slug.includes("arabic") || name.includes("arabic")) key = "arabic";
  else if (slug.includes("royal") || name.includes("royal")) key = "royal";
  else if (slug.includes("portrait") || name.includes("portrait")) key = "portrait";
  else if (slug.includes("engagement") || name.includes("engagement")) key = "engagement";
  else if (slug.includes("festival") || name.includes("festival")) key = "festival";
  else if (slug.includes("kid") || name.includes("kid")) key = "kids";

  const fallbackUrl = CATEGORY_IMAGES[key] || CATEGORY_IMAGES.custom;
  return { uri: fallbackUrl };
};

  // Render a Category card item
  const renderCategoryItem = ({ item }) => {
    const hasError = !!imageErrors[item.id];
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => navigation.navigate("ArtistListing", { category: item.name })}
      >
        <View style={[styles.categoryIcon, { overflow: "hidden" }]}>
          <Image
            source={hasError ? require("../../../assets/images/logo.jpg") : getCategoryImage(item)}
            onError={() => {
              setImageErrors((prev) => ({ ...prev, [item.id]: true }));
            }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.categoryText} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  // Render a banner item
  const renderBannerItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.bannerSlide}
      onPress={() => navigation.navigate("Coupons")}
    >
      <Image source={{ uri: item.banner }} style={styles.bannerBgImage} />
      <View style={styles.bannerOverlay}>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.bannerSubTitle} numberOfLines={2}>{item.description}</Text>
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>Code: {item.code}</Text>
          </View>
        </View>
        <Text style={styles.bannerDiscountText}>{item.discount}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render an artist horizontal card (Featured & Popular)
  const renderHorizontalArtistItem = ({ item }) => {
    const isFav = !!favorites[item.id];
    return (
      <TouchableOpacity
        style={styles.horizontalArtistCard}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: item.id })}
      >
        <Image
          source={{ uri: item.user?.profile_image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400" }}
          style={styles.horizontalArtistImage}
        />
        {item.verification_status === "APPROVED" && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.white} />
          </View>
        )}
        <TouchableOpacity
          style={styles.favoriteBadge}
          onPress={() => toggleFavorite(item.id)}
        >
          <Ionicons
            name={isFav ? "heart" : "heart-outline"}
            size={18}
            color={isFav ? Colors.error : Colors.primary}
          />
        </TouchableOpacity>
        <View style={styles.horizontalArtistInfo}>
          <Text style={styles.horizontalArtistName} numberOfLines={1}>{item.user?.name || "Artist"}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.ratingText}>{Number(item.avg_rating || 0).toFixed(1)}</Text>
            <Text style={styles.experienceText}>• {item.experience_years || 2} yrs exp</Text>
          </View>
          <Text style={styles.startingPriceText}>From ₹{item.services?.[0]?.minimum_price || 1500}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Nearby Artist Vertical Item
  const renderNearbyArtistItem = ({ item }) => {
    const isFav = !!favorites[item.id];
    const distanceVal = item.distance ? `${Number(item.distance).toFixed(1)} km` : "Nearby";

    return (
      <TouchableOpacity
        style={styles.nearbyArtistCard}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: item.id })}
      >
        <Image
          source={{ uri: item.user?.profile_image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400" }}
          style={styles.nearbyArtistImage}
        />
        
        <View style={styles.nearbyArtistInfo}>
          <View style={styles.nearbyNameHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Text style={styles.nearbyArtistName} numberOfLines={1}>{item.user?.name || "Artist"}</Text>
              {item.verification_status === "APPROVED" && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.nearbyFavBtn}>
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={20}
                color={isFav ? Colors.error : Colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.nearbyStatsRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={styles.ratingBadgeText}>{Number(item.avg_rating || 0).toFixed(1)}</Text>
            </View>
            <Text style={styles.nearbyBulletText}>•</Text>
            <Text style={styles.nearbyStatsText}>{item.experience_years || 2} Years Exp</Text>
            <Text style={styles.nearbyBulletText}>•</Text>
            <Text style={styles.nearbyStatsText}>{distanceVal}</Text>
          </View>

          <View style={styles.nearbyFooter}>
            <Text style={styles.nearbyPriceText}>Starting from ₹{item.services?.[0]?.minimum_price || 1500}</Text>
            <View style={styles.availableTodayBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.availableTodayText}>Available Today</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Header sections nested in FlatList for virtual list performance
  const renderListHeader = () => (
    <View>
      {/* 1. Welcome Header */}
      <View style={styles.welcomeHeader}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: user?.profile_image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150" }}
            style={styles.avatar}
          />
          <View style={styles.userMeta}>
            <Text style={styles.helloText}>Welcome back 👋</Text>
            <Text style={styles.userNameText}>{user?.name || "Customer"}</Text>
            <View style={styles.locationWrapper}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.locationText} numberOfLines={1}>{user?.city || "Jaipur, Rajasthan"}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => navigation.navigate("NotificationCenter")}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* 2. Search Bar Trigger */}
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("Search")}
      >
        <Ionicons name="search-outline" size={20} color={Colors.textTertiary} style={{ marginRight: 10 }} />
        <Text style={styles.searchPlaceholder}>Search artists, services, pincodes...</Text>
        <View style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={Colors.white} />
        </View>
      </TouchableOpacity>

      {/* 3. Promotional Banner Slider */}
      {offers.length > 0 && (
        <View style={styles.bannerContainer}>
          <FlatList
            ref={bannerFlatListRef}
            data={offers}
            keyExtractor={(item) => String(item.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={renderBannerItem}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (slide !== activeBannerIndex) {
                setActiveBannerIndex(slide);
              }
            }}
            getItemLayout={(data, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              const wait = new Promise((resolve) => setTimeout(resolve, 500));
              wait.then(() => {
                bannerFlatListRef.current?.scrollToIndex({ index: info.index, animated: false });
              });
            }}
          />
          <View style={styles.paginationDots}>
            {offers.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  activeBannerIndex === i ? styles.activeDotIndicator : null,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* 4. Categories Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mehndi Categories</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Categories")}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
        renderItem={renderCategoryItem}
      />

      {/* 5. Featured Artists Section */}
      {featuredArtists.length > 0 && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Artists</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ArtistListing", { filter: "featured" })}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featuredArtists}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
            renderItem={renderHorizontalArtistItem}
          />
        </View>
      )}

      {/* 6. Popular Artists Section */}
      {popularArtists.length > 0 && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending & Popular</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ArtistListing", { filter: "popular" })}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popularArtists}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
            renderItem={renderHorizontalArtistItem}
          />
        </View>
      )}

      {/* 7. Quick Filters Row */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Nearby Artists</Text>
      </View>
      <View style={styles.filtersWrapper}>
        {["Nearest", "Top Rated", "Price Low-High", "5+ Exp Years"].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterBadge,
              selectedFilter === filter ? styles.activeFilterBadge : null
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterBadgeText,
                selectedFilter === filter ? styles.activeFilterBadgeText : null
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Footer for spinner or empty states
  const renderListFooter = () => {
    if (nearbyLoading) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      );
    }
    if (nearbyArtists.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Artists Found Nearby</Text>
          <Text style={styles.emptySub}>Try adjusting your coordinates or filter settings.</Text>
        </View>
      );
    }
    if (!hasMoreNearby) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>Showing all nearest verified mehndi artists</Text>
        </View>
      );
    }
    return null;
  };

  const processedNearbyArtists = React.useMemo(() => {
    let result = [...nearbyArtists];

    if (selectedFilter === "Nearest") {
      result.sort((a, b) => (Number(a.distance) || 0) - (Number(b.distance) || 0));
    } else if (selectedFilter === "Top Rated") {
      result.sort((a, b) => (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0));
    } else if (selectedFilter === "Price Low-High") {
      result.sort((a, b) => {
        const priceA = a.services?.[0]?.minimum_price || 1500;
        const priceB = b.services?.[0]?.minimum_price || 1500;
        return priceA - priceB;
      });
    } else if (selectedFilter === "5+ Exp Years") {
      result = result.filter(item => (item.experience_years || 0) >= 5);
      result.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
    }

    return result;
  }, [nearbyArtists, selectedFilter]);

  if (dashboardLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={{ padding: 16 }}>
          <LoadingSkeleton type="list" count={1} />
          <View style={{ marginTop: 24 }}>
            <LoadingSkeleton type="grid" count={4} columns={2} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={processedNearbyArtists}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderNearbyArtistItem}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  loadingContainer: { flex: 1, backgroundColor: Colors.white },
  welcomeHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  userMeta: { marginLeft: 12 },
  helloText: { fontSize: 13, color: Colors.textSecondary },
  userNameText: { fontSize: 18, fontWeight: "700", color: Colors.text },
  locationWrapper: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  locationText: { fontSize: 12, color: Colors.primary, fontWeight: "600", marginLeft: 2, maxWidth: 180 },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center"
  },
  searchBar: {
    marginHorizontal: 16,
    marginTop: 18,
    height: 50,
    backgroundColor: Colors.primaryLight + "15",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 6
  },
  searchPlaceholder: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center"
  },
  bannerContainer: {
    marginTop: 20,
    height: 150,
    width: SCREEN_WIDTH,
  },
  bannerSlide: {
    width: SCREEN_WIDTH - 32,
    marginHorizontal: 16,
    height: 150,
    borderRadius: 16,
    overflow: "hidden"
  },
  bannerBgImage: { width: "100%", height: "100%", position: "absolute" },
  bannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  bannerTextContainer: { flex: 1 },
  bannerTitle: { color: Colors.white, fontSize: 18, fontWeight: "700" },
  bannerSubTitle: { color: Colors.white, fontSize: 12, opacity: 0.85, marginTop: 4 },
  promoBadge: {
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8
  },
  promoBadgeText: { color: Colors.white, fontSize: 10, fontWeight: "600" },
  bannerDiscountText: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: "800",
    marginLeft: 10,
    textAlign: "right"
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    marginHorizontal: 3
  },
  activeDotIndicator: {
    width: 14,
    backgroundColor: Colors.primary
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  viewAllText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  categoryCard: { alignItems: "center", marginRight: 16, width: 76 },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight + "20",
    justifyContent: "center",
    alignItems: "center"
  },
  categoryText: { marginTop: 6, fontSize: 11, fontWeight: "600", color: Colors.text, textAlign: "center" },
  horizontalArtistCard: {
    width: 140,
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden"
  },
  horizontalArtistImage: { width: "100%", height: 110 },
  verifiedBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: Colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center"
  },
  favoriteBadge: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: Colors.white,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  horizontalArtistInfo: { padding: 8 },
  horizontalArtistName: { fontSize: 13, fontWeight: "700", color: Colors.text },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  ratingText: { fontSize: 12, fontWeight: "600", color: Colors.text, marginLeft: 2 },
  experienceText: { fontSize: 10, color: Colors.textSecondary, marginLeft: 4 },
  startingPriceText: { fontSize: 12, fontWeight: "700", color: Colors.primary, marginTop: 4 },
  filtersWrapper: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16
  },
  filterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    marginRight: 8
  },
  activeFilterBadge: { backgroundColor: Colors.primary },
  filterBadgeText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  activeFilterBadgeText: { color: Colors.white, fontWeight: "600" },
  nearbyArtistCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border
  },
  nearbyArtistImage: { width: 80, height: 80, borderRadius: 10 },
  nearbyArtistInfo: { flex: 1, marginLeft: 12, justifyContent: "space-between" },
  nearbyNameHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nearbyArtistName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  nearbyFavBtn: { padding: 2 },
  nearbyStatsRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  ratingBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFB800", marginLeft: 2 },
  nearbyBulletText: { fontSize: 11, color: Colors.textTertiary, marginHorizontal: 4 },
  nearbyStatsText: { fontSize: 11, color: Colors.textSecondary },
  nearbyFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  nearbyPriceText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  availableTodayBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginRight: 4 },
  availableTodayText: { fontSize: 10, fontWeight: "600", color: Colors.primary },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  emptyContainer: { paddingVertical: 40, alignItems: "center", paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  footerEnd: { paddingVertical: 20, alignItems: "center" },
  footerEndText: { fontSize: 12, color: Colors.textTertiary }
});
