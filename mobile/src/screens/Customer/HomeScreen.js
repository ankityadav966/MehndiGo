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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import OptimizedImage from "../../components/OptimizedImage";
import { useAuth } from "../../context/AuthContext";

import {
  getHomeDashboard,
  getNearbyArtists,
  getCustomerProfile,
  getFavorites,
  addFavorite,
  removeFavorite,
  getCustomerDashboard,
  getCustomerAddresses,
  saveCustomerAddress,
} from "../../services/customer";
import { getPendingPayment } from "../../services/booking";
import {
  getActiveAddress,
  setActiveAddress,
  subscribeActiveAddress,
  checkSmartLocationChange,
  reverseGeocodeCoords,
} from "../../utils/locationManager";
import * as Location from "expo-location";
import Alert from "../../utils/Alert";



const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen({ navigation }) {
  const { user, dispatch, isDarkMode } = useAuth();

  const currentBgColor = isDarkMode ? "#000000" : Colors.background;
  const currentCardBg = isDarkMode ? "#121212" : Colors.white;
  const currentTextColor = isDarkMode ? "#FFFFFF" : Colors.text;
  const currentSecTextColor = isDarkMode ? "#B0B0B0" : Colors.textSecondary;
  const currentBorderColor = isDarkMode ? "#333333" : Colors.border;

  const [pendingPaymentBooking, setPendingPaymentBooking] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  // Smart Location Management States
  const [activeAddressState, setActiveAddressState] = useState(null);
  const [savedAddressesList, setSavedAddressesList] = useState([]);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [smartAlertVisible, setSmartAlertVisible] = useState(false);
  const [smartDetectedData, setSmartDetectedData] = useState(null);
  const [locationActionLoading, setLocationActionLoading] = useState(false);

  // Dashboard Aggregated States
  const [categories, setCategories] = useState([]);

  const [offers, setOffers] = useState([]);
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [popularArtists, setPopularArtists] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recentlyBookedArtists, setRecentlyBookedArtists] = useState([]);

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
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [bannerErrors, setBannerErrors] = useState({});
  const bannerFlatListRef = useRef(null);
  const bannerTimerRef = useRef(null);

  // Smart Location Initialization & Background Distance Check
  useEffect(() => {
    const unsubscribe = subscribeActiveAddress((newAddr) => {
      setActiveAddressState(newAddr);
    });

    async function initLocation() {
      const cached = await getActiveAddress();
      if (cached) {
        setActiveAddressState(cached);
      }

      try {
        const addresses = await getCustomerAddresses();
        const list = addresses || [];
        setSavedAddressesList(list);

        const primary = list.find((a) => a.is_default) || list[0];

        // First Login Flow: If customer has NO saved primary address, navigate to InitialLocationSetup
        if (list.length === 0) {
          navigation.navigate("InitialLocationSetup");
          return;
        }

        if (!cached && primary) {
          const norm = await setActiveAddress(primary);
          setActiveAddressState(norm);
        }

        // Smart Background Location Check (>35km)
        if (primary && primary.latitude && primary.longitude) {
          const checkResult = await checkSmartLocationChange(primary, 35);
          if (checkResult.isFar && checkResult.geocodedAddress) {
            setSmartDetectedData(checkResult);
            setSmartAlertVisible(true);
          }
        }
      } catch (e) {
        console.log("Error initializing location in Home:", e.message);
      }
    }

    initLocation();
    return () => unsubscribe();
  }, [navigation]);

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
      setRecommendations(data?.recommendations || []);
      setRecentlyBookedArtists(data?.recentlyBooked || []);


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

      // Check for split payment pending remaining amount
      try {
        const pendingBooking = await getPendingPayment();
        if (pendingBooking) {
          setPendingPaymentBooking(pendingBooking);
          setPaymentModalVisible(true);
        } else {
          setPendingPaymentBooking(null);
          setPaymentModalVisible(false);

          // If no pending payment, check for pending unreviewed bookings
          const custDash = await getCustomerDashboard();
          if (custDash?.pendingReviewBooking) {
            const pending = custDash.pendingReviewBooking;
            navigation.navigate("ReviewSubmission", {
              bookingId: pending.id,
              artistName: pending.artist?.user?.name,
              artistImage: pending.artist?.user?.profile_image,
              specializationName: pending.service?.specialization_name
            });
          }

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

            // Check if phone number is missing
            if (!profileData.phone) {
              const { Alert } = require("react-native");
              Alert.alert(
                "Phone Number Required",
                "Please update your phone number to continue using MehndiGo.",
                [
                  {
                    text: "Update Now",
                    onPress: () => navigation.navigate("EditProfile")
                  }
                ],
                { cancelable: false }
              );
            }
          }
        } catch (e) {
          console.log("Failed to sync customer profile on Home:", e.message);
        }
      }

      if (user && !user.phone) {
        syncUserProfile();
      } else if (!user?.profile_image || !user?.city) {
        syncUserProfile();
      }

      return () => {
        isSubscribed = false;
      };
    }, [dispatch, user, navigation])
  );

  // Banner Auto-scrolling carousel setup
  useEffect(() => {
    if (offers.length === 0 || !isAutoPlayEnabled) return;

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
  }, [offers, activeBannerIndex, isAutoPlayEnabled]);

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

  const LOCAL_CATEGORY_IMAGES = {
    "bridal": require("../../assets/images/categories/bridal.png"),
    "royal": require("../../assets/images/categories/royal.png"),
    "arabic": require("../../assets/images/categories/arabic.png"),
    "traditional": require("../../assets/images/categories/traditional.png"),
    "floral": require("../../assets/images/categories/floral.png"),
    "minimal": require("../../assets/images/categories/minimal.png"),
    "modern": require("../../assets/images/categories/modern.png"),
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
    "indo-arabic": require("../../assets/images/categories/indo_arabic.png"),
    "custom": require("../../assets/images/categories/custom.png")
  };

  const getCategoryImage = (item) => {
    if (item && item.image && typeof item.image === "string") {
      if (item.image.startsWith("http://") || item.image.startsWith("https://")) {
        return { uri: item.image };
      }
      if (item.image.startsWith("/")) {
        const { BASE_URL } = require("../../services/api");
        const cleanBase = (BASE_URL || "").replace(/\/api\/v1\/?$/, "");
        return { uri: `${cleanBase}${item.image}` };
      }
    }
    const name = (item?.name || "").toLowerCase();
    const slug = (item?.slug || "").toLowerCase();

    let key = "custom";
    if (slug.includes("indo-arabic") || slug.includes("indo_arabic") || name.includes("indo-arabic") || name.includes("indo arabic") || name.includes("fusion")) key = "indo-arabic";
    else if (slug.includes("royal") || name.includes("royal")) key = "royal";
    else if (slug.includes("bridal") || name.includes("bridal")) key = "bridal";
    else if (slug.includes("arabic") || name.includes("arabic")) key = "arabic";
    else if (slug.includes("traditional") || name.includes("traditional")) key = "traditional";
    else if (slug.includes("floral") || name.includes("floral")) key = "floral";
    else if (slug.includes("minimal") || name.includes("minimal")) key = "minimal";
    else if (slug.includes("modern") || name.includes("modern")) key = "modern";
    else if (slug.includes("finger") || name.includes("finger")) key = "finger";
    else if (slug.includes("full-hand") || name.includes("full hand") || name.includes("full-hand") || name.includes("hand mehendi") || name.includes("hand mehndi")) key = "full-hand";
    else if (slug.includes("back-hand") || name.includes("back hand") || name.includes("back-hand")) key = "back-hand";
    else if (slug.includes("front-hand") || name.includes("front hand") || name.includes("front-hand")) key = "front-hand";
    else if (slug.includes("leg") || name.includes("leg") || slug.includes("feet") || name.includes("feet")) key = "leg";
    else if (slug.includes("kids") || name.includes("kid") || slug.includes("kid")) key = "kids";
    else if (slug.includes("groom") || name.includes("groom")) key = "groom";
    else if (slug.includes("engagement") || name.includes("engagement")) key = "engagement";
    else if (slug.includes("wedding") || name.includes("wedding")) key = "wedding";
    else if (slug.includes("karwa") || name.includes("karwa")) key = "karwa-chauth";
    else if (slug.includes("eid") || name.includes("eid")) key = "eid";
    else if (slug.includes("festival") || name.includes("festival")) key = "festival";

    return LOCAL_CATEGORY_IMAGES[key] || LOCAL_CATEGORY_IMAGES.custom;
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
            source={hasError ? LOCAL_CATEGORY_IMAGES.custom : getCategoryImage(item)}

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
  };

  const getBannerImage = (item) => {
    const id = String(item.id);
    const LOCAL_BANNERS = {
      "1": require("../../assets/images/categories/bridal.png"),
      "2": require("../../assets/images/categories/royal.png"),
      "3": require("../../assets/images/categories/arabic.png"),
      "4": require("../../assets/images/categories/traditional.png"),
      "5": require("../../assets/images/categories/festival.png"),
      "6": require("../../assets/images/categories/custom.png")
    };
    return LOCAL_BANNERS[id] || LOCAL_BANNERS["1"];
  };

  // Render a banner item
  const renderBannerItem = ({ item }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={{ width: SCREEN_WIDTH, height: 150, paddingHorizontal: 16 }}
        onPress={() => navigation.navigate("Coupons")}
      >
        <View style={styles.bannerSlideInner}>
          <Image
            source={getBannerImage(item)}
            style={styles.bannerBgImage}
            resizeMode="cover"
          />
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
        </View>
      </TouchableOpacity>
    );
  };

  // Render recently booked artist card
  const renderRecentlyBookedItem = ({ item }) => {
    const formattedDate = item.booking_date ? new Date(item.booking_date).toLocaleDateString() : "Recently";
    return (
      <TouchableOpacity
        style={[styles.recentArtistCard, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: item.id })}
      >
        <Image
          source={{ uri: item.profile_image || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=150" }}
          style={styles.recentArtistAvatar}
        />
        <View style={styles.recentArtistBadge}>
          <Ionicons name="star" size={10} color="#FFB800" />
          <Text style={styles.recentArtistRatingText}>{item.avg_rating || "4.8"}</Text>
        </View>
        <View style={styles.recentArtistDetails}>
          <Text style={[styles.recentArtistName, { color: currentTextColor }]} numberOfLines={1}>
            {item.name || "Specialist"}
          </Text>
          <Text style={[styles.recentArtistCat, { color: currentSecTextColor }]} numberOfLines={1}>
            {item.specialization_name || "Bridal Mehndi"}
          </Text>
          <Text style={[styles.recentArtistDate, { color: currentSecTextColor }]}>
            Booked: {formattedDate}
          </Text>
          <View style={styles.recentArtistLoc}>
            <Ionicons name="location-outline" size={10} color={Colors.textTertiary} />
            <Text style={[styles.recentArtistLocText, { color: currentSecTextColor }]} numberOfLines={1}>
              {item.city || "Jaipur"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render an artist horizontal card (Featured & Popular)
  const renderHorizontalArtistItem = ({ item }) => {
    const isFav = !!favorites[item.id];
    return (
      <TouchableOpacity
        style={[styles.horizontalArtistCard, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: item.id })}
      >
        <OptimizedImage
          source={{ uri: item.user?.profile_image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400" }}
          style={styles.horizontalArtistImage}
          width={280}
          height={160}
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
          <Text style={[styles.horizontalArtistName, { color: currentTextColor }]} numberOfLines={1}>{item.user?.name || "Artist"}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={[styles.ratingText, { color: currentTextColor }]}>{Number(item.avg_rating || 0).toFixed(1)}</Text>
            <Text style={[styles.experienceText, { color: currentSecTextColor }]}>• {item.experience_years || 2} yrs exp</Text>
          </View>
          <Text style={[styles.startingPriceText, { color: currentTextColor }]}>From ₹{item.services?.[0]?.minimum_price || 1500}</Text>
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
        style={[styles.nearbyArtistCard, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: item.id })}
      >
        <OptimizedImage
          source={{ uri: item.user?.profile_image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400" }}
          style={styles.nearbyArtistImage}
          width={120}
          height={120}
        />


        <View style={styles.nearbyArtistInfo}>
          <View style={styles.nearbyNameHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Text style={[styles.nearbyArtistName, { color: currentTextColor }]} numberOfLines={1}>{item.user?.name || "Artist"}</Text>
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
            <Text style={[styles.nearbyBulletText, { color: currentSecTextColor }]}>•</Text>
            <Text style={[styles.nearbyStatsText, { color: currentSecTextColor }]}>{item.experience_years || 2} Years Exp</Text>
            <Text style={[styles.nearbyBulletText, { color: currentSecTextColor }]}>•</Text>
            <Text style={[styles.nearbyStatsText, { color: currentSecTextColor }]}>{distanceVal}</Text>
          </View>

          <View style={styles.nearbyFooter}>
            <Text style={[styles.nearbyPriceText, { color: currentTextColor }]}>Starting from ₹{item.services?.[0]?.minimum_price || 1500}</Text>
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
            <Text style={[styles.helloText, { color: currentSecTextColor }]}>Welcome back 👋</Text>
            <Text style={[styles.userNameText, { color: currentTextColor }]}>{user?.name || "Customer"}</Text>
            <TouchableOpacity style={styles.locationWrapper} onPress={() => setLocationModalVisible(true)} activeOpacity={0.8}>
              <Ionicons name="location-sharp" size={14} color={Colors.primary} />
              <Text style={[styles.locationText, { color: currentSecTextColor, maxWidth: 180 }]} numberOfLines={1}>
                {activeAddressState?.label
                  ? `${activeAddressState.label}: ${activeAddressState.fullAddress}`
                  : activeAddressState?.fullAddress || user?.city || "Jaipur, Rajasthan"}
              </Text>
              <Ionicons name="chevron-down" size={12} color={currentSecTextColor} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

          </View>
        </View>
        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => navigation.navigate("NotificationCenter")}
        >
          <Ionicons name="notifications-outline" size={24} color={currentTextColor} />
        </TouchableOpacity>
      </View>

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
      {pendingPaymentBooking && (
        <View style={styles.premiumPendingCard}>
          <View style={styles.premiumPendingHeader}>
            <Ionicons name="warning" size={16} color="#D97706" />
            <Text style={styles.premiumPendingTitle}>Action Required: Pending Payment</Text>
          </View>
          <View style={styles.premiumPendingBody}>
            <Image
              source={{ uri: pendingPaymentBooking.artist?.user?.profile_image || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=150" }}
              style={styles.premiumPendingAvatar}
            />
            <View style={styles.premiumPendingInfo}>
              <Text style={styles.premiumPendingArtist}>{pendingPaymentBooking.artist?.user?.name || "Professional Specialist"}</Text>
              <Text style={styles.premiumPendingDate}>
                Date: {pendingPaymentBooking.slot?.start_time ? new Date(pendingPaymentBooking.slot.start_time).toLocaleDateString() : (pendingPaymentBooking.reschedule_date ? new Date(pendingPaymentBooking.reschedule_date).toLocaleDateString() : "Today")}
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
      {offers.length > 0 && (
        <View style={styles.bannerContainer}>
          <FlatList
            ref={bannerFlatListRef}
            data={offers}
            keyExtractor={(item) => String(item.id)}
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

      {/* 4. Categories Section (Exactly 8 categories on HomeScreen) */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: currentTextColor }]}>Mehndi Categories</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Categories")}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={(categories && categories.length > 0 ? categories : [
          { id: 1, name: "Bridal Mehendi", slug: "bridal-mehendi" },
          { id: 2, name: "Arabic Mehendi", slug: "arabic-mehendi" },
          { id: 3, name: "Indo-Arabic", slug: "indo-arabic" },
          { id: 4, name: "Traditional", slug: "traditional-mehendi" },
          { id: 5, name: "Minimalist", slug: "minimalist-mehendi" },
          { id: 6, name: "Full Hand", slug: "full-hand-mehendi" },
          { id: 7, name: "Back Hand", slug: "back-hand-mehendi" },
          { id: 8, name: "Leg & Feet", slug: "leg-feet-mehendi" }
        ]).slice(0, 8)}
        keyExtractor={(item) => String(item.id)}
        horizontal
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
        renderItem={renderCategoryItem}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
      />

      {/* 5. Featured Artists Section */}
      {featuredArtists.length > 0 && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTextColor }]}>Featured Artists</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ArtistListing", { filter: "featured" })}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featuredArtists}
            keyExtractor={(item) => String(item.id)}
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
            renderItem={renderHorizontalArtistItem}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
          />
        </View>
      )}

      {/* 6. Popular Artists Section */}
      {popularArtists.length > 0 && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTextColor }]}>Trending & Popular</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ArtistListing", { filter: "popular" })}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popularArtists}
            keyExtractor={(item) => String(item.id)}
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
            renderItem={renderHorizontalArtistItem}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
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
            keyExtractor={(item) => String(item.id)}
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

      {/* 7. Quick Filters Row */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: currentTextColor }]}>All Nearby Artists</Text>
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
        contentContainerStyle={{ paddingBottom: 180 }}
      />

      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header Icon */}
            <View style={styles.modalHeaderIconContainer}>
              <Ionicons name="time-outline" size={30} color={Colors.primary} />
            </View>

            <Text style={styles.modalTitle}>Remaining Payment Pending</Text>
            <Text style={styles.modalSubtitle}>Please clear the remaining dues to complete your booking.</Text>

            {pendingPaymentBooking && (
              <View style={{ width: "100%" }}>
                {/* Artist Info Card */}
                <View style={styles.modalArtistCard}>
                  <Image
                    source={{ uri: pendingPaymentBooking.artist?.user?.profile_image || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300" }}
                    style={styles.modalArtistPhoto}
                  />
                  <View style={styles.modalArtistMeta}>
                    <Text style={styles.modalArtistName}>
                      {pendingPaymentBooking.artist?.user?.name || "Professional Specialist"}
                    </Text>
                    <Text style={styles.modalArtistCategory}>
                      {pendingPaymentBooking.service?.category || "Mehndi Specialist"}
                    </Text>

                    <View style={styles.modalArtistStats}>
                      <View style={styles.modalStatItem}>
                        <Ionicons name="star" size={13} color="#FFB800" />
                        <Text style={styles.modalStatItemText}>
                          {Number(pendingPaymentBooking.artist?.avg_rating || 4.8).toFixed(1)}
                        </Text>
                      </View>
                      <Text style={styles.modalDivider}>•</Text>
                      <Text style={styles.modalStatItemText}>
                        {pendingPaymentBooking.artist?.experience_years || 3} Yrs Exp
                      </Text>
                      <Text style={styles.modalDivider}>•</Text>
                      <Text style={styles.modalStatItemText} numberOfLines={1}>
                        {pendingPaymentBooking.artist?.city || "Jaipur"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Booking Info Card */}
                <View style={styles.modalBookingDetailsCard}>
                  <View style={styles.modalDetailRow}>
                    <Ionicons name="receipt-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.modalDetailLabel}>Booking ID:</Text>
                    <Text style={styles.modalDetailValue} numberOfLines={1}>
                      #{pendingPaymentBooking.booking_code || "BK-000000"}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.modalDetailLabel}>Date & Time:</Text>
                    <Text style={styles.modalDetailValue}>
                      {pendingPaymentBooking.slot?.start_time || pendingPaymentBooking.slot?.date
                        ? new Date(pendingPaymentBooking.slot.start_time || pendingPaymentBooking.slot.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : (pendingPaymentBooking.reschedule_date ? new Date(pendingPaymentBooking.reschedule_date).toLocaleDateString() : "TBD")} at {pendingPaymentBooking.slot?.time_label || pendingPaymentBooking.reschedule_time || "TBD"}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Ionicons name="flower-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.modalDetailLabel}>Service:</Text>
                    <Text style={styles.modalDetailValue} numberOfLines={1}>
                      {pendingPaymentBooking.service?.specialization_name || "Mehndi Service"}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Ionicons name="ribbon-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.modalDetailLabel}>Package:</Text>
                    <Text style={styles.modalDetailValue}>Standard Premium Package</Text>
                  </View>

                  <View style={[styles.modalDetailRow, { alignItems: "flex-start" }]}>
                    <Ionicons name="pin-outline" size={14} color={Colors.textSecondary} style={{ marginTop: 2 }} />
                    <Text style={styles.modalDetailLabel}>Address:</Text>
                    <Text style={[styles.modalDetailValue, { flex: 1 }]} numberOfLines={2}>
                      {pendingPaymentBooking.address || "Client Address Details"}
                    </Text>
                  </View>
                </View>

                {/* Billing Summary Box */}
                <View style={styles.modalBillingSummary}>
                  <View style={styles.modalBillRow}>
                    <Text style={styles.modalBillLabel}>Total Amount</Text>
                    <Text style={styles.modalBillValue}>₹{pendingPaymentBooking.final_amount}</Text>
                  </View>
                  <View style={styles.modalBillRow}>
                    <Text style={styles.modalBillLabel}>Advance Paid (10%)</Text>
                    <Text style={[styles.modalBillValue, { color: "#2E7D32" }]}>-₹{pendingPaymentBooking.advance_paid}</Text>
                  </View>
                  <View style={styles.modalDividerLine} />
                  <View style={styles.modalBillRow}>
                    <Text style={[styles.modalBillLabel, { fontWeight: "700", color: Colors.text }]}>Remaining Balance</Text>
                    <Text style={[styles.modalBillValue, { fontWeight: "800", color: Colors.primary, fontSize: 15 }]}>
                      ₹{pendingPaymentBooking.remaining_amount}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalLaterBtn}
                onPress={() => setPaymentModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalLaterText}>Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPayBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setPaymentModalVisible(false);
                  navigation.navigate("BookingSettlement", {
                    bookingId: pendingPaymentBooking.id
                  });
                }}
              >
                <Text style={styles.modalPayText}>Pay Remaining Amount</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
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
});
