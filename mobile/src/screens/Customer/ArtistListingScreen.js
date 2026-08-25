import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  Share,
  Platform
} from "react-native";
import Colors from "../../constants/Colors";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import OptimizedImage from "../../components/OptimizedImage";
import {
  searchArtists,
  getFilterMetadata,
  addFavorite,
  removeFavorite,
  getFavorites
} from "../../services/customer";
import { resolveImage } from "../../utils/imageHelper";
import { getThumbnailUrl } from "../../utils/cloudinary";
import { getActiveAddress } from "../../utils/locationManager";
import { createArtistDeepLink } from "../../services/deepLink";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ArtistListingScreen({ route, navigation }) {
  const { category: initialCategory, categoryId: initialCategoryId, searchQuery: initialSearchQuery, filter: initialFilter } = route.params || {};

  // Query & Results state
  const [query, setQuery] = useState(initialSearchQuery || "");
  const [artists, setArtists] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filters State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId || null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rating, setRating] = useState("");
  const [experience, setExperience] = useState("");
  const [verified, setVerified] = useState(false);
  const [homeService, setHomeService] = useState(false);
  const [studioService, setStudioService] = useState(false);
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("");

  // Sorting State
  const [sort, setSort] = useState(initialFilter === "popular" ? "trending" : initialFilter === "featured" ? "highest_rated" : "nearest");
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);

  // Favorites state
  const [favoriteArtistIds, setFavoriteArtistIds] = useState([]);
  const [currentLocationLabel, setCurrentLocationLabel] = useState("All Locations");
  const reqSeqRef = React.useRef(0);

  // Load filter options, user favorites and active location
  const loadInitialMetadata = async () => {
    try {
      const [meta, favs, activeAddr] = await Promise.all([
        getFilterMetadata(),
        getFavorites(),
        getActiveAddress()
      ]);
      setCategories(meta?.categories || []);
      if (activeAddr?.label || activeAddr?.city || activeAddr?.fullAddress) {
        setCurrentLocationLabel(activeAddr.label ? `${activeAddr.label} (${activeAddr.city || ""})` : (activeAddr.city || activeAddr.fullAddress));
      }
      const allFavIds = [];
      (favs || []).forEach((artist) => {
        if (artist.id) allFavIds.push(artist.id);
        if (artist.user_id) allFavIds.push(artist.user_id);
        if (artist.artist_profile_id) allFavIds.push(artist.artist_profile_id);
        if (artist.artist_id) allFavIds.push(artist.artist_id);
      });
      setFavoriteArtistIds(allFavIds);
    } catch (e) {
      if (__DEV__) console.log("Failed to load metadata/favorites:", e.message);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInitialMetadata();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Construct active filters object
  const getActiveFilters = () => {
    const filters = {};
    if (selectedCategoryId) filters.categoryId = selectedCategoryId;
    if (selectedCategory) filters.category = selectedCategory;
    if (initialFilter) filters.filter = initialFilter;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;
    if (rating) filters.rating = rating;
    if (experience) filters.experience = experience;
    if (verified) filters.verified = true;
    if (homeService) filters.homeService = true;
    if (studioService) filters.studioService = true;
    if (gender) filters.gender = gender;
    if (language) filters.language = language;
    return filters;
  };

  // Main fetch query list — with race-condition / stale-response cancellation
  const fetchArtistsList = async (pageNum = 1, isRefresh = false, overrideSort = null) => {
    const reqId = ++reqSeqRef.current;

    if (pageNum === 1) {
      if (!isRefresh) setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const activeAddr = await getActiveAddress();
      const lat = activeAddr?.latitude || null;
      const lng = activeAddr?.longitude || null;
      const filters = getActiveFilters();
      const response = await searchArtists(query, filters, sort, lat, lng, pageNum, 15);

      // Discard response if a newer request was dispatched
      if (reqId !== reqSeqRef.current) return;

      const rows = Array.isArray(response) ? response : (response?.rows || response?.data || []);
      const total = Array.isArray(response) ? response.length : (response?.count || rows.length);

      if (pageNum === 1) {
        setArtists(rows);
      } else {
        setArtists((prev) => [...prev, ...rows]);
      }

      const hasMoreData = rows.length === 15 && ((pageNum === 1 ? rows.length : artists.length + rows.length) < total);
      setHasMore(hasMoreData);
      setPage(pageNum);
    } catch (err) {
      if (reqId === reqSeqRef.current) {
        if (__DEV__) console.log("Failed to load artists listing:", err.message);
      }
    } finally {
      if (reqId === reqSeqRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  };

  // Sync route params when screen parameters update
  useEffect(() => {
    if (route.params) {
      const { category, categoryId, searchQuery, filter } = route.params;

      if (searchQuery !== undefined && searchQuery !== query) {
        setQuery(searchQuery || "");
      }
      if (categoryId !== undefined && categoryId !== selectedCategoryId) {
        setSelectedCategoryId(categoryId || null);
      }
      if (category !== undefined && category !== selectedCategory) {
        setSelectedCategory(category || "");
      }
      if (filter === "popular" && sort !== "trending") {
        setSort("trending");
      } else if (filter === "featured" && sort !== "highest_rated") {
        setSort("highest_rated");
      } else if (filter === "nearest" && sort !== "nearest") {
        setSort("nearest");
      } else if (filter === "all") {
        setSelectedCategory("");
        setSelectedCategoryId(null);
        setSort("highest_rated");
      }
    }
  }, [route.params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArtistsList(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [query, sort, selectedCategory, selectedCategoryId, rating, experience, verified, homeService, studioService, gender, language]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInitialMetadata();
    fetchArtistsList(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      fetchArtistsList(page + 1);
    }
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    setTimeout(() => fetchArtistsList(1), 50);
  };

  const resetFilters = () => {
    setSelectedCategory("");
    setSelectedCategoryId(null);
    setMinPrice("");
    setMaxPrice("");
    setRating("");
    setExperience("");
    setVerified(false);
    setHomeService(false);
    setStudioService(false);
    setGender("");
    setLanguage("");
    setQuery("");
  };

  // Sync Favorite item click
  const handleToggleFavorite = async (artistId) => {
    const isFav = favoriteArtistIds.includes(artistId);
    try {
      if (isFav) {
        await removeFavorite(artistId);
        setFavoriteArtistIds((prev) => prev.filter((id) => id !== artistId));
      } else {
        await addFavorite(artistId);
        setFavoriteArtistIds((prev) => [...prev, artistId]);
      }
    } catch (e) {
      if (__DEV__) console.log("Failed to toggle favorite:", e.message);
    }
  };

  // Native Share profile content trigger
  const handleShareProfile = async (artist) => {
    try {
      const artistId = artist.id || artist.user_id || artist.artist_id;
      const artistName = artist.name || artist.full_name || artist.user?.name || "Mehndi Artist";
      const minPrice = artist.starting_price || artist.services?.[0]?.minimum_price || 500;
      const shareUrl = createArtistDeepLink(artistId);
      await Share.share({
        title: `${artistName} on MehndiGo`,
        message: `Book ${artistName} on MehndiGo! Starting at ₹${minPrice}, ${artist.experience_years ? `${artist.experience_years} years experience, ` : ""}⭐ ${Number(artist.avg_rating || artist.rating || 0).toFixed(1)} rating.\n\nView Profile: ${shareUrl}`,
        url: shareUrl
      });
    } catch (e) {
      if (__DEV__) console.log("Failed to share profile:", e.message);
    }
  };

  const sortOptions = [
    { label: "Nearest First", value: "nearest" },
    { label: "Highest Rated", value: "highest_rated" },
    { label: "Starting Price Low-High", value: "lowest_price" },
    { label: "Highest Experience", value: "highest_experience" },
    { label: "Most Bookings", value: "trending" }
  ];

  // Render List View Item Card
  const renderListArtistCard = useCallback(({ item }) => {
    const artistId = item.id || item.user_id || item.artist_id;
    const artistName = item.name || item.full_name || item.user?.name || "Verified Artist";
    const isFav = favoriteArtistIds.includes(item.id) || favoriteArtistIds.includes(item.user_id) || favoriteArtistIds.includes(item.artist_id) || favoriteArtistIds.includes(artistId);
    const minPrice = item.starting_price || item.startingPrice || item.price || item.services?.[0]?.minimum_price || item.services?.[0]?.price;
    const distanceVal = item.distance ? `${Number(item.distance).toFixed(1)} km` : null;
    const categoryName = item.services?.[0]?.category || item.categories || "General Mehndi";
    const rawImage = item.profile_image || item.profileImage || item.avatar || item.user?.profile_image || item.selfie_image || item.user?.avatar || (Array.isArray(item.portfolio_images) && item.portfolio_images[0]?.url) || (Array.isArray(item.portfolio) && item.portfolio[0]?.url);
    const avatarUri = resolveImage(rawImage) || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=F3E8FF&color=7C3AED`;

    return (
      <TouchableOpacity
        style={styles.listCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: artistId })}
      >
        <View style={styles.imageContainer}>
          <OptimizedImage
            source={{ uri: avatarUri }}
            style={styles.listArtistImage}
            width={120}
            height={120}
          />

          <TouchableOpacity
            style={styles.favoriteBtn}
            onPress={() => handleToggleFavorite(artistId)}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={18}
              color={isFav ? Colors.error : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.listInfo}>
          <View style={styles.nameHeader}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{artistName}</Text>
              {item.verification_status === "APPROVED" && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <TouchableOpacity onPress={() => handleShareProfile(item)} style={styles.shareButton}>
              <Ionicons name="share-social-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.subHeaderStats}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={styles.ratingBadgeText}>
                {Number(item.avg_rating || item.rating || 0) > 0
                  ? Number(item.avg_rating || item.rating).toFixed(1)
                  : "New"}
              </Text>
            </View>
            <Text style={styles.bulletText}>•</Text>
            <Text style={styles.statsText}>{item.experience_years ? `${item.experience_years} Yrs Exp` : "Fresh Artist"}</Text>
            <Text style={styles.bulletText}>•</Text>
            <Text style={styles.statsText} numberOfLines={1}>{categoryName}</Text>
          </View>

          <Text style={styles.location} numberOfLines={1}>
            📍 {item.city ? `${item.city}${distanceVal ? ` (${distanceVal})` : ""}` : (distanceVal ? `${distanceVal} away` : "Location not set")}
          </Text>

          <View style={styles.perfRow}>
            <Text style={styles.perfText}>⚡ {item.response_time || "Quick response"}</Text>
            <Text style={styles.perfText}>💼 {item.total_bookings !== undefined ? `${item.total_bookings} Bookings` : "Available for bookings"}</Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.price}>{minPrice ? `₹${minPrice}+` : "Price on Profile"}</Text>
            <View style={styles.availableTodayBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.availableTodayText}>Available Today</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.viewProfileBtn}
              onPress={() => navigation.navigate("ArtistProfile", { artistId: artistId })}
            >
              <Text style={styles.viewProfileBtnText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBookBtn}
              onPress={() => navigation.navigate("SelectService", { artistId: artistId })}
            >
              <Text style={styles.quickBookBtnText}>Quick Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [favoriteArtistIds, navigation]);

  const handleBack = React.useCallback(() => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "CustomerTabs", params: { screen: "Home" } }]
      });
    }
    return true;
  }, [navigation]);

  useEffect(() => {
    const { BackHandler } = require("react-native");
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => backSubscription.remove();
  }, [handleBack]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {query ? `"${query}"` : selectedCategory || "Mehndi Artists"}
          </Text>
          <Text style={styles.locationSubtitle}>📍 {currentLocationLabel}</Text>
        </View>
        
        <View style={{ width: 36 }} />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search artists, categories, city..."
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick Filter Horizontal Chips */}
      <View style={{ marginBottom: 10 }}>
        <FlatList
          data={[
            { label: "All Artists", key: "all" },
            { label: "Bridal", key: "bridal" },
            { label: "Arabic", key: "arabic" },
            { label: "Royal", key: "royal" },
            { label: "⭐ 4.5+ Rated", key: "top_rated" },
            { label: "5+ Yrs Exp", key: "5_exp" },
            { label: "Home Service", key: "home_service" },
            { label: "Verified Only", key: "verified" }
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            let isActive = false;
            if (item.key === "all") isActive = !selectedCategory && !rating && !experience && !verified && !homeService;
            else if (item.key === "bridal") isActive = selectedCategory?.toLowerCase().includes("bridal");
            else if (item.key === "arabic") isActive = selectedCategory?.toLowerCase().includes("arabic");
            else if (item.key === "royal") isActive = selectedCategory?.toLowerCase().includes("royal");
            else if (item.key === "top_rated") isActive = rating === "4.5";
            else if (item.key === "5_exp") isActive = experience === "5";
            else if (item.key === "home_service") isActive = homeService;
            else if (item.key === "verified") isActive = verified;

            return (
              <TouchableOpacity
                style={[styles.quickFilterChip, isActive && styles.activeQuickFilterChip]}
                onPress={() => {
                  if (item.key === "all") {
                    resetFilters();
                  } else if (item.key === "bridal" || item.key === "arabic" || item.key === "royal") {
                    setSelectedCategory(isActive ? "" : item.label);
                  } else if (item.key === "top_rated") {
                    setRating(isActive ? "" : "4.5");
                  } else if (item.key === "5_exp") {
                    setExperience(isActive ? "" : "5");
                  } else if (item.key === "home_service") {
                    setHomeService(!homeService);
                  } else if (item.key === "verified") {
                    setVerified(!verified);
                  }
                }}
              >
                <Text style={[styles.quickFilterChipText, isActive && styles.activeQuickFilterChipText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Combined Sort + Filter bar */}
      <View style={styles.sortFilterBlock}>
        {/* Row 1: Sort selector + Filters button */}
        <View style={styles.sortBar}>
          <TouchableOpacity
            style={styles.sortSelector}
            onPress={() => setSortDropdownVisible(!sortDropdownVisible)}
          >
            <Ionicons name="swap-vertical-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.sortLabel}>Sort: </Text>
            <Text style={styles.sortValue} numberOfLines={1}>
              {sortOptions.find((o) => o.value === sort)?.label || "Nearest"}
            </Text>
            <Ionicons name={sortDropdownVisible ? "chevron-up" : "chevron-down"} size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterToggleBtn,
              (selectedCategory || minPrice || maxPrice || rating || experience || verified || homeService || studioService || gender || language) ? styles.filterToggleBtnActive : null
            ]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons
              name="funnel-outline"
              size={14}
              color={(selectedCategory || minPrice || maxPrice || rating || experience || verified || homeService || studioService || gender || language) ? Colors.white : Colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={[
              styles.filterToggleBtnText,
              (selectedCategory || minPrice || maxPrice || rating || experience || verified || homeService || studioService || gender || language) ? styles.filterToggleBtnTextActive : null
            ]}>Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Quick sort chip tabs — horizontally scrollable */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScrollView}
          contentContainerStyle={styles.chipsContentContainer}
          bounces={false}
        >
          {[
            { label: "📍 Nearest", value: "nearest" },
            { label: "⭐ Top Rated", value: "highest_rated" },
            { label: "💰 Price Low→High", value: "lowest_price" },
            { label: "🏆 5+ Yrs Exp", value: "highest_experience" },
            { label: "🔥 Trending", value: "trending" },
          ].map((chip) => (
            <TouchableOpacity
              key={chip.value}
              activeOpacity={0.75}
              style={[
                styles.sortChip,
                sort === chip.value ? styles.sortChipActive : null
              ]}
              onPress={() => {
                setSort(chip.value);
                setSortDropdownVisible(false);
              }}
            >
              <Text style={[
                styles.sortChipText,
                sort === chip.value ? styles.sortChipTextActive : null
              ]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options dropdown list overlay */}
      {sortDropdownVisible && (
        <View style={styles.sortDropdown}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortDropdownItem,
                sort === option.value ? styles.activeSortItem : null
              ]}
              onPress={() => {
                setSort(option.value);
                setSortDropdownVisible(false);
              }}
            >
              <Text
                style={[
                  styles.sortDropdownText,
                  sort === option.value ? styles.activeSortText : null
                ]}
              >
                {option.label}
              </Text>
              {sort === option.value && (
                <Ionicons name="checkmark" size={16} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content Renderer - Single Standard List View */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <LoadingSkeleton type="list" count={4} />
        </View>
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(item, index) => String(item.id || item.user_id || item.artist_id || index)}
          renderItem={renderListArtistCard}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
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
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loaderFooter}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : !hasMore && artists.length > 0 ? (
              <View style={styles.loaderFooter}>
                <Text style={styles.endListText}>Showing all matched verified mehndi artists</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Artists Found</Text>
              <Text style={styles.emptySub}>{"We couldn't find any matching artists under current filter settings."}</Text>
              <TouchableOpacity style={styles.resetSearchBtn} onPress={resetFilters}>
                <Text style={styles.resetSearchBtnText}>Reset Filter Settings</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        />
      )}

      {/* Advanced Filter Modal Sheet */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Category selector */}
              <Text style={styles.filterTitle}>Mehendi Styling Category</Text>
              <View style={styles.filterGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.filterGridItem,
                      selectedCategory === cat.name ? styles.activeGridItem : null
                    ]}
                    onPress={() => setSelectedCategory(selectedCategory === cat.name ? "" : cat.name)}
                  >
                    <Text
                      style={[
                        styles.filterGridText,
                        selectedCategory === cat.name ? styles.activeGridText : null
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price range selector */}
              <Text style={styles.filterTitle}>Starting Price Range (₹)</Text>
              <View style={styles.priceRow}>
                <TextInput
                  placeholder="Min Price"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  style={styles.priceInput}
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <Text style={styles.priceRangeSeparator}>to</Text>
                <TextInput
                  placeholder="Max Price"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  style={styles.priceInput}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>

              {/* Rating selection */}
              <Text style={styles.filterTitle}>Minimum Star Rating</Text>
              <View style={styles.filterGrid}>
                {["4.5", "4.0", "3.5", "3.0"].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={[
                      styles.filterGridItem,
                      rating === star ? styles.activeGridItem : null
                    ]}
                    onPress={() => setRating(rating === star ? "" : star)}
                  >
                    <Text
                      style={[
                        styles.filterGridText,
                        rating === star ? styles.activeGridText : null
                      ]}
                    >
                      ⭐ {star} & above
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Experience selection */}
              <Text style={styles.filterTitle}>Experience level</Text>
              <View style={styles.filterGrid}>
                {["2", "5", "8", "10"].map((exp) => (
                  <TouchableOpacity
                    key={exp}
                    style={[
                      styles.filterGridItem,
                      experience === exp ? styles.activeGridItem : null
                    ]}
                    onPress={() => setExperience(experience === exp ? "" : exp)}
                  >
                    <Text
                      style={[
                        styles.filterGridText,
                        experience === exp ? styles.activeGridText : null
                      ]}
                    >
                      {exp}+ Years Exp
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Language selection */}
              <Text style={styles.filterTitle}>Preferred Language</Text>
              <View style={styles.filterGrid}>
                {["English", "Hindi", "Rajasthani"].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.filterGridItem,
                      language === lang ? styles.activeGridItem : null
                    ]}
                    onPress={() => setLanguage(language === lang ? "" : lang)}
                  >
                    <Text
                      style={[
                        styles.filterGridText,
                        language === lang ? styles.activeGridText : null
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Gender Selection */}
              <Text style={styles.filterTitle}>Artist Gender</Text>
              <View style={styles.filterGrid}>
                {["Female", "Male"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.filterGridItem,
                      gender === g ? styles.activeGridItem : null
                    ]}
                    onPress={() => setGender(gender === g ? "" : g)}
                  >
                    <Text
                      style={[
                        styles.filterGridText,
                        gender === g ? styles.activeGridText : null
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Verified and Service Toggles */}
              <Text style={styles.filterTitle}>Additional Options</Text>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={[styles.checkboxRow, verified ? styles.checkedRow : null]}
                  onPress={() => setVerified(!verified)}
                >
                  <Ionicons
                    name={verified ? "checkbox" : "square-outline"}
                    size={20}
                    color={verified ? Colors.primary : Colors.textTertiary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.checkboxLabel}>Verified Mehndi Artist Only</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkboxRow, homeService ? styles.checkedRow : null]}
                  onPress={() => setHomeService(!homeService)}
                >
                  <Ionicons
                    name={homeService ? "checkbox" : "square-outline"}
                    size={20}
                    color={homeService ? Colors.primary : Colors.textTertiary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.checkboxLabel}>Provides Home Service</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkboxRow, studioService ? styles.checkedRow : null]}
                  onPress={() => setStudioService(!studioService)}
                >
                  <Ionicons
                    name={studioService ? "checkbox" : "square-outline"}
                    size={20}
                    color={studioService ? Colors.primary : Colors.textTertiary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.checkboxLabel}>Provides Salon/Studio Service</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Filter buttons action footer — outside ScrollView so always visible */}
            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => {
                resetFilters();
              }}>
                <Text style={styles.resetBtnText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, paddingTop: 50 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    justifyContent: "space-between"
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center"
  },
  headerMeta: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  locationSubtitle: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center"
  },
  activeLayoutBtn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + "10" },
  searchBarContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    paddingVertical: 0
  },
  quickFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8
  },
  activeQuickFilterChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  quickFilterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary
  },
  activeQuickFilterChipText: {
    color: Colors.white,
    fontWeight: "700"
  },
  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  sortSelector: { flexDirection: "row", alignItems: "center" },
  sortLabel: { fontSize: 13, color: Colors.textSecondary },
  sortValue: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  filterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15
  },
  filterToggleBtnText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  filterToggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterToggleBtnTextActive: {
    color: Colors.white,
  },
  chipsScrollView: {
    backgroundColor: Colors.white,
  },
  chipsContentContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingRight: 24,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  sortChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  sortChipTextActive: {
    color: Colors.white,
    fontWeight: "800",
  },
  sortDropdown: {
    position: "absolute",
    top: 160,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 9999,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  sortDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  activeSortItem: { backgroundColor: Colors.primaryLight + "10" },
  sortDropdownText: { fontSize: 13, color: Colors.text },
  activeSortText: { color: Colors.primary, fontWeight: "700" },
  
  // List view specific card styles
  listCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border
  },
  imageContainer: { position: "relative" },
  listArtistImage: { width: 95, height: 135, borderRadius: 12 },
  favoriteBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white + "DD",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  listInfo: { flex: 1, marginLeft: 14, justifyContent: "space-between" },
  nameHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: Colors.text, flex: 1 },
  shareButton: { padding: 4 },
  subHeaderStats: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 2 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  ratingBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFB800", marginLeft: 2 },
  bulletText: { fontSize: 11, color: Colors.textTertiary, marginHorizontal: 4 },
  statsText: { fontSize: 11, color: Colors.textSecondary, flexShrink: 1 },
  location: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  perfRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  perfText: { fontSize: 10, fontWeight: "600", color: Colors.textSecondary, marginRight: 10 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  price: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  availableTodayBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  activeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.primary, marginRight: 4 },
  availableTodayText: { fontSize: 9, fontWeight: "600", color: Colors.primary },
  actionRow: { flexDirection: "row", marginTop: 10, justifyContent: "space-between" },
  viewProfileBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6
  },
  viewProfileBtnText: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary },
  quickBookBtn: {
    flex: 1.2,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center"
  },
  quickBookBtnText: { fontSize: 11, fontWeight: "700", color: Colors.white },

  // Grid view specific styles
  gridRowWrapper: { justifyContent: "space-between", paddingHorizontal: 4 },
  gridCard: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: "hidden"
  },
  gridArtistImage: { width: "100%", height: 110 },
  gridFavBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: Colors.white + "DD",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center"
  },
  gridInfo: { padding: 10, justifyContent: "space-between" },
  gridArtistName: { fontSize: 13, fontWeight: "700", color: Colors.text },
  gridStatsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  gridRatingText: { fontSize: 11, fontWeight: "600", color: Colors.text, marginLeft: 2 },
  gridExpText: { fontSize: 10, color: Colors.textSecondary },
  gridCategoryText: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  gridPriceText: { fontSize: 13, fontWeight: "700", color: Colors.primary, marginTop: 4 },
  gridBookBtn: {
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8
  },
  gridBookBtnText: { fontSize: 10, fontWeight: "700", color: Colors.white },

  // Map view placeholder styles
  mapPlaceholderContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, marginTop: 40 },
  mapTitle: { fontSize: 18, fontWeight: "800", color: Colors.text, marginTop: 14 },
  mapSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, textAlign: "center" },
  mapCard: {
    backgroundColor: Colors.inputBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20,
    width: "100%"
  },
  mapAlertText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, textAlign: "center" },
  backToListBtn: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10
  },
  backToListText: { color: Colors.white, fontWeight: "700", fontSize: 13 },

  loaderFooter: { paddingVertical: 16, alignItems: "center" },
  endListText: { fontSize: 11, color: Colors.textTertiary },
  emptyContainer: { paddingVertical: 60, alignItems: "center", paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  resetSearchBtn: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary
  },
  resetSearchBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 0,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  filterTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginTop: 16, marginBottom: 10 },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  filterGridItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
    margin: 4
  },
  activeGridItem: { backgroundColor: Colors.primaryLight + "30" },
  filterGridText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  activeGridText: { color: Colors.primary, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.text
  },
  priceRangeSeparator: { marginHorizontal: 12, fontSize: 13, color: Colors.textSecondary },
  checkboxContainer: { marginTop: 6 },
  checkboxRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  checkedRow: { backgroundColor: Colors.primaryLight + "08" },
  checkboxLabel: { fontSize: 13, color: Colors.textSecondary },
  filterFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    paddingBottom: 20,
    justifyContent: "space-between",
    backgroundColor: Colors.white,
  },
  resetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  resetBtnText: { fontSize: 14, fontWeight: "700", color: Colors.textTertiary },
  applyBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center"
  },
  applyBtnText: { fontSize: 14, fontWeight: "700", color: Colors.white }
});
