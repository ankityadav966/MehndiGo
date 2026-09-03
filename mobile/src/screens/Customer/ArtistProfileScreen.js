import React, { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Share,
  Dimensions,
  FlatList,
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Alert from "../../utils/Alert";
import Colors from "../../constants/Colors";
import { getNormalizedUrl } from "../../services/api";
import { formatDate } from "../../utils/date";
import {
  fetchArtistProfile,
  fetchArtistServices,
  fetchArtistPortfolio,
  fetchArtistReviews,
  fetchArtistAvailability,
  fetchArtistFaqs,
  addArtistFavorite,
  removeArtistFavorite,
  getFavorites,
  savePortfolioItem,
  unsavePortfolioItem
} from "../../services/customer";
import { getBookingHistory } from "../../services/booking";
import { createArtistDeepLink, createDesignDeepLink } from "../../services/deepLink";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

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

export default function ArtistProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const artistId = route.params?.artistId || route.params?.id || route.params?.artist_id;
  const initialArtist = route.params?.artist || null;

  // Data states
  const [profile, setProfile] = useState(initialArtist);
  const [services, setServices] = useState(initialArtist?.services || []);
  const [portfolio, setPortfolio] = useState(initialArtist?.portfolio || []);
  const [reviewsData, setReviewsData] = useState({
    reviews: initialArtist?.reviews || [],
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [availability, setAvailability] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [isFav, setIsFav] = useState(false);
  const [selectedPortfolioFilter, setSelectedPortfolioFilter] = useState("ALL");
  const [expandedBio, setExpandedBio] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [activeCoverIndex, setActiveCoverIndex] = useState(0);
  const [hasBookingWithArtist, setHasBookingWithArtist] = useState(false);
  const [activeBookingForChat, setActiveBookingForChat] = useState(null);

  // Layout states
  const [loading, setLoading] = useState(!initialArtist);
  const [error, setError] = useState(null);
  const isFetchingRef = useRef(false);

  const loadProfileDetails = useCallback(async () => {
    if (!artistId) {
      setError("Artist ID is required");
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setError(null);

    // 1. Instant Cache Layer
    const cacheKey = `@cached_artist_${artistId}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        if (cachedData.profile) setProfile(cachedData.profile);
        if (cachedData.services) setServices(cachedData.services);
        if (cachedData.portfolio) setPortfolio(cachedData.portfolio);
        if (cachedData.reviewsData) setReviewsData(cachedData.reviewsData);
        if (cachedData.availability) setAvailability(cachedData.availability);
        setLoading(false);
      }
    } catch (e) {
      if (__DEV__) console.log("Artist cache read error:", e.message);
    }

    try {
      // 2. Fetch primary profile, availability, favorites, and faqs in parallel
      const [profResult, availResult, favsResult, faqsResult] = await Promise.allSettled([
        fetchArtistProfile(artistId),
        fetchArtistAvailability(artistId),
        getFavorites(),
        fetchArtistFaqs(artistId).catch(() => [])
      ]);

      const prof = profResult.status === "fulfilled" ? profResult.value : null;
      if (!prof) {
        setError("Artist profile not found");
        return;
      }

      setProfile(prof);

      // Extract services, portfolio, reviews
      let servs = prof.services && prof.services.length > 0 ? prof.services : null;
      let port = prof.portfolio && prof.portfolio.length > 0 ? prof.portfolio : null;
      let revs = prof.reviews && prof.reviews.length > 0 ? prof.reviews : null;

      if (!servs || !port || !revs) {
        const [extraServs, extraPort, extraRevs] = await Promise.all([
          !servs ? fetchArtistServices(artistId).catch(() => []) : Promise.resolve(servs),
          !port ? fetchArtistPortfolio(artistId).catch(() => []) : Promise.resolve(port),
          !revs ? fetchArtistReviews(artistId).catch(() => []) : Promise.resolve(revs)
        ]);
        servs = extraServs || [];
        port = extraPort || [];
        revs = extraRevs || [];
      }

      const avail = availResult.status === "fulfilled"
        ? (prof.availability || availResult.value)
        : (prof.availability || []);
      const favs = favsResult.status === "fulfilled" ? favsResult.value : [];
      const fetchedFaqs = faqsResult.status === "fulfilled" ? faqsResult.value : [];

      setServices(servs || []);
      setPortfolio(Array.isArray(port) ? port : (port?.portfolios || port?.data || []));
      setFaqs(Array.isArray(fetchedFaqs) ? fetchedFaqs : []);

      const reviewsList = Array.isArray(revs) ? revs : (revs?.reviews || []);
      const reviewsDist = (revs && typeof revs === "object" && revs.distribution) ? revs.distribution : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      if (!revs?.distribution && reviewsList.length > 0) {
        reviewsList.forEach((r) => {
          const rVal = Math.min(5, Math.max(1, Math.round(Number(r.rating || 5))));
          reviewsDist[rVal] = (reviewsDist[rVal] || 0) + 1;
        });
      }

      setReviewsData({
        reviews: reviewsList,
        distribution: reviewsDist
      });

      const slots = Array.isArray(avail) ? avail : (avail?.slots || []);
      setAvailability(slots);

      // Check favorite
      const targetId = prof.id || prof.user_id;
      const isArtistFav = (Array.isArray(favs) ? favs : []).some((fav) =>
        String(fav.id) === String(targetId) ||
        String(fav.user_id) === String(targetId) ||
        String(fav.artist_id) === String(targetId)
      );
      setIsFav(isArtistFav);

      // Check if current user has an active or past booking with this artist
      try {
        const historyRes = await getBookingHistory().catch(() => []);
        const bookingList = Array.isArray(historyRes) ? historyRes : (historyRes?.data || historyRes?.bookings || []);
        const artistTargetId = Number(prof.user_id || prof.id || artistId);
        const matched = bookingList.find(b =>
          Number(b.artist_id) === artistTargetId ||
          Number(b.artist_profile_id) === Number(prof.id || artistId) ||
          Number(b.artistId) === artistTargetId
        );
        if (matched) {
          setHasBookingWithArtist(true);
          setActiveBookingForChat(matched);
        } else {
          setHasBookingWithArtist(false);
          setActiveBookingForChat(null);
        }
      } catch (err) {
        setHasBookingWithArtist(false);
        setActiveBookingForChat(null);
      }

      // Cache for next time
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            profile: prof,
            services: servs || [],
            portfolio: Array.isArray(port) ? port : [],
            reviewsData: { reviews: reviewsList, distribution: reviewsDist },
            availability: slots
          })
        );
      } catch (e) {
        if (__DEV__) console.log("Artist cache write error:", e.message);
      }
    } catch (e) {
      if (__DEV__) console.log("Error loading artist details:", e.message);
      setError("Failed to load artist details. Please try again.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [artistId]);

  useEffect(() => {
    loadProfileDetails();
  }, [loadProfileDetails]);

  const handleToggleFavorite = async () => {
    try {
      const targetId = profile?.id || profile?.user_id || artistId;
      if (isFav) {
        await removeArtistFavorite(targetId);
        setIsFav(false);
      } else {
        await addArtistFavorite(targetId);
        setIsFav(true);
      }
    } catch (e) {
      if (__DEV__) console.log("Favorite error:", e.message);
    }
  };

  const handleShare = async () => {
    try {
      const url = createArtistDeepLink(artistId);
      const name = profile?.name || profile?.full_name || profile?.user?.name || profile?.user?.full_name || "Mehndi Artist";
      const rating = Number(profile?.avg_rating || profile?.rating || 0).toFixed(1);
      const exp = profile?.experience_years;

      let stats = [];
      if (startingPrice) stats.push(`Starting at ₹${startingPrice}`);
      if (exp) stats.push(`${exp} years experience`);
      if (rating > 0) stats.push(`⭐ ${rating} rating`);

      const statsString = stats.length > 0 ? ` ${stats.join(", ")}.` : "";

      await Share.share({
        title: `Book ${name} on MehndiGo`,
        message: `Check out ${name}'s verified mehndi portfolio & bridal packages on MehndiGo!${statsString}\n\nView Profile: ${url}`,
        url
      });
    } catch (e) {
      if (__DEV__) console.log("Share error:", e.message);
    }
  };

  const handleOpenChat = () => {
    if (!hasBookingWithArtist || !activeBookingForChat) {
      Alert.alert("Booking Required", "You can only chat with an artist after creating a booking.");
      return;
    }
    const chatArtistName = profile?.name || profile?.full_name || profile?.user?.name || profile?.user?.full_name || "Artist";
    navigation.navigate("ChatRoom", {
      bookingId: activeBookingForChat.id || activeBookingForChat.booking_id,
      artistId: profile?.user_id || profile?.id || artistId,
      artistName: chatArtistName,
      artistAvatar: profile?.profile_image || profile?.avatar || profile?.user?.profile_image || profile?.user?.avatar
    });
  };

  const handleOpenServiceCatalog = (service) => {
    navigation.navigate("ArtistServiceCatalog", {
      artistId: profile?.id || artistId,
      serviceId: service.id,
      service,
      artist: {
        id: profile?.id || artistId,
        user_id: profile?.user_id,
        name: profile?.user?.name || "Artist",
        profile_image: profile?.user?.profile_image,
        avg_rating: profile?.avg_rating,
        total_reviews: profile?.total_reviews,
        experience_years: profile?.experience_years,
        is_verified: profile?.is_verified,
        is_premium: profile?.is_premium,
        city: profile?.city
      }
    });
  };

  const handleOpenDesignDetails = (design, index) => {
    navigation.navigate("DesignDetails", {
      artistId: profile?.id || artistId,
      serviceId: design.service_id || (services.length > 0 ? services[0].id : (profile?.services?.[0]?.id || 1)),
      initialDesignIndex: index,
      designs: filteredPortfolio,
      artist: {
        id: profile?.id || artistId,
        user_id: profile?.user_id,
        name: profile?.user?.name || "Artist",
        profile_image: profile?.user?.profile_image
      },
      service: services.length > 0 ? services[0] : (profile?.services?.[0] || {})
    });
  };

  const handleBookDesign = (design) => {
    navigation.navigate("SelectDate", {
      artistId: profile?.id || artistId,
      serviceId: design.service_id || (services.length > 0 ? services[0].id : (profile?.services?.[0]?.id || 1)),
      selectedArt: {
        id: design.id,
        title: design.title || "Mehndi Design",
        image_url: design.image_url || design.url,
        art_tier: design.art_tier || "STANDARD",
        duration_minutes: design.duration_minutes || 60,
        price: design.price || profile?.starting_price || 0
      }
    });
  };

  const handleSelectPackage = (pkg, service) => {
    navigation.navigate("SelectDate", {
      artistId: profile?.id || artistId,
      serviceId: service?.id || pkg.service_id || (services.length > 0 ? services[0].id : (profile?.services?.[0]?.id || 1)),
      packageId: pkg.id,
      selectedArt: {
        id: null,
        title: `${pkg.package_name} (${service?.specialization_name || "Bridal Package"})`,
        image_url: service?.service_image || profile?.user?.profile_image,
        art_tier: "PREMIUM",
        duration_minutes: pkg.duration || 120,
        price: pkg.package_price
      }
    });
  };

  const handleRequestCustomDesign = () => {
    navigation.navigate("CustomDesignRequest", {
      artistId: profile?.id || artistId,
      artist: {
        id: profile?.id || artistId,
        user_id: profile?.user_id,
        name: profile?.user?.name || "Artist",
        profile_image: profile?.user?.profile_image,
        avg_rating: profile?.avg_rating,
        city: profile?.city
      }
    });
  };

  // Filtered portfolio logic
  const portfolioFilterOptions = [
    { label: "All Designs", value: "ALL" },
    { label: "👑 Bridal", value: "BRIDAL" },
    { label: "💎 Premium", value: "PREMIUM" },
    { label: "✨ Simple", value: "SIMPLE" },
    { label: "🌸 Medium", value: "MEDIUM" },
    { label: "👑 Masterpiece", value: "MASTERPIECE" }
  ];

  const filteredPortfolio = portfolio.filter((item) => {
    if (selectedPortfolioFilter === "ALL") return true;
    if (selectedPortfolioFilter === "BRIDAL") {
      return (item.art_tier === "BRIDAL_EXCLUSIVE" || (item.category || "").toLowerCase().includes("bridal") || (item.occasion || "").toLowerCase().includes("wedding"));
    }
    if (selectedPortfolioFilter === "PREMIUM") {
      return (item.art_tier === "PREMIUM" || item.art_tier === "BRIDAL_EXCLUSIVE");
    }
    if (selectedPortfolioFilter === "SIMPLE") {
      return item.complexity_level === "SIMPLE";
    }
    if (selectedPortfolioFilter === "MEDIUM") {
      return item.complexity_level === "MEDIUM";
    }
    if (selectedPortfolioFilter === "MASTERPIECE") {
      return item.complexity_level === "MASTERPIECE" || item.complexity_level === "INTRICATE";
    }
    return true;
  });

  // Extract all packages across services
  const allPackages = [];
  services.forEach((s) => {
    if (Array.isArray(s.packages)) {
      s.packages.forEach((p) => {
        allPackages.push({ ...p, service: s });
      });
    }
  });

  const artistName = profile?.name || profile?.full_name || profile?.user?.name || profile?.user?.full_name || "Mehndi Artist";

  const rawBanner = profile?.banner_image || profile?.cover_image || profile?.bannerImage || profile?.coverImage || profile?.banner || profile?.user?.banner_image || profile?.user?.cover_image;
  const rawAvatar = profile?.profile_image || profile?.selfie_image || profile?.avatar || profile?.user?.profile_image || profile?.user?.avatar;

  const resolvedBanner = resolveImage(rawBanner);
  const resolvedAvatar = resolveImage(rawAvatar);
  const defaultPlaceholder = "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=800";

  // Banner Fallback Hierarchy:
  // 1. Real Artist Banner
  // 2. Fallback: Same Artist's Profile Photo
  // 3. Fallback: Safe Placeholder
  const primaryBannerUri = resolvedBanner || resolvedAvatar || defaultPlaceholder;

  const coverImages = [
    primaryBannerUri,
    ...(portfolio.slice(0, 3).map(p => resolveImage(p.image_url || p.url)).filter(Boolean))
  ].filter((uri, idx, self) => Boolean(uri) && self.indexOf(uri) === idx);

  if (coverImages.length === 0) {
    coverImages.push(defaultPlaceholder);
  }

  const artistAvatar = resolvedAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=F3E8FF&color=7C3AED`;

  const isAvailable = profile?.is_available !== false;
  const avgRating = (profile?.avg_rating || profile?.rating) ? Number(profile?.avg_rating || profile?.rating).toFixed(1) : (reviewsData.reviews.length > 0 ? (reviewsData.reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviewsData.reviews.length).toFixed(1) : "0.0");
  const totalReviews = profile?.total_reviews ?? reviewsData.reviews.length;
  const experienceYears = Number(profile?.experience_years || 0);
  const minServicePrice = services.length > 0
    ? Math.min(...services.map(s => Number(s.price || s.minimum_price || s.starting_price || 0)).filter(p => p > 0))
    : 0;
  const startingPrice = Number(profile?.starting_price || minServicePrice || 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {loading && !profile ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Artist Profile...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProfileDetails}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        >
          {/* Cover Carousel & Floating Actions */}
          <View style={styles.coverContainer}>
            <FlatList
              data={coverImages}
              keyExtractor={(_, i) => `cover-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveCoverIndex(idx);
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.coverImage} resizeMode="cover" />
              )}
            />
            <View style={styles.coverGradientOverlay} />

            {/* Carousel Dots */}
            {coverImages.length > 1 && (
              <View style={styles.coverDotsRow}>
                {coverImages.map((_, i) => (
                  <View
                    key={`dot-${i}`}
                    style={[styles.coverDot, i === activeCoverIndex && styles.coverDotActive]}
                  />
                ))}
              </View>
            )}

            {/* Header Floating Action Buttons */}
            <View style={[styles.floatingHeader, { top: Math.max(insets.top, 16) }]}>
              <TouchableOpacity style={styles.glassBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={styles.glassBtn} onPress={handleToggleFavorite}>
                  <Ionicons
                    name={isFav ? "heart" : "heart-outline"}
                    size={22}
                    color={isFav ? "#E11D48" : "#FFFFFF"}
                  />
                </TouchableOpacity>

              </View>
            </View>
          </View>

          {/* Artist Identity & Trust Header Section */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarRow}>
              {/* Avatar with Status Dot */}
              <View style={styles.avatarWrapper}>
                <Image source={{ uri: artistAvatar }} style={styles.avatarImage} />
                <View style={[
                  styles.statusDot,
                  { backgroundColor: isAvailable ? "#10B981" : "#94A3B8" }
                ]} />
              </View>

              {/* Action Buttons: Chat (Only if valid booking exists) & Availability */}
              <View style={styles.headerRightActions}>
                {hasBookingWithArtist && (
                  <TouchableOpacity style={styles.chatActionBtn} onPress={handleOpenChat}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                    <Text style={styles.chatActionBtnText}>Message</Text>
                  </TouchableOpacity>
                )}
                <View style={[
                  styles.availabilityPill,
                  { backgroundColor: isAvailable ? "#ECFDF5" : "#F1F5F9" }
                ]}>
                  <Text style={[
                    styles.availabilityPillText,
                    { color: isAvailable ? "#059669" : "#64748B" }
                  ]}>
                    {isAvailable ? "🟢 Available" : "⚪ Offline"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Name & Badges */}
            <View style={styles.nameRow}>
              <Text style={styles.artistNameText}>{artistName}</Text>
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              )}
              {profile?.is_premium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>💎 Luxury Artist</Text>
                </View>
              )}
            </View>

            {/* Location & Details */}
            <Text style={styles.locationText}>
              📍 {profile?.city || "Jaipur, Rajasthan"} • {profile?.home_service ? "Doorstep Service Available" : "Studio Appointments"}
            </Text>
            {profile?.home_service && (
              <Text style={[styles.locationText, { fontSize: 13, marginTop: 4, color: Colors.primary }]}>
                🚗 Services available within {profile?.service_radius || 25} KM radius
              </Text>
            )}
            <Text style={styles.languagesText}>
              🗣️ Speaks: {profile?.languages || "Hindi, English, Rajasthani"} • ⚡ Responds in {profile?.response_time || "~15 mins"}
            </Text>

            {/* Statistics Bar */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>⭐ {avgRating}</Text>
                <Text style={styles.statLabel}>{totalReviews} Reviews</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{experienceYears}+ Yrs</Text>
                <Text style={styles.statLabel}>Experience</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{profile?.total_bookings || "0"}</Text>
                <Text style={styles.statLabel}>Bookings</Text>
              </View>
            </View>

            {/* About Bio with Read More */}
            <View style={styles.bioContainer}>
              <Text
                style={styles.bioText}
                numberOfLines={expandedBio ? undefined : 3}
              >
                {profile?.bio || "No biography provided by the artist."}
              </Text>
              <TouchableOpacity onPress={() => setExpandedBio(!expandedBio)}>
                <Text style={styles.readMoreText}>{expandedBio ? "Read Less" : "Read More"}</Text>
              </TouchableOpacity>
            </View>

            {/* Trust Factors Grid */}
            <View style={styles.trustGrid}>
              <View style={styles.trustItem}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.trustText}>KYC Verified Artist</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="leaf" size={16} color="#059669" />
                <Text style={styles.trustText}>Chemical-Free Dye</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="timer" size={16} color="#059669" />
                <Text style={styles.trustText}>On-Time Arrival</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="lock-closed" size={16} color="#059669" />
                <Text style={styles.trustText}>Escrow Safe Pay</Text>
              </View>
            </View>
          </View>

          {/* Section 1: Services Storefront */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Services Storefront ({services.length})</Text>
              <Text style={styles.sectionSubtitle}>Tap a service to explore full design catalog & packages</Text>
            </View>

            {services.map((svc) => {
              let images = [];
              let categories = [];
              try {
                images = typeof svc.service_image === "string" && svc.service_image.startsWith("[") ? JSON.parse(svc.service_image) : (svc.service_image ? [svc.service_image] : []);
              } catch (e) { }
              try {
                categories = typeof svc.category === "string" && svc.category.startsWith("[") ? JSON.parse(svc.category) : (svc.category ? [svc.category] : []);
              } catch (e) { }

              const coverImage = images.length > 0 ? images[0] : null;
              const displayCategories = categories.slice(0, 3);
              const extraCategories = categories.length > 3 ? categories.length - 3 : 0;
              const hasPremiumPackage = Array.isArray(svc.packages) && svc.packages.some(p => p.art_tier === 'PREMIUM');
              const isPremium = profile?.is_premium || hasPremiumPackage;

              return (
                <TouchableOpacity
                  key={`svc-${svc.id}`}
                  style={[styles.serviceItemCard, { flexDirection: 'row', alignItems: 'center', padding: 12 }]}
                  activeOpacity={0.88}
                  onPress={() => handleOpenServiceCatalog(svc)}
                >
                  {/* Image (Left) */}
                  <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                    {coverImage ? (
                      <Image source={{ uri: resolveImage(coverImage) }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                    ) : (
                      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="image-outline" size={24} color="#CBD5E1" />
                      </View>
                    )}
                  </View>

                  {/* Title & Subtitle (Center) */}
                  <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
                    <Text style={[styles.svcTitle, { fontSize: 15, marginBottom: 4 }]} numberOfLines={1}>
                      {svc.specialization_name || (categories.length > 0 ? categories[0] : svc.category)}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B' }} numberOfLines={1}>
                      {svc.description || (categories.length > 0 ? categories.join(', ') : "Mehndi Service")}
                    </Text>
                  </View>

                  {/* Price & Action (Right) */}
                  <View style={{ alignItems: 'flex-end', marginLeft: 10, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                      {svc.minimum_price ? `₹${svc.minimum_price}` : "On Req"}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: '600' }}>View</Text>
                      <Ionicons name="chevron-forward" size={12} color={Colors.primary} style={{ marginLeft: 2 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section 2: Custom Design Request Banner */}
          {(profile?.custom_design_enabled || profile?.reference_design_enabled) && (
            <TouchableOpacity
              style={styles.customDesignBanner}
              activeOpacity={0.9}
              onPress={handleRequestCustomDesign}
            >
              <View style={styles.customBannerIconCircle}>
                <Ionicons name="sparkles" size={26} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.customBannerTitle}>Have a Custom Design or Reference?</Text>
                <Text style={styles.customBannerDesc}>
                  Upload your Pinterest/Instagram photos for bespoke bride/groom portraits & customized quotes.
                </Text>
              </View>
              <Ionicons name="chevron-forward-circle" size={28} color="#D97706" />
            </TouchableOpacity>
          )}

          {/* Section 3: Curated Packages (if available) */}
          {allPackages.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Curated Mehndi Packages ({allPackages.length})</Text>
                <Text style={styles.sectionSubtitle}>Complete bundles including aftercare & touch-ups</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                {allPackages.map((pkg, pIdx) => (
                  <View key={`pkg-${pkg.id || pIdx}`} style={styles.packageCard}>
                    <View style={styles.pkgHeader}>
                      <Text style={styles.pkgName}>{pkg.package_name}</Text>
                      <Text style={styles.pkgPrice}>₹{pkg.package_price}</Text>
                    </View>
                    {pkg.included_designs ? (
                      <Text style={styles.pkgInclusions} numberOfLines={3}>
                        {pkg.included_designs}
                      </Text>
                    ) : null}
                    <View style={styles.pkgMetaRow}>
                      {pkg.duration ? <Text style={styles.pkgMeta}>⏱️ {pkg.duration} mins</Text> : null}
                      {pkg.number_of_hands > 0 && <Text style={styles.pkgMeta}>✋ {pkg.number_of_hands} Hands</Text>}
                      {pkg.aftercare_included && <Text style={styles.pkgMeta}>🌿 Aftercare Kit</Text>}
                    </View>
                    <TouchableOpacity
                      style={styles.selectPkgBtn}
                      onPress={() => handleSelectPackage(pkg, pkg.service)}
                    >
                      <Text style={styles.selectPkgBtnText}>Select Package</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Section 4: Design Portfolio Gallery */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Design Portfolio ({filteredPortfolio.length})</Text>
              <Text style={styles.sectionSubtitle}>Tap any design for full-screen view & instant booking</Text>
            </View>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
              {portfolioFilterOptions.map((opt) => {
                const isSelected = selectedPortfolioFilter === opt.value;
                return (
                  <TouchableOpacity
                    key={`pf-opt-${opt.value}`}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setSelectedPortfolioFilter(opt.value)}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Design Grid */}
            <View style={styles.portfolioGrid}>
              {filteredPortfolio.map((item, index) => {
                const displayPrice = item.price || startingPrice;
                return (
                  <View key={`port-${item.id || index}`} style={styles.portfolioCard}>
                    <TouchableOpacity
                      activeOpacity={0.95}
                      onPress={() => handleOpenDesignDetails(item, index)}
                      style={styles.portfolioImageBox}
                    >
                      <Image source={{ uri: resolveImage(item.image_url || item.url) }} style={styles.portfolioImage} />
                      <View style={[
                        styles.tierBadge,
                        item.art_tier === "BRIDAL_EXCLUSIVE" ? styles.bridalBadge :
                          item.art_tier === "PREMIUM" ? styles.premiumBadge : styles.standardBadge
                      ]}>
                        <Text style={styles.tierBadgeText}>
                          {item.art_tier === "BRIDAL_EXCLUSIVE" ? "👑 Bridal" :
                            item.art_tier === "PREMIUM" ? "💎 Premium" : "✨ Standard"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.portfolioCardBody}>
                      <Text style={styles.portTitle} numberOfLines={1}>
                        {item.title || `${item.category || "Mehndi"} Art #${item.id}`}
                      </Text>
                      <Text style={styles.portMeta} numberOfLines={1}>
                        {item.complexity_level || "Medium"} • ⏱️ {item.duration_minutes || 60}m
                      </Text>
                      <View style={styles.portPriceRow}>
                        <Text style={styles.portPrice}>₹{displayPrice}</Text>
                        <TouchableOpacity
                          style={styles.bookPortBtn}
                          onPress={() => handleBookDesign(item)}
                        >
                          <Text style={styles.bookPortBtnText}>Book</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Section 5: Live Availability Schedule Preview */}
          {/* <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Slot Availability</Text>
              <Text style={styles.sectionSubtitle}>Select your date and preferred time slot during checkout</Text>
            </View>

            <View style={styles.availabilityCard}>
              <View style={styles.availHeader}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.availHeaderText}>
                  {availability.length > 0
                    ? `${availability.filter(s => !s.is_booked).length} Slots Open This Week`
                    : "Flexible Appointment Slots Available"}
                </Text>
              </View>
              <Text style={styles.availSubtext}>
                We accept bookings up to 90 days in advance. Instant confirmation upon payment.
              </Text>
            </View>
          </View> */}

          {/* Section 6: Client Reviews & Ratings Breakdown */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Client Reviews & Ratings ({reviewsData.reviews.length})</Text>
            </View>

            {/* Rating Summary Card */}
            <View style={styles.ratingSummaryCard}>
              <View style={styles.ratingBigScoreCol}>
                <Text style={styles.bigScore}>{avgRating}</Text>
                <View style={{ flexDirection: "row", marginTop: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={`star-${s}`}
                      name="star"
                      size={15}
                      color={s <= Math.round(Number(avgRating)) ? "#FBBF24" : "#E2E8F0"}
                    />
                  ))}
                </View>
                <Text style={styles.totalReviewsCount}>{totalReviews} verified ratings</Text>
              </View>

              <View style={styles.ratingBarsCol}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviewsData.distribution[star] || 0;
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <View key={`dist-${star}`} style={styles.ratingBarRow}>
                      <Text style={styles.starNum}>{star}★</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${Math.max(4, pct)}%` }]} />
                      </View>
                      <Text style={styles.starCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Reviews List */}
            {reviewsData.reviews.slice(0, 4).map((rev, rIdx) => (
              <View key={`rev-${rev.id || rIdx}`} style={styles.reviewItemCard}>
                <View style={styles.reviewUserRow}>
                  <Image
                    source={{
                      uri: resolveImage(rev.user?.profile_image) ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.user?.name || "Client")}&background=F3E8FF&color=7C3AED`
                    }}
                    style={styles.reviewUserAvatar}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.reviewUserName}>{rev.user?.name || "Verified Customer"}</Text>
                    <Text style={styles.reviewDate}>{formatDate(rev.createdAt || new Date())}</Text>
                  </View>
                  <View style={styles.reviewRatingPill}>
                    <Text style={styles.reviewRatingText}>⭐ {Number(rev.rating || 5).toFixed(1)}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{rev.comment || "Loved the intricate design and dark rich stain!"}</Text>
              </View>
            ))}
          </View>

          {/* Section 7: FAQs Accordion */}
          {faqs.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              </View>

              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <TouchableOpacity
                    key={`faq-${faq.id || idx}`}
                    style={styles.faqCard}
                    activeOpacity={0.88}
                    onPress={() => setOpenFaqIndex(isOpen ? null : idx)}
                  >
                    <View style={styles.faqQuestionRow}>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#64748B"
                      />
                    </View>
                    {isOpen && (
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Bottom Booking Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {hasBookingWithArtist && (
          <TouchableOpacity style={styles.quickChatBtn} onPress={handleOpenChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}

        <View style={styles.bottomPriceCol}>
          {startingPrice ? (
            <>
              <Text style={styles.bottomPriceLabel}>Starting from</Text>
              <Text style={styles.bottomPriceVal}>₹{startingPrice}</Text>
            </>
          ) : (
            <Text style={[styles.bottomPriceVal, { fontSize: 16 }]}>Price on Request</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.bottomBookBtn}
          onPress={() => {
            if (services.length > 0) {
              navigation.navigate("SelectDate", {
                artistId: profile?.id || artistId,
                serviceId: services[0].id
              });
            } else {
              navigation.navigate("SelectService", {
                artistId: profile?.id || artistId
              });
            }
          }}
        >
          <Text style={styles.bottomBookBtnText}>Book Appointment</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500"
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.error,
    textAlign: "center"
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  coverContainer: {
    width: SCREEN_WIDTH,
    height: 250,
    position: "relative",
    backgroundColor: "#0F172A"
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: 250
  },
  coverGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  coverDotsRow: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6
  },
  coverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)"
  },
  coverDotActive: {
    width: 18,
    backgroundColor: "#FFFFFF"
  },
  floatingHeader: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10
  },
  glassBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center"
  },
  profileHeaderCard: {
    marginTop: -28,
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.white,
    backgroundColor: "#F3E8FF",
    position: "relative",
    marginTop: -40
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 37
  },
  statusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.white
  },
  headerRightActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  chatActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4
  },
  chatActionBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700"
  },
  availabilityPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8
  },
  availabilityPillText: {
    fontSize: 11,
    fontWeight: "700"
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12
  },
  artistNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A"
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2
  },
  verifiedBadgeText: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "700"
  },
  premiumBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  premiumBadgeText: {
    fontSize: 10,
    color: "#92400E",
    fontWeight: "750"
  },
  locationText: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4
  },
  languagesText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  statItem: {
    flex: 1,
    alignItems: "center"
  },
  statVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A"
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#E2E8F0"
  },
  bioContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  bioText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18
  },
  readMoreText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
    marginTop: 4
  },
  trustGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  trustText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600"
  },
  sectionBlock: {
    marginTop: 20
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A"
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2
  },
  serviceItemCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4
  },
  svcCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  svcTitle: {
    fontSize: 14,
    fontWeight: "750",
    color: "#0F172A"
  },
  svcDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 16
  },
  svcPriceBox: {
    alignItems: "flex-end",
    marginLeft: 10
  },
  svcPriceLabel: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "600"
  },
  svcPriceVal: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
    marginTop: 1
  },
  svcMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  svcMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  svcMetaPillText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600"
  },
  browseCatalogCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  browseCatalogCtaText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary
  },
  customDesignBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  customBannerIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center"
  },
  customBannerTitle: {
    fontSize: 13,
    fontWeight: "750",
    color: "#92400E"
  },
  customBannerDesc: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
    lineHeight: 15
  },
  packageCard: {
    width: 260,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  pkgHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pkgName: {
    fontSize: 13,
    fontWeight: "750",
    color: "#0F172A",
    flex: 1
  },
  pkgPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primary,
    marginLeft: 8
  },
  pkgInclusions: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 15
  },
  pkgMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  pkgMeta: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569"
  },
  selectPkgBtn: {
    marginTop: 10,
    backgroundColor: "#7C3AED",
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center"
  },
  selectPkgBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.white
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  filterChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600"
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: "700"
  },
  portfolioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: "space-between"
  },
  portfolioCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  portfolioImageBox: {
    width: "100%",
    height: CARD_WIDTH * 1.25,
    position: "relative",
    backgroundColor: "#F1F5F9"
  },
  portfolioImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  tierBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6
  },
  standardBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.75)"
  },
  premiumBadge: {
    backgroundColor: "#D97706"
  },
  bridalBadge: {
    backgroundColor: "#BE123C"
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.white
  },
  portfolioCardBody: {
    padding: 10
  },
  portTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A"
  },
  portMeta: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2
  },
  portPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  portPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary
  },
  bookPortBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  bookPortBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.white
  },
  availabilityCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  availHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  availHeaderText: {
    fontSize: 13,
    fontWeight: "750",
    color: "#0F172A"
  },
  availSubtext: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 16
  },
  ratingSummaryCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center"
  },
  ratingBigScoreCol: {
    alignItems: "center",
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9"
  },
  bigScore: {
    fontSize: 32,
    fontWeight: "850",
    color: "#0F172A"
  },
  totalReviewsCount: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4
  },
  ratingBarsCol: {
    flex: 1,
    paddingLeft: 16,
    gap: 4
  },
  ratingBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  starNum: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    width: 18
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F5F9",
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    backgroundColor: "#FBBF24",
    borderRadius: 3
  },
  starCount: {
    fontSize: 10,
    color: "#94A3B8",
    width: 16,
    textAlign: "right"
  },
  reviewItemCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  reviewUserRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  reviewUserAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3E8FF"
  },
  reviewUserName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A"
  },
  reviewDate: {
    fontSize: 10,
    color: "#94A3B8"
  },
  reviewRatingPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  reviewRatingText: {
    fontSize: 10,
    fontWeight: "750",
    color: "#92400E"
  },
  reviewComment: {
    fontSize: 12,
    color: "#475569",
    marginTop: 8,
    lineHeight: 16
  },
  faqCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  faqQuestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    paddingRight: 10
  },
  faqAnswer: {
    fontSize: 12,
    color: "#475569",
    marginTop: 10,
    lineHeight: 17
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  quickChatBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center"
  },
  bottomPriceCol: {
    flex: 1
  },
  bottomPriceLabel: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "600"
  },
  bottomPriceVal: {
    fontSize: 18,
    fontWeight: "850",
    color: Colors.primary,
    marginTop: 1
  },
  bottomBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2
  },
  bottomBookBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "750"
  }
});
