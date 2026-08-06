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
import { getNormalizedUrl } from "../../services/api";
import { getThumbnailUrl } from "../../utils/cloudinary";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ArtistListingScreen({ route, navigation }) {
  const { category: initialCategory, searchQuery: initialSearchQuery, filter: initialFilter } = route.params || {};

  // Query & Results state
  const [query, setQuery] = useState(initialSearchQuery || "");
  const [artists, setArtists] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Layout View mode: 'list' | 'grid' | 'map'
  const [layoutMode, setLayoutMode] = useState("list");

  // Filters State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "");
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

  // Mock Coordinates (Jaipur)
  const MOCK_LAT = 26.9124;
  const MOCK_LNG = 75.7873;

  // Load filter options and user favorites
  const loadInitialMetadata = async () => {
    try {
      const [meta, favs] = await Promise.all([
        getFilterMetadata(),
        getFavorites()
      ]);
      setCategories(meta?.categories || []);
      setFavoriteArtistIds((favs || []).map((artist) => artist.id));
    } catch (e) {
      console.log("Failed to load metadata/favorites:", e.message);
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
    if (selectedCategory) filters.category = selectedCategory;
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

  // Main fetch query list — accepts explicit params to avoid stale closure
  const fetchArtistsList = async (pageNum = 1, isRefresh = false, overrideSort = null) => {
    if (pageNum === 1) {
      if (!isRefresh) setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const filters = {
        ...(selectedCategory ? { category: selectedCategory } : {}),
        ...(minPrice ? { minPrice } : {}),
        ...(maxPrice ? { maxPrice } : {}),
        ...(rating ? { rating } : {}),
        ...(experience ? { experience } : {}),
        ...(verified ? { verified: true } : {}),
        ...(homeService ? { homeService: true } : {}),
        ...(studioService ? { studioService: true } : {}),
        ...(gender ? { gender } : {}),
        ...(language ? { language } : {}),
      };
      const activeSort = overrideSort || sort;
      const response = await searchArtists(query, filters, activeSort, MOCK_LAT, MOCK_LNG, pageNum, 8);
      const rows = Array.isArray(response) ? response : (response?.rows || response?.data || []);
      const total = Array.isArray(response) ? response.length : (response?.count || rows.length);

      if (pageNum === 1) {
        setArtists(rows);
      } else {
        setArtists((prev) => [...prev, ...rows]);
      }

      const hasMoreData = rows.length === 8 && (artists.length + rows.length < total);
      setHasMore(hasMoreData);
      setPage(pageNum);
    } catch (err) {
      console.log("Failed to load artists listing:", err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Sync route params when screen parameters update
  useEffect(() => {
    if (route.params) {
      const { category, searchQuery, filter } = route.params;

      if (searchQuery !== undefined && searchQuery !== query) {
        setQuery(searchQuery || "");
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
      }
    }
  }, [route.params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArtistsList(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [query, sort, selectedCategory, gender, language]);

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
    // Use setTimeout to ensure state is committed before fetch
    setTimeout(() => fetchArtistsList(1), 50);
  };

  const resetFilters = () => {
    setSelectedCategory("");
    setMinPrice("");
    setMaxPrice("");
    setRating("");
    setExperience("");
    setVerified(false);
    setHomeService(false);
    setStudioService(false);
    setGender("");
    setLanguage("");
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
      console.log("Failed to toggle favorite:", e.message);
    }
  };

  // Native Share profile content trigger
  const handleShareProfile = async (artist) => {
    try {
      const minPrice = artist.services?.[0]?.minimum_price || 1500;
      await Share.share({
        title: `Check out ${artist.user?.name || "this Mehndi Artist"}`,
        message: `Book ${artist.user?.name || "this Mehndi Artist"} on MehandiGo! Starting price ₹${minPrice}, experience: ${artist.experience_years} years, rated ⭐${Number(artist.avg_rating || 0).toFixed(1)} stars. Download the app today!`
      });
    } catch (e) {
      console.log("Failed to share profile:", e.message);
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
  const renderListArtistCard = ({ item }) => {
    const isFav = favoriteArtistIds.includes(item.id);
    const minPrice = item.starting_price || item.services?.[0]?.minimum_price || item.services?.[0]?.price || 1500;
    const distanceVal = item.distance ? `${Number(item.distance).toFixed(1)} km` : "Nearby";
    const categoryName = item.services?.[0]?.category || item.categories || "General Mehndi";
    const artistName = item.name || item.full_name || item.user?.name || "Mehndi Artist";
    const avatarUri = getNormalizedUrl(item.profile_image || item.avatar || item.user?.profile_image) || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400";

    return (
      <TouchableOpacity
        style={styles.listCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: item.id })}
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
            onPress={() => handleToggleFavorite(item.id)}
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
              <Text style={styles.ratingBadgeText}>{Number(item.avg_rating || 0).toFixed(1)}</Text>
            </View>
            <Text style={styles.bulletText}>•</Text>
            <Text style={styles.statsText}>{item.experience_years || 2} Yrs Exp</Text>
            <Text style={styles.bulletText}>•</Text>
            <Text style={styles.statsText}>{categoryName}</Text>
          </View>

          <Text style={styles.location} numberOfLines={1}>📍 {item.city || "Jaipur"} ({distanceVal})</Text>

          <View style={styles.perfRow}>
            <Text style={styles.perfText}>⚡ {item.response_time || "15 mins"} response</Text>
            <Text style={styles.perfText}>💼 {item.total_bookings || 10} Bookings</Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.price}>₹{minPrice}+</Text>
            <View style={styles.availableTodayBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.availableTodayText}>Available Today</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.viewProfileBtn}
              onPress={() => navigation.navigate("ArtistProfile", { artistId: item.id })}
            >
              <Text style={styles.viewProfileBtnText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBookBtn}
              onPress={() => navigation.navigate("SelectService", { artistId: item.id })}
            >
              <Text style={styles.quickBookBtnText}>Quick Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );

  };

  // Render Grid View Item Card
  const renderGridArtistCard = ({ item }) => {
    const isFav = favoriteArtistIds.includes(item.id);
    const minPrice = item.starting_price || item.services?.[0]?.minimum_price || item.services?.[0]?.price || 1500;
    const artistName = item.name || item.full_name || item.user?.name || "Mehndi Artist";
    const avatarUri = getNormalizedUrl(item.profile_image || item.avatar || item.user?.profile_image) || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400";

    return (
      <TouchableOpacity
        style={styles.gridCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: item.id })}
      >
        <OptimizedImage
          source={{ uri: avatarUri }}
          style={styles.gridArtistImage}
          width={SCREEN_WIDTH / 2 - 24}
          height={140}
        />

        <TouchableOpacity
          style={styles.gridFavoriteBtn}
          onPress={() => handleToggleFavorite(item.id)}
        >
          <Ionicons
            name={isFav ? "heart" : "heart-outline"}
            size={16}
            color={isFav ? Colors.error : Colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.gridInfo}>
          <Text style={styles.gridArtistName} numberOfLines={1}>{artistName}</Text>
          
          <View style={styles.gridStatsRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="star" size={11} color="#FFB800" />
              <Text style={styles.gridRatingText}>{Number(item.avg_rating || 0).toFixed(1)}</Text>
            </View>
            <Text style={styles.gridExpText}>{item.experience_years || 2} Yrs Exp</Text>
          </View>

          <Text style={styles.gridCategoryText} numberOfLines={1}>{categoryName}</Text>
          <Text style={styles.gridPriceText}>₹{minPrice}+</Text>

          <TouchableOpacity
            style={styles.gridBookBtn}
            onPress={() => navigation.navigate("SelectService", { artistId: item.id })}
          >
            <Text style={styles.gridBookBtnText}>Quick Book</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {query ? `"${query}"` : selectedCategory || "Mehndi Artists"}
          </Text>
          <Text style={styles.locationSubtitle}>📍 Jaipur, Rajasthan</Text>
        </View>
        
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Layout Mode Toggles */}
          <TouchableOpacity
            style={[styles.headerIconBtn, layoutMode === "list" ? styles.activeLayoutBtn : null]}
            onPress={() => setLayoutMode("list")}
          >
            <Ionicons name="list" size={18} color={layoutMode === "list" ? Colors.primary : Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, layoutMode === "grid" ? styles.activeLayoutBtn : null]}
            onPress={() => setLayoutMode("grid")}
          >
            <Ionicons name="grid" size={18} color={layoutMode === "grid" ? Colors.primary : Colors.textSecondary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, layoutMode === "map" ? styles.activeLayoutBtn : null]}
            onPress={() => setLayoutMode("map")}
          >
            <Ionicons name="map-outline" size={18} color={layoutMode === "map" ? Colors.primary : Colors.textSecondary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
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

      {/* Content Renderer Layouts */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <LoadingSkeleton type="list" count={4} />
        </View>
      ) : layoutMode === "map" ? (
        /* Map view placeholder content */
        <View style={styles.mapPlaceholderContainer}>
          <Ionicons name="map" size={60} color={Colors.primaryLight} />
          <Text style={styles.mapTitle}>Interactive Map View</Text>
          <Text style={styles.mapSubtitle}>Showing 📍 {artists.length} artists nearby on Jaipur map coordinates.</Text>
          <View style={styles.mapCard}>
            <Text style={styles.mapAlertText}>Google/Apple Maps integration placeholder. Loading coordinates: Lat {MOCK_LAT}, Lng {MOCK_LNG}</Text>
          </View>
          <TouchableOpacity style={styles.backToListBtn} onPress={() => setLayoutMode("list")}>
            <Text style={styles.backToListText}>Back to List View</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Dynamic FlatList - Forces refresh of numColumns by dynamically changing key */
        <FlatList
          key={layoutMode === "grid" ? "grid-view-list" : "list-view-list"}
          data={artists}
          numColumns={layoutMode === "grid" ? 2 : 1}
          keyExtractor={(item, index) => String(item.id || item.user_id || item.artist_id || index)}
          renderItem={layoutMode === "grid" ? renderGridArtistCard : renderListArtistCard}
          columnWrapperStyle={layoutMode === "grid" ? styles.gridRowWrapper : null}
          initialNumToRender={6}
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
          contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: layoutMode === "grid" ? 12 : 0 }}
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
  sortFilterBlock: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  subHeaderStats: { flexDirection: "row", alignItems: "center", marginTop: 2 },
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
  statsText: { fontSize: 11, color: Colors.textSecondary },
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
