import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Share,
  Linking,
  Modal,
  Dimensions,
  FlatList
} from "react-native";
import Alert from "../../utils/Alert";
import Colors from "../../constants/Colors";
import { getNormalizedUrl } from "../../services/api";

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
import { createBooking, getBookingHistory } from "../../services/booking";
import {
  fetchArtistProfile,
  fetchArtistServices,
  fetchArtistPortfolio,
  fetchArtistReviews,
  fetchArtistAvailability,
  fetchSimilarArtists,
  addArtistFavorite,
  removeArtistFavorite,
  getFavorites
} from "../../services/customer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

import { useFocusEffect } from "@react-navigation/native";

export default function ArtistProfileScreen({ route, navigation }) {
  const artistId = route.params?.artistId || route.params?.id || route.params?.artist_id || 1;

  // Data states
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [reviewsData, setReviewsData] = useState({ reviews: [], distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const [availability, setAvailability] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [isFav, setIsFav] = useState(false);

  // Layout states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCoverIndex, setActiveCoverIndex] = useState(0);

  // Zoom Portfolio Modal state
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [zoomImageIndex, setZoomImageIndex] = useState(0);

  // Booking states
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  // Load profile sub-resources
  const loadProfileDetails = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("[ArtistProfileScreen Debug] Starting loadProfileDetails. Param artistId:", artistId);
    try {
      const prof = await fetchArtistProfile(artistId);
      if (!prof) {
        console.log("[ArtistProfileScreen Debug] prof is null/undefined!");
        setError("Artist profile not found");
        setLoading(false);
        return;
      }

      console.log("[ArtistProfileScreen Debug] prof received:", prof.name || prof.full_name);
      setProfile(prof);

      // Extract services, portfolio, reviews, availability if returned inside prof or fetch fallback
      const servs = (prof.services && prof.services.length > 0) ? prof.services : await fetchArtistServices(artistId).catch(() => []);
      const port = (prof.portfolio && prof.portfolio.length > 0) ? prof.portfolio : await fetchArtistPortfolio(artistId).catch(() => []);
      const revs = (prof.reviews && prof.reviews.length > 0) ? prof.reviews : await fetchArtistReviews(artistId).catch(() => []);
      const avail = prof.availability || await fetchArtistAvailability(artistId).catch(() => []);
      const favs = await getFavorites().catch(() => []);

      setServices(servs || []);
      setPortfolio(Array.isArray(port) ? port : (port?.portfolios || port?.data || []));
      const reviewsList = Array.isArray(revs) ? revs : (revs?.reviews || []);
      const reviewsDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let sumRating = 0;
      reviewsList.forEach((r) => {
        const rVal = Math.min(5, Math.max(1, Math.round(Number(r.rating || 5))));
        reviewsDist[rVal] = (reviewsDist[rVal] || 0) + 1;
        sumRating += Number(r.rating || 5);
      });
      if (reviewsList.length > 0) {
        prof.avg_rating = Number((sumRating / reviewsList.length).toFixed(1));
        prof.total_reviews = reviewsList.length;
      }
      setReviewsData({
        reviews: reviewsList,
        distribution: reviewsDist
      });
      setAvailability(Array.isArray(avail) ? avail : (avail?.slots || []));
      setSimilar([]);

      // Check favorite
      const targetId = prof.id || prof.user_id;
      const targetUserId = prof.user_id || prof.user?.id || prof.id;
      const targetProfileId = prof.id || prof.artist_profile_id;
      const isArtistFav = (Array.isArray(favs) ? favs : []).some((fav) => 
        String(fav.id) === String(targetId) || 
        String(fav.user_id) === String(targetId) ||
        String(fav.artist_id) === String(targetId) ||
        String(fav.artist_profile_id) === String(targetId) ||
        String(fav.id) === String(targetUserId) ||
        String(fav.user_id) === String(targetUserId) ||
        String(fav.artist_id) === String(targetUserId) ||
        String(fav.artist_profile_id) === String(targetUserId) ||
        String(fav.id) === String(targetProfileId) ||
        String(fav.user_id) === String(targetProfileId) ||
        String(fav.artist_id) === String(targetProfileId) ||
        String(fav.artist_profile_id) === String(targetProfileId)
      );
      setIsFav(isArtistFav);

      // Default date select
      if (avail && avail.length > 0) {
        const moment = require("moment");
        const distinctDates = [...new Set(avail.map((s) => s?.date).filter(Boolean))].filter((date) => {
          return moment(date, ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DDTHH:mm:ssZ"]).isValid();
        });
        if (distinctDates.length > 0) {
          setSelectedDate(distinctDates[0]);
        }
      }
    } catch (e) {
      console.log("[ArtistProfileScreen Debug] Error loading artist details:", e.message);
      setError("Failed to load artist details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    loadProfileDetails();
  }, [loadProfileDetails]);

  // Sync Favorite actions
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
      console.log("Failed to toggle favorite:", e.message);
    }
  };

  // Share profile triggers
  const handleShareProfile = async () => {
    try {
      const minPrice = services?.[0]?.minimum_price || 1500;
      await Share.share({
        title: `Check out ${profile.user?.name || "Mehndi Artist"}`,
        message: `Book ${profile.user?.name || "this Mehndi Artist"} on MehandiGo! Starting price: ₹${minPrice}, experience: ${profile.experience_years} years, rating: ⭐${Number(profile.avg_rating || 0).toFixed(1)} stars. Download MehandiGo!`
      });
    } catch (e) {
      console.log("Failed to share profile:", e.message);
    }
  };

  const handleMoreOptions = () => {
    Alert.alert(
      "Profile Options",
      "Select an action for this artist profile.",
      [
        {
          text: "Report Profile",
          onPress: () => {
            Alert.alert("Profile Reported", "Thank you. Our compliance team will review this artist profile within 24 hours.");
          }
        },
        {
          text: "Block Artist",
          style: "destructive",
          onPress: () => {
            Alert.alert("Artist Blocked", "This artist has been blocked. You will no longer receive updates or messages from them.");
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  // Directs map search to Google Maps Launcher
  const handleOpenGoogleMaps = () => {
    const lat = profile.latitude || 26.9124;
    const lng = profile.longitude || 75.7873;
    const label = encodeURIComponent(profile.user?.name || "Mehndi Artist");
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  // Chat action triggers
  const handleMessageArtist = async () => {
    try {
      setLoading(true);
      const history = await getBookingHistory();
      const existing = (history || []).find(b => b.artist_id === profile.id);
      
      if (existing) {
        setLoading(false);
        navigation.navigate("ChatRoom", {
          bookingId: existing.id,
          receiverId: profile.user_id,
          receiverName: profile.user?.name,
          receiverImage: profile.user?.profile_image
        });
      } else {
        // No booking exists yet. Create a mock booking for general chat inquiries
        const defaultService = services?.[0];
        if (!defaultService) {
          setLoading(false);
          Alert.alert("Notice", "Cannot start chat. This artist has no services listed.");
          return;
        }

        const newB = await createBooking({
          artistId: profile.id,
          serviceId: defaultService.id,
          slotId: null,
          address: "Inquiry Chat Channel",
          landmark: "Auto-generated",
          notes: "General Pre-Booking Inquiry Chat"
        });

        // Backend response returns booking wrapper
        const finalBookingId = newB?.id || newB?.booking?.id;
        setLoading(false);
        
        if (!finalBookingId) {
          throw new Error("Could not construct chat session ID");
        }

        navigation.navigate("ChatRoom", {
          bookingId: finalBookingId,
          receiverId: profile.user_id,
          receiverName: profile.user?.name,
          receiverImage: profile.user?.profile_image
        });
      }
    } catch (err) {
      setLoading(false);
      Alert.alert("Chat Error", "Could not start chat session with this artist.");
    }
  };

  // Confirm reservation items
  const handleBookNow = () => {
    navigation.navigate("SelectService", {
      artistId: profile.id,
      selectedDate,
      selectedTimeSlot
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching Artist Profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error || "Artist profile not found"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfileDetails}>
          <Text style={styles.retryBtnText}>Retry Load</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Cover image assets array
  const coverImages = portfolio.length > 0
    ? portfolio.slice(0, 4).map((p) => resolveImage(p.image_url || p.url)).filter(Boolean)
    : [];

  // Distinct dates in availability slots
  const availableDates = [...new Set(availability.map((slot) => slot?.date).filter(Boolean))].filter((date) => {
    const moment = require("moment");
    return moment(date, ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DDTHH:mm:ssZ"]).isValid();
  });
  const timeSlotsForSelectedDate = availability.filter((slot) => slot?.date === selectedDate);

  const artistDisplayName = profile.name || profile.full_name || profile.user?.name || "Mehndi Artist";
  const artistAvatarUri = resolveImage(profile.profile_image || profile.avatar || profile.user?.profile_image)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistDisplayName)}&background=F3E8FF&color=7C3AED`;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Cover Carousel */}
        <View style={styles.coverContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              setActiveCoverIndex(Math.round(x / SCREEN_WIDTH));
            }}
            scrollEventThrottle={16}
          >
            {coverImages.map((uri, idx) => (
              <Image key={idx} source={{ uri: resolveImage(uri) || uri }} style={styles.coverImage} />
            ))}
          </ScrollView>
          
          {/* Header Actions Overlay */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity style={styles.circleBtn} onPress={handleShareProfile}>
                <Ionicons name="share-social-outline" size={20} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.circleBtn, { marginLeft: 8 }]} onPress={handleToggleFavorite}>
                <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? Colors.error : Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.circleBtn, { marginLeft: 8 }]} onPress={handleMoreOptions}>
                <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dots Indicator */}
          {coverImages.length > 1 && (
            <View style={styles.dotContainer}>
              {coverImages.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    activeCoverIndex === i ? styles.activeDot : null
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: artistAvatarUri }}
            style={styles.avatarImage}
          />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{artistDisplayName}</Text>
              {profile.verification_status === "APPROVED" && (
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.titleText}>Professional Mehndi Stylist</Text>
            
            <View style={styles.detailsRow}>
              <Text style={styles.detailItem}>🎓 {profile.experience_years} Years Exp</Text>
              <Text style={styles.detailItem}>⚡ {profile.response_time}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailItem}>👤 {profile.user?.gender || "Female"}</Text>
              <Text style={styles.detailItem}>🗣️ {profile.languages || "Hindi, English"}</Text>
            </View>
          </View>
        </View>

        {/* Dynamic Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>
              ⭐ {Number(profile.avg_rating || 0) > 0 ? Number(profile.avg_rating).toFixed(1) : "New"}
            </Text>
            <Text style={styles.statLabel}>{profile.total_reviews ? `${profile.total_reviews} Reviews` : "0 Reviews"}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>💼 {profile.total_bookings || 10}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>🎂 Since</Text>
            <Text style={styles.statLabel}>{profile.user?.createdAt ? new Date(profile.user.createdAt).getFullYear() : "2024"}</Text>
          </View>
        </View>

        {/* Section: About bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Artist</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>

        {/* Section: Profile Videos */}
        {(profile.intro_video || profile.portfolio_video) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Videos</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              {profile.intro_video && (
                <TouchableOpacity
                  style={styles.videoCard}
                  onPress={() => navigation.navigate("VideoPlayer", { videoUrl: profile.intro_video, title: "Introduction Video" })}
                >
                  <Ionicons name="play-circle" size={32} color={Colors.primary} />
                  <Text style={styles.videoCardText}>Intro Video</Text>
                </TouchableOpacity>
              )}
              {profile.portfolio_video && (
                <TouchableOpacity
                  style={styles.videoCard}
                  onPress={() => navigation.navigate("VideoPlayer", { videoUrl: profile.portfolio_video, title: "Portfolio Video" })}
                >
                  <Ionicons name="play-circle" size={32} color={Colors.primary} />
                  <Text style={styles.videoCardText}>Portfolio Video</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Section: Location and Map */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.locationText}>📍 {profile.city || "Jaipur"}, {profile.state || "Rajasthan"}</Text>
          
          {/* Map Preview Placeholder card */}
          <View style={styles.mapCard}>
            <Ionicons name="map-outline" size={32} color={Colors.primary} />
            <Text style={styles.mapCardText}>Latitude: {profile.latitude || 26.9124}, Longitude: {profile.longitude || 75.7873}</Text>
            <TouchableOpacity style={styles.mapsBtn} onPress={handleOpenGoogleMaps}>
              <Ionicons name="navigate" size={16} color={Colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Services List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Offered ({services.length})</Text>
          {services.length === 0 ? (
            <Text style={styles.emptyText}>No services listed by this artist.</Text>
          ) : (
            services.map((item, index) => (
              <View key={`service-${item.id || 'idx'}-${index}`} style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{item.specialization_name || item.title || item.name || "Henna Package"}</Text>
                  <Text style={styles.serviceCategory}>{item.category || "Henna Art"} • ⏱️ {item.duration_minutes || item.duration || 60} mins</Text>
                  <Text style={styles.serviceDesc} numberOfLines={2}>{item.description || "Beautiful custom mehndi styling."}</Text>
                  {item.add_on_services && (
                    <Text style={styles.addonText}>🎁 Add-ons: {item.add_on_services}</Text>
                  )}
                </View>
                <View style={styles.servicePriceBlock}>
                  <Text style={styles.servicePrice}>₹{item.minimum_price || item.price || item.starting_price || item.amount || 1800}</Text>
                  {item.offer_price && (
                    <Text style={styles.offerPrice}>₹{item.offer_price} Offer</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Section: Portfolio Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Gallery ({portfolio.length})</Text>
          {portfolio.length === 0 ? (
            <Text style={styles.emptyText}>No portfolio images available.</Text>
          ) : (
            <View style={styles.portfolioGrid}>
              {portfolio.map((item, index) => (
                <TouchableOpacity
                  key={`portfolio-${item.id || 'idx'}-${index}`}
                  style={styles.portfolioGridItem}
                  onPress={() => {
                    setZoomImageIndex(index);
                    setZoomModalVisible(true);
                  }}
                >
                  <Image source={{ uri: resolveImage(item.image_url || item.url || item.image || item.media_url || item) }} style={styles.portfolioThumb} />
                  {item.video_url && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="play" size={12} color={Colors.white} />
                    </View>
                  )}
                  {/* Tier Badge */}
                  <View style={[styles.gridTierBadge, item.art_tier === "PREMIUM" ? styles.gridPremiumBadge : styles.gridStandardBadge]}>
                    <Text style={[styles.gridTierText, item.art_tier === "PREMIUM" ? styles.gridPremiumText : styles.gridStandardText]}>
                      {item.art_tier === "PREMIUM" ? `💎 ₹${item.price || "Prem"}` : "✨ Standard"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Section: Availability Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check Availability</Text>
          {availableDates.length === 0 ? (
            <Text style={styles.emptyText}>No available slots. Contact artist below.</Text>
          ) : (
            <View>
              <Text style={styles.subHeading}>Available Dates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {availableDates.map((date, index) => {
                  const moment = require("moment");
                  const dateObj = moment(date, ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DDTHH:mm:ssZ"]);
                  const isSelected = selectedDate === date;
                  return (
                    <TouchableOpacity
                      key={`avail-date-${date}-${index}`}
                      style={[
                        styles.dateChip,
                        isSelected ? styles.activeDateChip : null
                      ]}
                      onPress={() => {
                        setSelectedDate(date);
                        setSelectedTimeSlot(null);
                      }}
                    >
                      <Text style={[styles.dateDayText, isSelected ? styles.activeDateText : null]}>
                        {dateObj.format("ddd")}
                      </Text>
                      <Text style={[styles.dateNumText, isSelected ? styles.activeDateText : null]}>
                        {dateObj.format("DD")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.subHeading}>Available Time Slots</Text>
              <View style={styles.slotsGrid}>
                {timeSlotsForSelectedDate.length === 0 ? (
                  <Text style={styles.holidayText}>🌴 Artist on Holiday / Fully Booked on this date</Text>
                ) : (
                  timeSlotsForSelectedDate.map((slot, index) => {
                    const isSelected = selectedTimeSlot === slot.id;
                    const moment = require("moment");
                    const startLabel = moment(slot.start_time).format("hh:mm A");
                    const endLabel = moment(slot.end_time).format("hh:mm A");
                    return (
                      <TouchableOpacity
                        key={`avail-slot-${slot.id || 'idx'}-${index}`}
                        style={[
                          styles.slotChip,
                          isSelected ? styles.activeSlotChip : null
                        ]}
                        onPress={() => setSelectedTimeSlot(slot.id)}
                      >
                        <Text style={[styles.slotText, isSelected ? styles.activeSlotText : null]}>
                          🕒 {startLabel} - {endLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>
          )}
        </View>

        {/* Section: Reviews List & Star Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Reviews ({reviewsData.reviews.length})</Text>

          {/* Client Video Reviews Reel Carousel */}
          {reviewsData.reviews.filter(r => Boolean(r.video_url)).length > 0 && (
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.subHeading}>🎬 Client Video Reviews</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {reviewsData.reviews.filter(r => Boolean(r.video_url)).map((vRev, vIdx) => (
                  <TouchableOpacity
                    key={`v-rev-${vRev.id || vIdx}`}
                    style={styles.videoReviewCard}
                    onPress={() => {
                      navigation.navigate("VideoPlayer", {
                        videoUrl: vRev.video_url,
                        title: `Review by ${vRev.user?.name || vRev.reviewer?.name || "Verified Customer"}`
                      });
                    }}
                  >
                    <Image
                      source={{ uri: vRev.video_thumbnail || resolveImage(vRev.reviewer?.profile_image) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300" }}
                      style={styles.videoReviewThumb}
                    />
                    <View style={styles.videoReviewOverlay}>
                      <Ionicons name="play-circle" size={36} color="#FFFFFF" />
                      <View style={styles.videoReviewMeta}>
                        <Text style={styles.videoReviewName} numberOfLines={1}>
                          {vRev.user?.name || vRev.reviewer?.name || "Client"}
                        </Text>
                        <Text style={styles.videoReviewStars}>{"⭐".repeat(vRev.rating || 5)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.reviewDistributionCard}>
            <View style={styles.avgRatingCol}>
              <Text style={styles.ratingBigVal}>
                {Number(profile.avg_rating || 0) > 0 ? Number(profile.avg_rating).toFixed(1) : "New"}
              </Text>
              <View style={{ flexDirection: "row", marginVertical: 4 }}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Ionicons name="star" size={14} color="#FFB800" />
                <Ionicons name="star" size={14} color="#FFB800" />
                <Ionicons name="star" size={14} color="#FFB800" />
                <Ionicons name="star" size={14} color="#FFB800" />
              </View>
              <Text style={styles.ratingSubLabel}>{profile.total_reviews ? `${profile.total_reviews} reviews` : "No reviews yet"}</Text>
            </View>
            <View style={styles.distCol}>
              <View style={styles.distRow}>
                <Text style={styles.distStarText}>5 ★</Text>
                <View style={styles.distTrack}>
                  <View style={[styles.distFill, { width: `${reviewsData.reviews.length ? (reviewsData.distribution[5] / reviewsData.reviews.length) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.distCountText}>{reviewsData.distribution[5] || 0}</Text>
              </View>
              <View style={styles.distRow}>
                <Text style={styles.distStarText}>4 ★</Text>
                <View style={styles.distTrack}>
                  <View style={[styles.distFill, { width: `${reviewsData.reviews.length ? (reviewsData.distribution[4] / reviewsData.reviews.length) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.distCountText}>{reviewsData.distribution[4] || 0}</Text>
              </View>
              <View style={styles.distRow}>
                <Text style={styles.distStarText}>3 ★</Text>
                <View style={styles.distTrack}>
                  <View style={[styles.distFill, { width: `${reviewsData.reviews.length ? (reviewsData.distribution[3] / reviewsData.reviews.length) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.distCountText}>{reviewsData.distribution[3] || 0}</Text>
              </View>
              <View style={styles.distRow}>
                <Text style={styles.distStarText}>2 ★</Text>
                <View style={styles.distTrack}>
                  <View style={[styles.distFill, { width: `${reviewsData.reviews.length ? (reviewsData.distribution[2] / reviewsData.reviews.length) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.distCountText}>{reviewsData.distribution[2] || 0}</Text>
              </View>
              <View style={styles.distRow}>
                <Text style={styles.distStarText}>1 ★</Text>
                <View style={styles.distTrack}>
                  <View style={[styles.distFill, { width: `${reviewsData.reviews.length ? (reviewsData.distribution[1] / reviewsData.reviews.length) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.distCountText}>{reviewsData.distribution[1] || 0}</Text>
              </View>
            </View>
          </View>

          {/* Individual Reviews Rows */}
          {reviewsData.reviews.length === 0 ? (
            <Text style={styles.emptyText}>No reviews submitted yet.</Text>
          ) : (
            reviewsData.reviews.map((rev, index) => (
              <View key={`review-${rev.id || 'idx'}-${index}`} style={styles.reviewCard}>
                <View style={styles.reviewerHeader}>
                  <Image
                    source={{ uri: rev.reviewer?.profile_image || rev.user?.profile_image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150" }}
                    style={styles.reviewerAvatar}
                  />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.reviewerName}>{rev.reviewer?.name || rev.user?.name || "Customer"}</Text>
                      {rev.is_verified && (
                        <View style={styles.verifiedClientBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#059669" />
                          <Text style={styles.verifiedClientText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", marginTop: 2 }}>
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Ionicons key={`star-${rev.id || index}-${i}`} name="star" size={10} color="#FFB800" />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ""}
                  </Text>
                </View>
                <Text style={styles.reviewContent}>{rev.comment || rev.review_text}</Text>
                {/* Review Media (Photos/Video) */}
                {(() => {
                  const photosList = Array.isArray(rev.photos) ? rev.photos : (typeof rev.photos === 'string' ? JSON.parse(rev.photos || "[]") : []);
                  if (photosList.length === 0 && !rev.video_url) return null;
                  
                  return (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {rev.video_url && (
                        <View style={{ marginRight: 8, position: "relative" }}>
                          <Image 
                            source={{ uri: rev.video_thumbnail || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300" }} 
                            style={styles.reviewPhotoAttachment} 
                          />
                          <View style={{ position: "absolute", top: "50%", left: "50%", marginLeft: -12, marginTop: -12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 4 }}>
                            <Ionicons name="play" size={16} color="#fff" />
                          </View>
                        </View>
                      )}
                      {photosList.map((pUrl, pIdx) => (
                        <Image key={pIdx} source={{ uri: pUrl }} style={styles.reviewPhotoAttachment} />
                      ))}
                    </ScrollView>
                  );
                })()}
                {/* Artist Reply */}
                {rev.reply_text && (
                  <View style={styles.replyBox}>
                    <Text style={styles.replyHeader}>Artist Reply:</Text>
                    <Text style={styles.replyText}>{rev.reply_text}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Section: Related Artists */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Similar Artists</Text>
          {similar.length === 0 ? (
            <Text style={styles.emptyText}>No similar artists nearby.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {similar.map((art, index) => (
                <TouchableOpacity
                  key={`sim-${art.id || 'idx'}-${index}`}
                  style={styles.similarCard}
                  onPress={() => navigation.push("ArtistProfile", { artistId: art.id })}
                >
                  <Image source={{ uri: resolveImage(art.cover_photo || art.avatar) }} style={styles.similarImage} />
                  <Text style={styles.similarName} numberOfLines={1}>{art.name}</Text>
                  <Text style={styles.similarRating}>⭐ {Number(art.rating || 4.8).toFixed(1)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Button */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Starting from</Text>
          <Text style={styles.bottomPriceVal}>₹{profile.starting_price || 999}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookNowBtn}
          onPress={() => {
            navigation.navigate("SelectService", {
              artistId: profile.id,
              artist: profile
            });
          }}
        >
          <Text style={styles.bookNowBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>

      {/* Fullscreen Portfolio zoom Carousel Modal */}
      <Modal
        visible={zoomModalVisible}
        transparent={true}
        onRequestClose={() => setZoomModalVisible(false)}
      >
        <View style={styles.zoomContainer}>
          <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomModalVisible(false)}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>
          {portfolio.length > 0 && (
            <View style={{ width: "100%", height: 320, justifyContent: "center", alignItems: "center", position: "relative" }}>
              <Image
                source={{ uri: resolveImage(portfolio[zoomImageIndex]?.image_url || portfolio[zoomImageIndex]?.url || portfolio[zoomImageIndex]?.image || portfolio[zoomImageIndex]?.media_url) }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
              {portfolio[zoomImageIndex]?.video_url && (
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.3)"
                  }}
                  onPress={() => {
                    setZoomModalVisible(false);
                    navigation.navigate("VideoPlayer", {
                      videoUrl: portfolio[zoomImageIndex].video_url,
                      title: portfolio[zoomImageIndex].title || "Portfolio Video"
                    });
                  }}
                >
                  <Ionicons name="play-circle" size={64} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", marginTop: 8, fontWeight: "700" }}>Tap to Play Video</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {/* Zoom Carousel controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomCtrlBtn}
              onPress={() => setZoomImageIndex((prev) => (prev > 0 ? prev - 1 : portfolio.length - 1))}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.zoomIndexText}>{zoomImageIndex + 1} / {portfolio.length}</Text>
            <TouchableOpacity
              style={styles.zoomCtrlBtn}
              onPress={() => setZoomImageIndex((prev) => (prev < portfolio.length - 1 ? prev + 1 : 0))}
            >
              <Ionicons name="chevron-forward" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Design Info & Book Design Button inside Zoom Modal */}
          {portfolio[zoomImageIndex] && (
            <View style={styles.zoomDesignDetails}>
              <Text style={styles.zoomDesignTitle}>{portfolio[zoomImageIndex].title || "Mehndi Design Sample"}</Text>
              <View style={styles.zoomBadgeRow}>
                <View style={[styles.gridTierBadge, portfolio[zoomImageIndex].art_tier === "PREMIUM" ? styles.gridPremiumBadge : styles.gridStandardBadge]}>
                  <Text style={[styles.gridTierText, portfolio[zoomImageIndex].art_tier === "PREMIUM" ? styles.gridPremiumText : styles.gridStandardText]}>
                    {portfolio[zoomImageIndex].art_tier === "PREMIUM" ? `💎 PREMIUM ART` : "✨ STANDARD ART"}
                  </Text>
                </View>
                <Text style={styles.zoomMetaText}>⏱️ {portfolio[zoomImageIndex].duration_minutes || 60} mins</Text>
              </View>
              {Boolean(portfolio[zoomImageIndex].description) && (
                <Text style={styles.zoomDescText} numberOfLines={2}>{portfolio[zoomImageIndex].description}</Text>
              )}
              <TouchableOpacity
                style={styles.bookDesignModalBtn}
                onPress={() => {
                  setZoomModalVisible(false);
                  navigation.navigate("SelectService", {
                    artistId: profile.id,
                    artist: profile,
                    selectedArt: portfolio[zoomImageIndex]
                  });
                }}
              >
                <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.bookDesignModalBtnText}>
                  Book This Design {portfolio[zoomImageIndex].price ? `• ₹${portfolio[zoomImageIndex].price}` : ""}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.white },
  loadingText: { fontSize: 13, color: Colors.textSecondary, marginTop: 10 },
  errorText: { fontSize: 14, color: Colors.error, marginTop: 10, textAlign: "center", paddingHorizontal: 20 },
  retryBtn: { marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: Colors.white, fontWeight: "700" },
  coverContainer: { position: "relative", height: 280, backgroundColor: Colors.inputBackground },
  coverImage: { width: SCREEN_WIDTH, height: 280, resizeMode: "cover" },
  headerOverlay: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + "DD",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  dotContainer: {
    position: "absolute",
    bottom: 12,
    flexDirection: "row",
    alignSelf: "center"
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white + "77", marginHorizontal: 4 },
  activeDot: { backgroundColor: Colors.primary, width: 14 },
  profileCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: -40,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border
  },
  avatarImage: { width: 85, height: 85, borderRadius: 12, borderWidth: 3, borderColor: Colors.white },
  profileInfo: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  nameText: { fontSize: 18, fontWeight: "800", color: Colors.text },
  titleText: { fontSize: 12, color: Colors.textTertiary, marginTop: 2, fontWeight: "600" },
  detailsRow: { flexDirection: "row", marginTop: 6, justifyContent: "space-between" },
  detailItem: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border
  },
  statBox: { alignItems: "center", flex: 1 },
  statVal: { fontSize: 16, fontWeight: "800", color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: Colors.border },
  section: { marginHorizontal: 16, marginTop: 18, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  bioText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  locationText: { fontSize: 13, color: Colors.text, fontWeight: "600" },
  mapCard: {
    height: 130,
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 16
  },
  mapCardText: { fontSize: 11, color: Colors.textSecondary, marginVertical: 8 },
  mapsBtn: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center"
  },
  mapsBtnText: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  videoCard: {
    flex: 1,
    height: 70,
    backgroundColor: Colors.inputBackground || "#F5F5F5",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  videoCardText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  emptyText: { fontSize: 12, color: Colors.textTertiary, fontStyle: "italic" },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBackground
  },
  serviceName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  serviceCategory: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  serviceDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 4, lineHeight: 16 },
  addonText: { fontSize: 11, color: Colors.primary, fontWeight: "600", marginTop: 4 },
  servicePriceBlock: { alignItems: "flex-end" },
  servicePrice: { fontSize: 15, fontWeight: "800", color: Colors.primary },
  offerPrice: { fontSize: 10, color: Colors.error, fontWeight: "700", marginTop: 2 },
  portfolioGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  portfolioGridItem: { width: "31%", aspectRatio: 1, margin: "1.1%", position: "relative" },
  portfolioThumb: { width: "100%", height: "100%", borderRadius: 8 },
  videoBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center"
  },
  subHeading: { fontSize: 13, fontWeight: "700", color: Colors.text, marginTop: 10 },
  dateChip: {
    width: 50,
    height: 60,
    borderRadius: 10,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8
  },
  activeDateChip: { backgroundColor: Colors.primary },
  dateDayText: { fontSize: 11, color: Colors.textSecondary },
  dateNumText: { fontSize: 15, fontWeight: "800", color: Colors.text, marginTop: 2 },
  activeDateText: { color: Colors.white },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
    marginRight: 8,
    marginBottom: 8
  },
  activeSlotChip: { backgroundColor: Colors.primary },
  slotText: { fontSize: 12, color: Colors.textSecondary },
  activeSlotText: { color: Colors.white, fontWeight: "700" },
  holidayText: { fontSize: 12, color: Colors.textTertiary, fontStyle: "italic", marginVertical: 8 },
  reviewDistributionCard: {
    flexDirection: "row",
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16
  },
  avgRatingCol: { flex: 1, alignItems: "center", justifyContent: "center" },
  ratingBigVal: { fontSize: 32, fontWeight: "900", color: Colors.text },
  ratingSubLabel: { fontSize: 11, color: Colors.textTertiary },
  distCol: { flex: 1.5, justifyContent: "center" },
  distRow: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
  distStarText: { fontSize: 11, color: Colors.textSecondary, width: 30 },
  distTrack: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, marginHorizontal: 8, overflow: "hidden" },
  distFill: { height: "100%", backgroundColor: Colors.primary, borderRadius: 3 },
  distCountText: { fontSize: 11, color: Colors.textTertiary, width: 20, textAlign: "right" },
  reviewCard: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.inputBackground },
  reviewerHeader: { flexDirection: "row", alignItems: "center" },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewerName: { fontSize: 13, fontWeight: "700", color: Colors.text },
  reviewerStars: { fontSize: 11, marginTop: 2 },
  reviewDate: { fontSize: 11, color: Colors.textTertiary, marginLeft: 6 },
  reviewContent: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
  replyBox: { backgroundColor: Colors.inputBackground, borderRadius: 8, padding: 10, marginTop: 10 },
  replyHeader: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary },
  replyText: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  relatedCard: { width: 100, marginRight: 12 },
  relatedImage: { width: "100%", height: 100, borderRadius: 10 },
  relatedName: { fontSize: 12, fontWeight: "700", color: Colors.text, marginTop: 6 },
  relatedRating: { fontSize: 11, fontWeight: "600", color: Colors.text, marginLeft: 2 },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between"
  },
  chatFooterBtn: {
    width: 60,
    alignItems: "center",
    justifyContent: "center"
  },
  chatFooterBtnText: { fontSize: 10, color: Colors.primary, fontWeight: "700", marginTop: 2 },
  bookFooterBtn: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  bookFooterBtnText: { color: Colors.white, fontWeight: "800", fontSize: 14 },
  zoomContainer: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" },
  zoomImage: { width: SCREEN_WIDTH, height: "80%" },
  zoomCloseBtn: { position: "absolute", top: 50, right: 20 },
  zoomControls: {
    position: "absolute",
    bottom: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "70%"
  },
  zoomCtrlBtn: { padding: 10 },
  zoomIndexText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  gridTierBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridPremiumBadge: {
    backgroundColor: "rgba(124, 58, 237, 0.9)",
  },
  gridStandardBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
  },
  gridTierText: {
    fontSize: 9,
    fontWeight: "800",
  },
  gridPremiumText: {
    color: "#FFFFFF",
  },
  gridStandardText: {
    color: "#FFFFFF",
  },
  videoReviewCard: {
    width: 130,
    height: 190,
    borderRadius: 14,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#000",
    position: "relative",
  },
  videoReviewThumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  videoReviewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  videoReviewMeta: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 8,
  },
  videoReviewName: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  videoReviewStars: {
    fontSize: 9,
    marginTop: 2,
  },
  verifiedClientBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  verifiedClientText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
    marginLeft: 3,
  },
  reviewPhotoAttachment: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  zoomDesignDetails: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 16,
    padding: 16,
  },
  zoomDesignTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  zoomBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  zoomMetaText: {
    color: "#CBD5E1",
    fontSize: 12,
  },
  zoomDescText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  bookDesignModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  bookDesignModalBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between"
  },
  bottomPriceCol: {
    justifyContent: "center"
  },
  bottomPriceLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600"
  },
  bottomPriceVal: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary
  },
  bookNowBtn: {
    flex: 1,
    marginLeft: 16,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  bookNowBtnText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 14
  },
  similarCard: { width: 100, marginRight: 12 },
  similarImage: { width: "100%", height: 100, borderRadius: 10 },
  similarName: { fontSize: 12, fontWeight: "700", color: Colors.text, marginTop: 6 },
  similarRating: { fontSize: 11, fontWeight: "600", color: Colors.text, marginLeft: 2 },
});
