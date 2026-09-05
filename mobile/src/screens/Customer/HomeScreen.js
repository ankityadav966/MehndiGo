import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import Alert from "../../utils/Alert";
import Colors from "../../constants/Colors";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import OptimizedImage from "../../components/OptimizedImage";
import PaymentModal from "../../components/customer/PaymentModal";
import HomeHeader from "../../components/customer/HomeHeader";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { formatServiceDate, formatTime } from "../../utils/date";

import {
  getHomeDashboard,
  getCategories,
  getNearbyArtists,
  getCustomerProfile,
  getFavorites,
  addFavorite,
  removeFavorite,
  getCustomerAddresses,
  saveCustomerAddress,
  getReels,
} from "../../services/customer";
import {
  getActiveAddress,
  setActiveAddress,
  subscribeActiveAddress,
  checkSmartLocationChange,
  reverseGeocodeCoords,
  autoDetectCurrentLocation,
} from "../../utils/locationManager";
import { getActiveFestivalOffers, resolveFestivalBanner } from "../../utils/festivalEngine";
import { copyAndSaveCoupon } from "../../utils/couponManager";
import { resolveImage } from "../../utils/imageHelper";
import { HOME_FALLBACK_CATEGORIES } from "../../constants/MehndiCategories";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

let memoryCachedDashboard = null;
let memoryCachedNearby = null;

const PromotionalBannerSlider = React.memo(function PromotionalBannerSlider({ offers, navigation }) {
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [bannerErrors, setBannerErrors] = useState({});
  const bannerFlatListRef = useRef(null);
  const bannerTimerRef = useRef(null);

  const dynamicFestivalBanners = React.useMemo(() => (getActiveFestivalOffers() || []).slice(0, 4), []);
  const rawOffers = (offers && offers.length > 0) ? offers : dynamicFestivalBanners;
  const displayOffers = React.useMemo(() => (rawOffers || []).slice(0, 4), [rawOffers]);

  useEffect(() => {
    if (displayOffers.length === 0 || !isAutoPlayEnabled) return;

    if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);

    bannerTimerRef.current = setInterval(() => {
      setActiveBannerIndex((prevIndex) => {
        let nextIndex = prevIndex + 1;
        if (nextIndex >= displayOffers.length) {
          nextIndex = 0;
        }
        if (bannerFlatListRef.current) {
          try {
            bannerFlatListRef.current.scrollToIndex({
              index: nextIndex,
              animated: true,
            });
          } catch (e) {}
        }
        return nextIndex;
      });
    }, 4000);

    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, [isAutoPlayEnabled, displayOffers.length]);

  const getBannerImage = (item) => {
    return resolveFestivalBanner(item);
  };

  const renderBannerItem = useCallback(({ item }) => {
    const bannerImg = getBannerImage(item);
    const hasImageError = !!bannerErrors[item.id];

    const handleBannerPress = async () => {
      if (!item) return;

      if (item.code && item.code !== "FESTIVE") {
        await copyAndSaveCoupon(item.code, item.title || item.festival_name);
        navigation.navigate("Coupons", { prefilledCode: item.code, offer: item });
        return;
      }

      if (item.target_type === "category" && item.target_id) {
        navigation.navigate("ArtistListing", { categoryId: item.target_id, category: item.title });
      } else if (item.target_type === "artist" && item.target_id) {
        navigation.navigate("ArtistProfile", { artistId: item.target_id });
      } else if (item.target_type === "coupons" || item.cta_link === "Coupons" || item.banner_type === "OFFER") {
        navigation.navigate("Coupons");
      } else if (item.cta_link && typeof item.cta_link === "string" && item.cta_link.startsWith("http")) {
        const { Linking } = require("react-native");
        Linking.openURL(item.cta_link).catch(() => {});
      } else {
        navigation.navigate("ArtistListing", { filter: "featured" });
      }
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={{ width: SCREEN_WIDTH, height: 150, paddingHorizontal: 16 }}
        onPress={handleBannerPress}
      >
        <View style={styles.bannerSlideInner}>
          {bannerImg && !hasImageError ? (
            <OptimizedImage
              source={bannerImg}
              onError={() => setBannerErrors((prev) => ({ ...prev, [item.id]: true }))}
              style={styles.bannerBgImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.bannerBgImage, { backgroundColor: (item.theme_color || Colors.primary) + "30" }]} />
          )}
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerTextContainer}>
              {!!(item.badge || item.badge_text) && (
                <View style={[styles.festivalBadgeContainer, { backgroundColor: item.theme_color || Colors.primary }]}>
                  <Text style={styles.festivalBadgeText} numberOfLines={1}>
                    {item.badge || item.badge_text}
                  </Text>
                </View>
              )}
              <Text style={styles.bannerTitle} numberOfLines={1}>{item.title || item.festival_name}</Text>
              {!!(item.subtitle || item.description) && (
                <Text style={styles.bannerSubTitle} numberOfLines={1}>{item.subtitle || item.description}</Text>
              )}
              {!!item.code && (
                <TouchableOpacity
                  style={[styles.promoBadge, { flexDirection: "row", alignItems: "center" }]}
                  activeOpacity={0.8}
                  onPress={(e) => {
                    e.stopPropagation();
                    copyAndSaveCoupon(item.code, item.title || item.festival_name);
                  }}
                >
                  <Text style={styles.promoBadgeText}>Code: {item.code}</Text>
                  <Ionicons name="copy-outline" size={12} color="#FFF" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              )}
            </View>
            {!!(item.discount || item.discount_text) && (
              <View style={styles.discountBadgeWrapper}>
                <Text style={styles.bannerDiscountText}>{item.discount || item.discount_text}</Text>
                {!!item.valid_until && (
                  <Text style={styles.bannerValidityText} numberOfLines={1}>
                    Valid till {item.valid_until.slice(5)}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [bannerErrors, navigation]);

  if (!displayOffers || displayOffers.length === 0) return null;

  return (
    <View style={styles.bannerContainer}>
      <FlatList
        ref={bannerFlatListRef}
        data={displayOffers}
        keyExtractor={(item, index) => String(item.id || item.user_id || item.artist_id || index)}
        horizontal
        pagingEnabled
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        renderItem={renderBannerItem}
        onScrollBeginDrag={() => {
          setIsAutoPlayEnabled(false);
        }}
        onMomentumScrollEnd={(e) => {
          const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          if (slide !== activeBannerIndex) {
            setActiveBannerIndex(slide);
          }
          setIsAutoPlayEnabled(true);
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
        {displayOffers.map((_, i) => (
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
  );
});

export default function HomeScreen({ navigation }) {
  const { user, dispatch, isDarkMode } = useAuth();
  const notifContext = useNotifications();
  const unreadCount = notifContext?.unreadCount || 0;
  const setUnreadCount = notifContext?.setUnreadCount || null;

  const currentBgColor = isDarkMode ? "#000000" : Colors.background;
  const currentCardBg = isDarkMode ? "#121212" : Colors.white;
  const currentTextColor = isDarkMode ? "#FFFFFF" : Colors.text;
  const currentSecTextColor = isDarkMode ? "#B0B0B0" : Colors.textSecondary;
  const currentBorderColor = isDarkMode ? "#333333" : Colors.border;

  const [pendingPaymentBooking, setPendingPaymentBooking] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const hasShownPendingPaymentModalRef = useRef(false);
  const dismissedPendingBookingIdsRef = useRef(new Set());

  const getModalBookingDate = (b) => {
    if (!b) return "";
    const raw = b.booking_date || b.date || b.event_date || b.selected_date || b.reschedule_date || b.slot?.date || b.slot?.start_time;
    if (!raw) return "";
    return formatServiceDate(raw);
  };

  const getModalBookingTime = (b) => {
    if (!b) return "";
    if (b.slot?.time_label) return b.slot.time_label;
    if (b.booking_time) return b.booking_time;
    if (b.time_slot) return b.time_slot;
    if (b.timeLabel) return b.timeLabel;
    if (b.reschedule_time) return b.reschedule_time;
    if (b.slot?.start_time && b.slot?.end_time) {
      try {
        const st = formatTime(b.slot.start_time);
        const et = formatTime(b.slot.end_time);
        return `${st} - ${et}`;
      } catch (e) {
        return String(b.slot.start_time);
      }
    }
    return "";
  };

  const getModalPackageText = (b) => {
    if (!b) return "Mehndi Package";
    if (b.selected_art_title) {
      const tierBadge = b.selected_art_tier === "PREMIUM" ? "Premium Art" : "Standard Art";
      return `${b.selected_art_title} (${tierBadge})`;
    }
    if (b.service_coverage) {
      const covLabel = b.service_coverage.replace(/_/g, " ").toLowerCase();
      const capitalized = covLabel.charAt(0).toUpperCase() + covLabel.slice(1);
      return `${b.service?.specialization_name || "Mehndi Service"} • ${capitalized}`;
    }
    return b.service?.specialization_name || "Custom Mehndi Package";
  };

  // Root level back handler with double-back-to-exit prevention
  useFocusEffect(
    useCallback(() => {
      const { BackHandler } = require("react-native");
      const { handleRootDoubleBackExit } = require("../../utils/navigationHelper");

      const onBackPress = () => {
        if (paymentModalVisible) {
          setPaymentModalVisible(false);
          return true;
        }
        if (locationModalVisible) {
          setLocationModalVisible(false);
          return true;
        }
        if (smartAlertVisible) {
          setSmartAlertVisible(false);
          return true;
        }
        return handleRootDoubleBackExit("Press back again to exit MehndiGo");
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [paymentModalVisible, locationModalVisible, smartAlertVisible])
  );

  // Smart Location Management States
  const [activeAddressState, setActiveAddressState] = useState(null);
  const [savedAddressesList, setSavedAddressesList] = useState([]);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [smartAlertVisible, setSmartAlertVisible] = useState(false);
  const [smartDetectedData, setSmartDetectedData] = useState(null);
  const [locationActionLoading, setLocationActionLoading] = useState(false);

  // Dashboard Aggregated States (Instant 0ms initial load from memory cache)
  const [categories, setCategories] = useState(() => memoryCachedDashboard?.categories || []);
  const [offers, setOffers] = useState(() => memoryCachedDashboard?.offers || memoryCachedDashboard?.banners || []);
  const [featuredArtists, setFeaturedArtists] = useState(() => memoryCachedDashboard?.featured_artists || memoryCachedDashboard?.featuredArtists || []);
  const [popularArtists, setPopularArtists] = useState(() => memoryCachedDashboard?.popular_artists || memoryCachedDashboard?.popularArtists || []);
  const [reels, setReels] = useState(() => memoryCachedDashboard?.reels || []);
  const [recommendations, setRecommendations] = useState([]);
  const [recentlyBookedArtists, setRecentlyBookedArtists] = useState(() => memoryCachedDashboard?.recently_booked || memoryCachedDashboard?.recentlyBooked || []);

  // Nearby Artists Paginated States (Instant 0ms initial load from memory cache)
  const [nearbyArtists, setNearbyArtists] = useState(() => memoryCachedNearby || []);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyPage, setNearbyPage] = useState(1);
  const [hasMoreNearby, setHasMoreNearby] = useState(true);
  const [totalArtistsCount, setTotalArtistsCount] = useState(() => memoryCachedDashboard?.total_artists_count || memoryCachedDashboard?.totalArtistsCount || memoryCachedDashboard?.artists_count || 0);

  // Global Page Loading & Refresh States
  const [dashboardLoading, setDashboardLoading] = useState(() => !memoryCachedDashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters State
  const [selectedFilter, setSelectedFilter] = useState("Nearest");

  // Favorites Map state (local toggle)
  const [favorites, setFavorites] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const lastFavoritesSyncTimeRef = useRef(0);

  // Smart Location Initialization & Background Distance Check
  useEffect(() => {
    const unsubscribe = subscribeActiveAddress((newAddr) => {
      if (newAddr) setActiveAddressState(newAddr);
    });

    async function initLocation() {
      try {
        // 1. Check existing cached active address
        const cached = await getActiveAddress();
        if (cached) {
          setActiveAddressState(cached);
        }

        // 2. Fetch customer's saved addresses in the background if logged in
        let list = [];
        if (user && (user.id || user._id)) {
          const addresses = await getCustomerAddresses().catch(() => []);
          list = Array.isArray(addresses) ? addresses : [];
          setSavedAddressesList(list);
        }

        const primary = list.find((a) => a.is_default) || list[0];

        // 3. If customer has a primary saved address, ensure it's selected as active
        if (primary && (!cached || cached.id !== primary.id)) {
          const norm = await setActiveAddress(primary);
          if (norm) setActiveAddressState(norm);
        } else if (!cached && !primary) {
          // 4. No saved address & no cached address: Automatically detect GPS location or fallback
          const autoLoc = await autoDetectCurrentLocation(user?.city || "Jaipur");
          if (autoLoc) setActiveAddressState(autoLoc);
        }

        // 5. Run smart distance check asynchronously in background if primary address is set
        if (primary && primary.latitude && primary.longitude) {
          setTimeout(async () => {
            try {
              const checkResult = await checkSmartLocationChange(primary, 35);
              if (checkResult.isFar && checkResult.geocodedAddress) {
                setSmartDetectedData(checkResult);
                setSmartAlertVisible(true);
              }
            } catch (e) {}
          }, 3000);
        }
      } catch (e) {
        if (__DEV__) console.log("Error initializing location in Home:", e.message);
      }
    }

    initLocation();
    return () => unsubscribe();
  }, [user?.city]);

  const handleUseCurrentGPSLocation = async () => {
    try {
      setLocationActionLoading(true);
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert("GPS Disabled", "Please enable location services in device settings.");
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "GPS access permission was denied.");
        return;
      }
      let pos = await Location.getLastKnownPositionAsync({});
      if (!pos) {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      if (pos && pos.coords) {
        const geo = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude);
        const norm = await setActiveAddress({
          label: "Current Location",
          fullAddress: geo.fullAddress,
          city: geo.city,
          state: geo.state,
          pincode: geo.pincode,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setActiveAddressState(norm);
        setLocationModalVisible(false);
      }
    } catch (e) {
      Alert.alert("Location Error", e.message || "Failed to detect current location.");
    } finally {
      setLocationActionLoading(false);
    }
  };

  const handleSelectSavedAddress = async (item) => {
    const norm = await setActiveAddress(item);
    setActiveAddressState(norm);
    setLocationModalVisible(false);
  };

  // Persistent Storage Initializer for Instant 0ms Cold Starts
  useEffect(() => {
    async function restoreCachedData() {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const raw = await AsyncStorage.getItem("@mehndigo_dashboard_cache");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && !memoryCachedDashboard) {
            memoryCachedDashboard = parsed;
            if (parsed.categories?.length) setCategories(parsed.categories);
            if (parsed.offers?.length || parsed.banners?.length) setOffers(parsed.offers || parsed.banners);
            if (parsed.featured_artists?.length || parsed.featuredArtists?.length) setFeaturedArtists(parsed.featured_artists || parsed.featuredArtists);
            if (parsed.popular_artists?.length || parsed.popularArtists?.length) setPopularArtists(parsed.popular_artists || parsed.popularArtists);
            if (parsed.reels?.length) setReels(parsed.reels);
            if (parsed.recently_booked?.length || parsed.recentlyBooked?.length) setRecentlyBookedArtists(parsed.recently_booked || parsed.recentlyBooked);
            setDashboardLoading(false);
          }
        }
      } catch (e) {}
    }
    restoreCachedData();
  }, []);

  // Load consolidated dashboard data
  const loadDashboard = async (isRefresh = false) => {
    if (!isRefresh && !memoryCachedDashboard) setDashboardLoading(true);
    try {
      const lat = activeAddressState?.latitude || null;
      const lng = activeAddressState?.longitude || null;

      // Fetch dashboard, categories, favorites, and newest reels in parallel for ultra-fast startup
      const [data, directCats, favs, reelsRes] = await Promise.all([
        getHomeDashboard(lat, lng),
        getCategories().catch(() => []),
        getFavorites().catch(() => []),
        getReels(1, 10).catch(() => []),
      ]);

      const rawCatList = (data?.categories && data.categories.length > 0)
        ? data.categories
        : (Array.isArray(directCats) && directCats.length > 0 ? directCats : (directCats?.data || []));

      const rawReelsList = reelsRes?.reels || reelsRes?.data?.reels || (Array.isArray(reelsRes) ? reelsRes : (reelsRes?.data || []));
      if (rawReelsList && rawReelsList.length > 0) {
        setReels(rawReelsList.slice(0, 10));
      }

      if (data) {
        memoryCachedDashboard = { ...data, categories: rawCatList, reels: (rawReelsList || []).slice(0, 10) };
        setCategories(rawCatList || []);
        setOffers(data?.offers || data?.banners || []);
        setFeaturedArtists(data?.featured_artists || data?.featuredArtists || []);
        setPopularArtists(data?.popular_artists || data?.popularArtists || []);
        setRecentlyBookedArtists(data?.recently_booked || data?.recentlyBooked || []);
        if (data.total_artists_count !== undefined) {
          setTotalArtistsCount(Number(data.total_artists_count));
        } else if (data.totalArtistsCount !== undefined) {
          setTotalArtistsCount(Number(data.totalArtistsCount));
        } else if (data.artists_count !== undefined) {
          setTotalArtistsCount(Number(data.artists_count));
        }
        if (setUnreadCount && (data?.unread_notification_count !== undefined || data?.unread_count !== undefined)) {
          setUnreadCount(data.unread_notification_count ?? data.unread_count ?? 0);
        }
        try {
          const AsyncStorage = require("@react-native-async-storage/async-storage").default;
          AsyncStorage.setItem("@mehndigo_dashboard_cache", JSON.stringify({ ...data, categories: rawCatList }));
        } catch (e) {}
      } else if (rawCatList && rawCatList.length > 0) {
        setCategories(rawCatList);
      }

      if (favs && Array.isArray(favs)) {
        const favMap = {};
        favs.forEach((artist) => {
          if (artist.id) favMap[artist.id] = true;
          if (artist.user_id) favMap[artist.user_id] = true;
          if (artist.artist_profile_id) favMap[artist.artist_profile_id] = true;
          if (artist.artist_id) favMap[artist.artist_id] = true;
        });
        setFavorites(favMap);
      }

      // Check for split payment pending remaining amount (ONLY open modal once on first arrival if not dismissed)
      try {
        const pendingBooking = data?.pendingPaymentBooking;
        if (pendingBooking && pendingBooking.id && Number(pendingBooking.remaining_amount || 0) > 0) {
          setPendingPaymentBooking(pendingBooking);
          if (!hasShownPendingPaymentModalRef.current && !dismissedPendingBookingIdsRef.current.has(pendingBooking.id)) {
            hasShownPendingPaymentModalRef.current = true;
            setPaymentModalVisible(true);
          }
        } else {
          setPendingPaymentBooking(null);
          setPaymentModalVisible(false);

          // If no pending payment, check for pending unreviewed bookings
          if (data?.pendingReviewBooking) {
            const pending = data.pendingReviewBooking;
            navigation.navigate("ReviewSubmission", {
              bookingId: pending.id,
              artistName: pending.artist?.user?.name,
              artistImage: pending.artist?.user?.profile_image,
              specializationName: pending.service?.specialization_name
            });
          }
        }
      } catch (dashErr) {
        if (__DEV__) console.log("Pending check notice:", dashErr.message);
      }

      setError(null);
    } catch (err) {
      if (__DEV__) console.log("Failed to load dashboard:", err.message);
      setError("Failed to fetch dashboard data. Please try again.");
    } finally {
      setDashboardLoading(false);
    }
  };

  // Banner display with dynamic date-aware festival engine fallback (Strict 4-card maximum)
  const dynamicFestivalBanners = React.useMemo(() => (getActiveFestivalOffers() || []).slice(0, 4), []);
  const displayOffers = React.useMemo(() => ((offers && offers.length > 0) ? offers : dynamicFestivalBanners).slice(0, 4), [offers, dynamicFestivalBanners]);

  // Deduplicated unique initial 6 categories for HomeScreen
  const unique6Categories = React.useMemo(() => {
    const map = new Map();
    (categories || []).forEach((cat) => {
      const key = String(cat?.id || cat?.name || cat?.slug || "");
      if (key && !map.has(key)) {
        map.set(key, cat);
      }
    });
    const list = Array.from(map.values()).slice(0, 6);
    if (list.length > 0) return list;

    // Fallback 8 rich mehndi categories (synced with MehndiCategories constant)
    return HOME_FALLBACK_CATEGORIES;
  }, [categories]);

  // Load nearby artists paginated
  const loadNearby = async (page = 1, isRefresh = false, filterOverride = null) => {
    if (nearbyLoading) return;
    setNearbyLoading(true);
    try {
      const lat = activeAddressState?.latitude || null;
      const lng = activeAddressState?.longitude || null;
      const currentFilter = filterOverride !== null ? filterOverride : selectedFilter;
      const data = await getNearbyArtists(lat, lng, null, page, 15, currentFilter);
      const list = Array.isArray(data) ? data : (data?.rows || data?.data || data?.artists || []);
      const total = typeof data?.count === 'number' ? data.count : (typeof data?.total === 'number' ? data.total : list.length);

      if (page === 1) {
        memoryCachedNearby = list;
        setNearbyArtists(list);
      } else {
        setNearbyArtists((prev) => [...prev, ...list]);
      }

      setHasMoreNearby(list.length === 15 && ((page === 1 ? list.length : nearbyArtists.length + list.length) < total));
      setNearbyPage(page);
    } catch (err) {
      if (__DEV__) console.log("Failed to load nearby artists:", err.message);
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

  const lastLoadedCoordsRef = useRef({ lat: undefined, lng: undefined, isFirst: true });

  // Initial mount & location update load
  useEffect(() => {
    const lat = activeAddressState?.latitude || null;
    const lng = activeAddressState?.longitude || null;

    if (!lastLoadedCoordsRef.current.isFirst && lastLoadedCoordsRef.current.lat === lat && lastLoadedCoordsRef.current.lng === lng) {
      return;
    }
    lastLoadedCoordsRef.current = { lat, lng, isFirst: false };

    loadDashboard();
    loadNearby(1);
  }, [activeAddressState?.latitude, activeAddressState?.longitude]);

  useFocusEffect(
    useCallback(() => {
      let isSubscribed = true;
      async function syncUserProfile() {
        try {
          const profileData = await getCustomerProfile();
          if (!isSubscribed) return;
          if (profileData) {
            const hasChanges =
              profileData.profile_image !== user?.profile_image ||
              profileData.city !== user?.city ||
              profileData.name !== user?.name ||
              profileData.phone !== user?.phone;

            if (hasChanges) {
              dispatch({ type: "UPDATE_USER", payload: profileData });
            }
          }
        } catch (e) {
          if (__DEV__) console.log("Failed to sync customer profile on Home:", e.message);
        }
      }

      async function syncFavorites() {
        // Skip duplicate fetch if favorites were fetched less than 30s ago
        if (Date.now() - lastFavoritesSyncTimeRef.current < 30000) {
          return;
        }
        try {
          const favs = await getFavorites();
          if (!isSubscribed) return;
          lastFavoritesSyncTimeRef.current = Date.now();
          const favMap = {};
          (favs || []).forEach((artist) => {
            if (artist.id) favMap[artist.id] = true;
            if (artist.user_id) favMap[artist.user_id] = true;
            if (artist.artist_profile_id) favMap[artist.artist_profile_id] = true;
            if (artist.artist_id) favMap[artist.artist_id] = true;
          });
          setFavorites(favMap);
        } catch (e) {
          if (__DEV__) console.log("Failed to sync favorites on focus:", e.message);
        }
      }

      if (user && (user.id || user._id)) {
        if (!user?.profile_image || !user?.city) {
          syncUserProfile();
        }
        syncFavorites();
      }

      return () => {
        isSubscribed = false;
      };
    }, [dispatch])
  );



  // Toggle favorite
  const toggleFavorite = async (artistId) => {
    if (!artistId) return;
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
      if (__DEV__) console.log("Failed to persist favorite:", err.message);
      // Rollback
      setFavorites((prev) => ({
        ...prev,
        [artistId]: isFav
      }));
    }
  };

  const LOCAL_CATEGORY_IMAGES = {
    "bridal": require("../../assets/images/categories/bridal.png"),
    "royal": require("../../assets/images/categories/royal.png"),
    "arabic": require("../../assets/images/categories/arabic.png"),
    "rajasthani": require("../../assets/images/categories/rajasthani.png"),
    "traditional": require("../../assets/images/categories/traditional.png"),
    "floral": require("../../assets/images/categories/floral.png"),
    "minimal": require("../../assets/images/categories/minimal.png"),
    "minimalist": require("../../assets/images/categories/minimalist.png"),
    "modern": require("../../assets/images/categories/modern.png"),
    "pakistani": require("../../assets/images/categories/pakistani.png"),
    "indo-western": require("../../assets/images/categories/indo_western.png"),
    "finger": require("../../assets/images/categories/finger.png"),
    "full-hand": require("../../assets/images/categories/full_hand.png"),
    "back-hand": require("../../assets/images/categories/back_hand.png"),
    "front-hand": require("../../assets/images/categories/front_hand.png"),
    "leg": require("../../assets/images/categories/leg.png"),
    "kids": require("../../assets/images/categories/kids.png"),
    "groom": require("../../assets/images/categories/groom.png"),
    "engagement": require("../../assets/images/categories/engagement.png"),
    "wedding": require("../../assets/images/categories/wedding.png"),
    "karwa-chauth": require("../../assets/images/categories/karwa_chauth.png"),
    "eid": require("../../assets/images/categories/eid.png"),
    "festival": require("../../assets/images/categories/festival.png"),
    "indo-arabic": require("../../assets/images/categories/indo-arabic.png"),
    "custom": require("../../assets/images/categories/custom.png")
  };

  const getCategoryImage = (item) => {
    const imgUrl = item?.image_url || item?.image;
    if (imgUrl && typeof imgUrl === "string") {
      if (!imgUrl.includes("unsplash.com") && (imgUrl.startsWith("http://") || imgUrl.startsWith("https://"))) {
        return { uri: imgUrl };
      }
      if (imgUrl.startsWith("/")) {
        const { BASE_URL } = require("../../services/api");
        const cleanBase = (BASE_URL || "").replace(/\/api\/v1\/?$/, "");
        return { uri: `${cleanBase}${imgUrl}` };
      }
    }
    const name = (item?.name || "").toLowerCase();
    const slug = (item?.slug || "").toLowerCase();

    let key = "custom";
    if (slug.includes("pakistani") || name.includes("pakistani") || slug.includes("khafif") || name.includes("khafif")) key = "pakistani";
    else if (slug.includes("rajasthani") || name.includes("rajasthani") || slug.includes("marwari") || name.includes("marwari")) key = "rajasthani";
    else if (slug.includes("indo-western") || slug.includes("indo_western") || name.includes("indo-western") || name.includes("indo western") || name.includes("fusion")) key = "indo-western";
    else if (slug.includes("indo-arabic") || slug.includes("indo_arabic") || name.includes("indo-arabic") || name.includes("indo arabic")) key = "indo-arabic";
    else if (slug.includes("royal") || name.includes("royal") || slug.includes("portrait") || name.includes("portrait")) key = "royal";
    else if (slug.includes("bridal") || name.includes("bridal")) key = "bridal";
    else if (slug.includes("arabic") || name.includes("arabic")) key = "arabic";
    else if (slug.includes("traditional") || name.includes("traditional")) key = "traditional";
    else if (slug.includes("floral") || name.includes("floral") || slug.includes("mandala") || name.includes("mandala")) key = "floral";
    else if (slug.includes("minimal") || name.includes("minimal") || slug.includes("geometric") || name.includes("geometric")) key = "minimalist";
    else if (slug.includes("modern") || name.includes("modern")) key = "modern";
    else if (slug.includes("engagement") || name.includes("engagement") || slug.includes("sangeet") || name.includes("sangeet")) key = "engagement";
    else if (slug.includes("finger") || name.includes("finger")) key = "finger";
    else if (slug.includes("full-hand") || name.includes("full hand") || name.includes("full-hand") || name.includes("hand mehendi") || name.includes("hand mehndi")) key = "full-hand";
    else if (slug.includes("back-hand") || name.includes("back hand") || name.includes("back-hand")) key = "back-hand";
    else if (slug.includes("front-hand") || name.includes("front hand") || name.includes("front-hand")) key = "front-hand";
    else if (slug.includes("leg") || name.includes("leg") || slug.includes("feet") || name.includes("feet")) key = "leg";
    else if (slug.includes("kids") || name.includes("kid") || slug.includes("kid")) key = "kids";
    else if (slug.includes("groom") || name.includes("groom")) key = "groom";
    else if (slug.includes("wedding") || name.includes("wedding")) key = "wedding";
    else if (slug.includes("karwa") || name.includes("karwa")) key = "karwa-chauth";
    else if (slug.includes("eid") || name.includes("eid")) key = "eid";
    else if (slug.includes("festival") || name.includes("festival")) key = "festival";

    return LOCAL_CATEGORY_IMAGES[key] || LOCAL_CATEGORY_IMAGES.custom;
  };

  // Render a Category card item
  const renderCategoryItem = useCallback(({ item }) => {
    const hasError = !!imageErrors[item.id];
    const catSource = hasError ? LOCAL_CATEGORY_IMAGES.custom : getCategoryImage(item);
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => navigation.navigate("ArtistListing", { categoryId: item.id, category: item.name, categorySlug: item.slug, from: "Home" })}
      >
        <View style={[styles.categoryIcon, { overflow: "hidden" }]}>
          <OptimizedImage
            source={catSource}
            onError={() => {
              setImageErrors((prev) => ({ ...prev, [item.id]: true }));
            }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
        <Text style={[styles.categoryText, { color: currentTextColor }]} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  }, [imageErrors, currentTextColor]);

  // Render recently booked artist card
  const renderRecentlyBookedItem = useCallback(({ item }) => {
    const formattedDate = item.booking_date ? formatServiceDate(item.booking_date) : "Recently";
    const artistName = item.name || item.full_name || item.user?.name || "Mehndi Specialist";
    const avatarUrl = resolveImage(item.profile_image || item.user?.profile_image || item.avatar || item.selfie_image || item.user?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=F3E8FF&color=7C3AED`;

    return (
      <TouchableOpacity
        style={[styles.recentArtistCard, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: item.id, from: "Home" })}
      >
        <OptimizedImage
          source={{ uri: avatarUrl }}
          style={styles.recentArtistAvatar}
        />
        <View style={styles.recentArtistBadge}>
          <Ionicons name="star" size={10} color="#FFB800" />
          <Text style={styles.recentArtistRatingText}>
            {Number(item.avg_rating || item.rating || 0) > 0 ? Number(item.avg_rating || item.rating).toFixed(1) : "New"}
          </Text>
        </View>
        <View style={styles.recentArtistDetails}>
          <Text style={[styles.recentArtistName, { color: currentTextColor }]} numberOfLines={1}>
            {artistName}
          </Text>
          <Text style={[styles.recentArtistCat, { color: currentSecTextColor }]} numberOfLines={1}>
            {item.specialization_name || "Mehndi Specialist"}
          </Text>
          <Text style={[styles.recentArtistDate, { color: currentSecTextColor }]}>
            Booked: {formattedDate}
          </Text>
          <View style={styles.recentArtistLoc}>
            <Ionicons name="location-outline" size={10} color={Colors.textTertiary} />
            <Text style={[styles.recentArtistLocText, { color: currentSecTextColor }]} numberOfLines={1}>
              {item.city || "Location not set"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [currentCardBg, currentBorderColor, currentTextColor, currentSecTextColor]);

  // Render Horizontal Reel Card Item for Home Screen
  const renderHomeReelItem = useCallback(({ item }) => {
    const thumbnailUri =
      item.thumbnail ||
      item.image_url ||
      (item.video_url ? item.video_url.replace(/\.mp4$/i, ".jpg") : null) ||
      "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=400";

    const artistAvatar = resolveImage(
      item.artist_profile_image ||
      item.artist_avatar ||
      item.avatar ||
      "https://picsum.photos/100"
    );
    const artistName = item.artist_name || item.full_name || "Mehndi Artist";
    const reelTitle = item.title || item.caption || "Mehndi Reel";
    const likesCount = item.real_likes_count ?? item.likes_count ?? 0;

    return (
      <TouchableOpacity
        style={styles.reelHomeCard}
        activeOpacity={0.88}
        onPress={() => navigation.navigate("Reels", { reelId: item.id })}
      >
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.reelHomePoster}
          resizeMode="cover"
        />

        {/* Top Badges */}
        <View style={styles.reelTopOverlay}>
          <View style={styles.reelPlayPill}>
            <Ionicons name="play" size={10} color="#FFFFFF" />
            <Text style={styles.reelPlayPillText}>Reel</Text>
          </View>
          {likesCount > 0 && (
            <View style={styles.reelLikesPill}>
              <Ionicons name="heart" size={10} color="#EF4444" />
              <Text style={styles.reelLikesText}>{likesCount}</Text>
            </View>
          )}
        </View>

        {/* Bottom Dark Gradient / Vignette Overlay */}
        <View style={styles.reelBottomScrim}>
          <Text style={styles.reelCardTitle} numberOfLines={2}>
            {reelTitle}
          </Text>
          <View style={styles.reelArtistRow}>
            <Image
              source={{ uri: artistAvatar }}
              style={styles.reelArtistAvatar}
            />
            <Text style={styles.reelArtistName} numberOfLines={1}>
              {artistName}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  // Render an artist horizontal card (Featured & Popular)
  const renderHorizontalArtistItem = useCallback(({ item }) => {
    const artistId = item.id || item.user_id || item.artist_id;
    const isFav = !!favorites[artistId];
    const artistName = item.name || item.full_name || item.user?.name || "Mehndi Artist";
    const rawImage = item.profile_image || item.user?.profile_image || item.avatar || item.selfie_image || item.user?.avatar;
    const artistImage = resolveImage(rawImage) || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=F3E8FF&color=7C3AED`;
    const startingPrice = item.starting_price || item.services?.[0]?.minimum_price || item.services?.[0]?.price;
    const ratingVal = (item.rating || item.avg_rating) ? Number(item.rating || item.avg_rating).toFixed(1) : null;
    const expText = item.experience_years ? `${item.experience_years} yrs exp` : "Fresh Artist";

    return (
      <TouchableOpacity
        style={[styles.horizontalArtistCard, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}
        onPress={() => navigation.navigate("ArtistProfile", { artistId, from: "Home" })}
      >
        <OptimizedImage
          source={{ uri: artistImage }}
          style={styles.horizontalArtistImage}
          width={280}
          height={160}
        />
        {(item.status === "approved" || item.status === "APPROVED" || item.verification_status === "APPROVED") && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.white} />
          </View>
        )}
        <TouchableOpacity
          style={styles.favoriteBadge}
          onPress={() => toggleFavorite(artistId)}
        >
          <Ionicons
            name={isFav ? "heart" : "heart-outline"}
            size={18}
            color={isFav ? Colors.error : Colors.primary}
          />
        </TouchableOpacity>
        <View style={styles.horizontalArtistInfo}>
          <Text style={[styles.horizontalArtistName, { color: currentTextColor }]} numberOfLines={1}>{artistName}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={[styles.ratingText, { color: currentTextColor }]}>{ratingVal ? `⭐ ${ratingVal}` : "New Artist"}</Text>
            <Text style={[styles.experienceText, { color: currentSecTextColor }]}>• {expText}</Text>
          </View>
          <Text style={[styles.startingPriceText, { color: currentTextColor }]}>
            {startingPrice ? `From ₹${startingPrice}` : "Price on Request"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [favorites, currentCardBg, currentBorderColor, currentTextColor, currentSecTextColor]);

  // Render Nearby Artist Vertical Item
  const renderNearbyArtistItem = useCallback(({ item }) => {
    const artistId = item.id || item.user_id || item.artist_id;
    const isFav = !!favorites[artistId];
    const artistName = item.name || item.full_name || item.user?.name || "Mehndi Artist";
    const rawImage = item.profile_image || item.user?.profile_image || item.avatar || item.selfie_image || item.user?.avatar;
    const artistImage = resolveImage(rawImage) || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=F3E8FF&color=7C3AED`;
    const startingPrice = item.starting_price || item.services?.[0]?.minimum_price || item.services?.[0]?.price;
    const ratingVal = (item.rating || item.avg_rating) ? Number(item.rating || item.avg_rating).toFixed(1) : null;
    const distanceVal = item.distance ? `${Number(item.distance).toFixed(1)} km` : "Nearby";
    const expText = item.experience_years ? `${item.experience_years} yrs exp` : "Fresh Artist";

    return (
      <TouchableOpacity
        style={[styles.nearbyArtistCard, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}
        onPress={() => navigation.navigate("ArtistProfile", { artistId, from: "Home" })}
      >
        <OptimizedImage
          source={{ uri: artistImage }}
          style={styles.nearbyArtistImage}
          width={120}
          height={120}
        />


        <View style={styles.nearbyArtistInfo}>
          <View style={styles.nearbyNameHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Text style={[styles.nearbyArtistName, { color: currentTextColor }]} numberOfLines={1}>{artistName}</Text>
              {(item.status === "approved" || item.status === "APPROVED" || item.verification_status === "APPROVED") && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <TouchableOpacity onPress={() => toggleFavorite(artistId)} style={styles.nearbyFavBtn}>
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
              <Text style={styles.ratingBadgeText}>{ratingVal ? ratingVal : "New"}</Text>
            </View>
            <Text style={[styles.nearbyBulletText, { color: currentSecTextColor }]}>•</Text>
            <Text style={[styles.nearbyStatsText, { color: currentSecTextColor }]}>{expText}</Text>
            <Text style={[styles.nearbyBulletText, { color: currentSecTextColor }]}>•</Text>
            <Text style={[styles.nearbyStatsText, { color: currentSecTextColor }]}>{distanceVal}</Text>
          </View>

          <View style={styles.nearbyFooter}>
            <Text style={[styles.nearbyPriceText, { color: currentTextColor }]}>
              {startingPrice ? `Starting from ₹${startingPrice}` : "Price on Request"}
            </Text>
            {(item.status === "approved" || item.status === "APPROVED" || item.verification_status === "APPROVED") && (
              <View style={styles.availableTodayBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.availableTodayText}>Verified Artist</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [favorites, currentCardBg, currentBorderColor, currentTextColor, currentSecTextColor]);

  // Header sections nested in FlatList for virtual list performance
  const listHeaderComponent = useMemo(() => (
    <View>
      <HomeHeader
        user={user}
        activeAddressState={activeAddressState}
        unreadCount={unreadCount}
        currentTextColor={currentTextColor}
        currentSecTextColor={currentSecTextColor}
        setLocationModalVisible={setLocationModalVisible}
        navigation={navigation}
      />

      {/* 2. Search Bar Trigger */}
      <TouchableOpacity
        style={[styles.searchBar, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("Search")}
      >
        <Ionicons name="search-outline" size={20} color={Colors.textTertiary} style={{ marginRight: 10 }} />
        <Text style={[styles.searchPlaceholder, { color: currentSecTextColor }]}>Search artists, services, pincodes...</Text>
        <View style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={Colors.white} />
        </View>
      </TouchableOpacity>

      {/* Pending Payment Sticky Card */}
      {pendingPaymentBooking && Number(pendingPaymentBooking.remaining_amount || 0) > 0 && (
        <View style={styles.premiumPendingCard}>
          <View style={[styles.premiumPendingHeader, { justifyContent: "space-between", flexDirection: "row", alignItems: "center" }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="warning" size={16} color="#D97706" />
              <Text style={[styles.premiumPendingTitle, { marginLeft: 6 }]}>Action Required: Pending Payment</Text>
            </View>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => {
                if (pendingPaymentBooking?.id) {
                  dismissedPendingBookingIdsRef.current.add(pendingPaymentBooking.id);
                }
                setPendingPaymentBooking(null);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#D97706" />
            </TouchableOpacity>
          </View>
          <View style={styles.premiumPendingBody}>
            <OptimizedImage
              source={{ uri: resolveImage(pendingPaymentBooking.artist?.user?.profile_image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingPaymentBooking.artist?.user?.name || "Specialist")}&background=F3E8FF&color=7C3AED` }}
              style={styles.premiumPendingAvatar}
            />
            <View style={styles.premiumPendingInfo}>
              <Text style={styles.premiumPendingArtist}>
                {pendingPaymentBooking.artist?.user?.name || pendingPaymentBooking.artist?.business_name || "Mehndi Specialist"}
              </Text>
              <Text style={styles.premiumPendingDate}>
                Date: {getModalBookingDate(pendingPaymentBooking) || "Confirmed Booking"}
              </Text>
              <Text style={styles.premiumPendingAmount}>
                Remaining Due: <Text style={{ color: Colors.primary, fontWeight: "800" }}>₹{pendingPaymentBooking.remaining_amount}</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.premiumPayBtn}
              onPress={() => {
                navigation.navigate("BookingSettlement", {
                  bookingId: pendingPaymentBooking.id
                });
              }}
            >
              <Text style={styles.premiumPayText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. Promotional Banner Slider */}
      <PromotionalBannerSlider offers={offers} navigation={navigation} />

      {/* 4. Categories Section (Exactly 6 unique categories on HomeScreen) */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: currentTextColor }]}>Mehndi Categories</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Categories", { from: "Home" })}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={unique6Categories}
        keyExtractor={(item, index) => String(item.id || item.user_id || item.artist_id || index)}
        horizontal
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
        renderItem={renderCategoryItem}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
      />

      {/* 5. Featured Artists Section */}
      {featuredArtists.length > 0 && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTextColor }]}>Featured Artists</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ArtistListing", { filter: "featured", from: "Home" })}>
              <Text style={styles.viewAllText}>View All ({featuredArtists.length})</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featuredArtists}
            keyExtractor={(item, index) => String(item.id || item.user_id || item.artist_id || index)}
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
            renderItem={renderHorizontalArtistItem}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
          />
        </View>
      )}

      {/* 6. Trending Mehndi Reels Section (Replaced Trending & Popular) */}
      {reels.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.reelsHeaderIconBadge}>
                <Ionicons name="play" size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTextColor }]}>Trending Reels</Text>
              <View style={styles.reelsNewBadge}>
                <Text style={styles.reelsNewBadgeText}>NEW</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Reels")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.viewAllText}>Watch All ({reels.length}) →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={reels.slice(0, 10)}
            keyExtractor={(item, index) => String(item.id || index)}
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, paddingBottom: 6 }}
            renderItem={renderHomeReelItem}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
          />
        </View>
      )}
      {/* 6b. Recently Booked Artists Section */}
      {recentlyBookedArtists.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTextColor }]}>Recently Booked Artists</Text>
          </View>
          <FlatList
            data={recentlyBookedArtists}
            keyExtractor={(item, index) => String(item.id || item.user_id || item.artist_id || index)}
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
            renderItem={renderRecentlyBookedItem}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
          />
        </View>
      )}

      {/* 7. Quick Filters Row & All Mehndi Artists */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[styles.sectionTitle, { color: currentTextColor }]}>All Mehndi Artists</Text>
          <View style={{ backgroundColor: Colors.primary + "18", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 }}>
            <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: "700" }}>{totalArtistsCount > 0 ? `${totalArtistsCount}` : (nearbyArtists.length > 0 ? `${nearbyArtists.length}+` : "All")}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("ArtistListing", { filter: "all" })}>
          <Text style={styles.viewAllText}>View All ({totalArtistsCount > 0 ? totalArtistsCount : nearbyArtists.length})</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={["All", "Nearest", "Top Rated", "Price Low-High", "5+ Exp Years", "Bridal", "Home Service", "Verified"]}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
        keyExtractor={(item) => item}
        renderItem={({ item: filter }) => (
          <TouchableOpacity
            style={[
              styles.filterBadge,
              selectedFilter === filter ? styles.activeFilterBadge : null
            ]}
            onPress={() => {
              if (selectedFilter === filter) return;
              setSelectedFilter(filter);
              setNearbyArtists([]);
              loadNearby(1, false, filter);
            }}
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
        )}
      />
    </View>
  ), [user, activeAddressState, unreadCount, currentTextColor, currentSecTextColor, currentCardBg, currentBorderColor, pendingPaymentBooking, offers, unique6Categories, featuredArtists, popularArtists, recentlyBookedArtists, selectedFilter, favorites, renderCategoryItem, renderHorizontalArtistItem, renderRecentlyBookedItem, navigation]);

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
          <Text style={styles.emptyTitle}>No Artists Found</Text>
          <Text style={styles.emptySub}>Try adjusting your coordinates or filter settings.</Text>
        </View>
      );
    }
    if (!hasMoreNearby) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>Showing all {nearbyArtists.length} verified mehndi artists</Text>
        </View>
      );
    }
    return null;
  };

  const homePreviewNearbyArtists = React.useMemo(() => {
    const map = new Map();
    (nearbyArtists || []).forEach((item) => {
      const key = String(item.id || item.user_id || item.artist_id);
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [nearbyArtists]);

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
        data={homePreviewNearbyArtists}
        keyExtractor={(item, index) => String(item.id || item.user_id || item.artist_id || index)}
        renderItem={renderNearbyArtistItem}
        ListHeaderComponent={listHeaderComponent}
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
        contentContainerStyle={{ paddingBottom: 180 }}
      />

      <PaymentModal
        visible={paymentModalVisible}
        booking={pendingPaymentBooking}
        onClose={() => {
          if (pendingPaymentBooking?.id) {
            dismissedPendingBookingIdsRef.current.add(pendingPaymentBooking.id);
          }
          hasShownPendingPaymentModalRef.current = true;
          setPaymentModalVisible(false);
        }}
        onPay={() => {
          if (pendingPaymentBooking?.id) {
            dismissedPendingBookingIdsRef.current.add(pendingPaymentBooking.id);
          }
          hasShownPendingPaymentModalRef.current = true;
          setPaymentModalVisible(false);
          navigation.navigate("BookingSettlement", {
            bookingId: pendingPaymentBooking.id
          });
        }}
        getModalBookingDate={getModalBookingDate}
        getModalBookingTime={getModalBookingTime}
        getModalPackageText={getModalPackageText}
      />

      {/* Location Switcher Bottom Sheet Modal */}
      <Modal visible={locationModalVisible} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { backgroundColor: currentCardBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: currentTextColor }]}>Select Service Location</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close" size={24} color={currentSecTextColor} />
              </TouchableOpacity>
            </View>

            {/* Active Selected Location Banner */}
            {activeAddressState && (
              <View style={styles.activeLocationCard}>
                <Ionicons name="checkmark-circle-sharp" size={20} color="#059669" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeLocLabel}>{activeAddressState.label || "Active Location"}</Text>
                  <Text style={styles.activeLocSub} numberOfLines={2}>{activeAddressState.fullAddress}</Text>
                </View>
              </View>
            )}

            {/* Use GPS Location Button */}
            <TouchableOpacity style={styles.gpsActionBtn} onPress={handleUseCurrentGPSLocation} disabled={locationActionLoading}>
              {locationActionLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 10 }} />
              ) : (
                <Ionicons name="navigate-circle-outline" size={22} color={Colors.primary} style={{ marginRight: 10 }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsActionTitle}>Use Current GPS Location</Text>
                <Text style={styles.gpsActionSub}>Detect your precise location automatically</Text>
              </View>
            </TouchableOpacity>

            <Text style={[styles.sheetSectionHeader, { color: currentSecTextColor }]}>SAVED ADDRESSES</Text>

            <FlatList
              data={savedAddressesList}
              keyExtractor={(item, index) => String(item.id || index)}
              renderItem={({ item }) => {
                const isSelected = activeAddressState?.id === item.id;
                const tag = item.label || item.name || "Home";

                return (
                  <TouchableOpacity
                    style={[styles.savedAddressItem, isSelected && styles.savedAddressItemActive]}
                    onPress={() => handleSelectSavedAddress(item)}
                  >
                    <Ionicons
                      name={tag === "Home" ? "home-outline" : tag === "Work" ? "briefcase-outline" : "location-outline"}
                      size={20}
                      color={isSelected ? Colors.primary : currentSecTextColor}
                      style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={[styles.savedAddrTag, { color: currentTextColor }]}>{tag}</Text>
                        {item.is_default && (
                          <View style={styles.miniPrimaryBadge}>
                            <Text style={styles.miniPrimaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.savedAddrLine, { color: currentSecTextColor }]} numberOfLines={1}>
                        {[item.house_flat || item.houseFlat, item.landmark, item.address_line_1 || item.fullAddress]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 200 }}
            />

            <TouchableOpacity
              style={styles.manageAddrBtn}
              onPress={() => {
                setLocationModalVisible(false);
                navigation.navigate("SavedAddresses");
              }}
            >
              <Ionicons name="settings-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.manageAddrText}>Add or Manage Addresses</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Smart Location Alert Bottom Sheet Modal */}
      <Modal visible={smartAlertVisible} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { backgroundColor: currentCardBg }]}>
            <View style={styles.smartHeader}>
              <View style={styles.smartIconWrap}>
                <Ionicons name="location-sharp" size={28} color={Colors.primary} />
              </View>
              <Text style={[styles.smartTitle, { color: currentTextColor }]}>You're in a new location</Text>
              <Text style={[styles.smartSub, { color: currentSecTextColor }]}>
                We detected you are ~{smartDetectedData?.distanceKm || 40} km away from your saved home address. Would you like to view Mehendi artists near your current location?
              </Text>
            </View>

            {smartDetectedData?.geocodedAddress && (
              <View style={styles.detectedCard}>
                <Ionicons name="navigate-outline" size={18} color="#1E40AF" style={{ marginRight: 8 }} />
                <Text style={styles.detectedText} numberOfLines={2}>
                  {smartDetectedData.geocodedAddress.fullAddress}
                </Text>
              </View>
            )}

            <View style={styles.smartBtnRow}>
              <TouchableOpacity
                style={styles.smartBtnPrimary}
                onPress={async () => {
                  if (smartDetectedData?.geocodedAddress) {
                    const norm = await setActiveAddress({
                      label: "Current Location",
                      fullAddress: smartDetectedData.geocodedAddress.fullAddress,
                      city: smartDetectedData.geocodedAddress.city,
                      state: smartDetectedData.geocodedAddress.state,
                      pincode: smartDetectedData.geocodedAddress.pincode,
                      latitude: smartDetectedData.currentCoords?.latitude,
                      longitude: smartDetectedData.currentCoords?.longitude,
                    });
                    setActiveAddressState(norm);
                  }
                  setSmartAlertVisible(false);
                }}
              >
                <Text style={styles.smartBtnPrimaryText}>Use Current Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.smartBtnSecondary}
                onPress={() => setSmartAlertVisible(false)}
              >
                <Text style={styles.smartBtnSecondaryText}>Keep Home Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  premiumPendingCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
    padding: 14,
    elevation: 3,
    shadowColor: "#D97706",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  premiumPendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FEF3C7",
    paddingBottom: 6
  },
  premiumPendingTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  premiumPendingBody: {
    flexDirection: "row",
    alignItems: "center"
  },
  premiumPendingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#F59E0B"
  },
  premiumPendingInfo: {
    flex: 1,
    marginLeft: 12
  },
  premiumPendingArtist: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text
  },
  premiumPendingDate: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2
  },
  premiumPendingAmount: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2
  },
  premiumPayBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  },
  premiumPayText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 11
  },

  // Recently Booked Artist Styles
  recentArtistCard: {
    width: 140,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }
  },
  recentArtistAvatar: {
    width: "100%",
    height: 90,
    borderRadius: 12,
    backgroundColor: Colors.background
  },
  recentArtistBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  recentArtistRatingText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.text,
    marginLeft: 2
  },
  recentArtistDetails: {
    marginTop: 8
  },
  recentArtistName: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text
  },
  recentArtistCat: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1
  },
  recentArtistDate: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 4
  },
  recentArtistLoc: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3
  },
  recentArtistLocText: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginLeft: 2,
    flex: 1
  },
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
  bannerSlideInner: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative"
  },
  bannerBgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%"
  },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  bannerTextContainer: { flex: 1, paddingRight: 8, justifyContent: "center" },
  bannerTitle: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  bannerSubTitle: { color: Colors.white, fontSize: 11, opacity: 0.85, marginTop: 2 },
  promoBadge: {
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    maxWidth: "100%"
  },
  promoBadgeText: { color: Colors.white, fontSize: 10, fontWeight: "600" },
  festivalBadgeContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4
  },
  festivalBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  discountBadgeWrapper: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0
  },
  bannerValidityText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2
  },
  bannerDiscountText: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
    flexShrink: 0
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
  categoryCard: {
    alignItems: "center",
    marginRight: 16,
    width: 76
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center"
  },
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
    paddingBottom: 12,
    alignItems: "center",
  },
  filterBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilterBadge: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  filterBadgeText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  activeFilterBadgeText: { color: Colors.white, fontWeight: "700" },
  filterBadgeMore: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + "15",
    borderWidth: 1,
    borderColor: Colors.primaryLight + "40",
    marginRight: 8,
  },
  filterBadgeMoreText: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
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
  footerEndText: { fontSize: 12, color: Colors.textTertiary },

  // Split Payment Styles
  pendingCardContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }
  },
  pendingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  pendingCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginLeft: 6
  },
  pendingCardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pendingCardLeft: {
    flex: 1
  },
  pendingArtistText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text
  },
  pendingPriceText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2
  },
  pendingPayBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  pendingPayBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContent: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalHeaderIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10
  },
  modalArtistCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    width: "100%"
  },
  modalArtistPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.primary
  },
  modalArtistMeta: {
    flex: 1,
    marginLeft: 12
  },
  modalArtistName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text
  },
  modalArtistCategory: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 2
  },
  modalArtistStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  modalStatItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  modalStatItemText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginLeft: 2
  },
  modalDivider: {
    fontSize: 10,
    color: Colors.border,
    marginHorizontal: 6
  },
  modalBookingDetailsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    width: "100%"
  },
  modalDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  modalDetailLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginLeft: 6,
    width: 80
  },
  modalDetailValue: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.text,
    flex: 1
  },
  modalBillingSummary: {
    backgroundColor: Colors.primaryLight + "08",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primaryLight + "20",
    width: "100%"
  },
  modalBillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3
  },
  modalBillLabel: {
    fontSize: 11,
    color: Colors.textSecondary
  },
  modalBillValue: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text
  },
  modalDividerLine: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
    opacity: 0.5
  },
  modalActionRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between"
  },
  modalLaterBtn: {
    flex: 1,
    marginRight: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white
  },
  modalLaterText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  modalPayBtn: {
    flex: 2,
    marginLeft: 8,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  modalPayText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700"
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  activeLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  activeLocLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#047857",
  },
  activeLocSub: {
    fontSize: 12,
    color: "#065F46",
    marginTop: 2,
  },
  gpsActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  gpsActionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
  },
  gpsActionSub: {
    fontSize: 12,
    color: "#3B82F6",
    marginTop: 2,
  },
  sheetSectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  savedAddressItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  savedAddressItemActive: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  savedAddrTag: {
    fontSize: 14,
    fontWeight: "600",
  },
  miniPrimaryBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  miniPrimaryBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },
  savedAddrLine: {
    fontSize: 12,
    marginTop: 2,
  },
  manageAddrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
  manageAddrText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Smart Alert Bottom Sheet Styles
  smartHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  smartIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF1F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  smartTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  smartSub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  detectedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  detectedText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1E3A8A",
    flex: 1,
  },
  smartBtnRow: {
    width: "100%",
  },
  smartBtnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  smartBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  smartBtnSecondary: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  smartBtnSecondaryText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },

  // Trending Reels Section Styles
  reelsHeaderIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#9C1344",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  reelsNewBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginLeft: 8,
  },
  reelsNewBadgeText: {
    color: "#059669",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  reelHomeCard: {
    width: 130,
    height: 205,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: "#1F2937",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    position: "relative",
  },
  reelHomePoster: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#374151",
  },
  reelTopOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reelPlayPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  reelPlayPillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  reelLikesPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  reelLikesText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  reelBottomScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 28,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  reelCardTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    marginBottom: 6,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  reelArtistRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reelArtistAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    marginRight: 6,
  },
  reelArtistName: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
  },
});
