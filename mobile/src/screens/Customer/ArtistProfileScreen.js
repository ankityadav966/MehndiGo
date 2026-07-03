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

export default function ArtistProfileScreen({ route, navigation }) {
  const { artistId } = route.params || { artistId: 1 };

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
  const loadProfileDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prof, servs, port, revs, avail, sim, favs] = await Promise.all([
        fetchArtistProfile(artistId),
        fetchArtistServices(artistId),
        fetchArtistPortfolio(artistId),
        fetchArtistReviews(artistId),
        fetchArtistAvailability(artistId),
        fetchSimilarArtists(artistId),
        getFavorites()
      ]);

      if (!prof) {
        setError("Artist profile not found");
        setLoading(false);
        return;
      }

      setProfile(prof);
      setServices(servs || []);
      setPortfolio(port || []);
      setReviewsData(revs || { reviews: [], distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
      setAvailability(avail || []);
      setSimilar(sim || []);

      // Check favorite
      const isArtistFav = (favs || []).some((fav) => fav.id === prof.id);
      setIsFav(isArtistFav);

      // Default date select
      if (avail && avail.length > 0) {
        const distinctDates = [...new Set(avail.map((s) => s.date))];
        setSelectedDate(distinctDates[0]);
      }
    } catch (e) {
      console.log("Error loading artist details:", e.message);
      setError("Failed to load artist details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProfileDetails();
    }, 0);
    return () => clearTimeout(timer);
  }, [artistId]);

  // Sync Favorite actions
  const handleToggleFavorite = async () => {
    try {
      if (isFav) {
        await removeArtistFavorite(profile.id);
        setIsFav(false);
      } else {
        await addArtistFavorite(profile.id);
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
    ? portfolio.slice(0, 4).map((p) => p.image_url)
    : ["https://images.unsplash.com/photo-1590012357675-bc55909793fb?q=80&w=800"];

  // Distinct dates in availability slots
  const availableDates = [...new Set(availability.map((slot) => slot.date))];
  const timeSlotsForSelectedDate = availability.filter((slot) => slot.date === selectedDate);

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
              <Image key={idx} source={{ uri }} style={styles.coverImage} />
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
            source={{ uri: profile.user?.profile_image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300" }}
            style={styles.avatarImage}
          />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{profile.user?.name || "Mehndi Artist"}</Text>
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
            <Text style={styles.statVal}>⭐ {Number(profile.avg_rating || 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>{profile.total_reviews || 0} Reviews</Text>
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
              <View key={item.id ? `service-${item.id}` : `service-idx-${index}`} style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{item.specialization_name}</Text>
                  <Text style={styles.serviceCategory}>{item.category} • ⏱️ {item.duration_minutes || 60} mins</Text>
                  <Text style={styles.serviceDesc} numberOfLines={2}>{item.description || "Beautiful custom mehndi styling."}</Text>
                  {item.add_on_services && (
                    <Text style={styles.addonText}>🎁 Add-ons: {item.add_on_services}</Text>
                  )}
                </View>
                <View style={styles.servicePriceBlock}>
                  <Text style={styles.servicePrice}>₹{item.minimum_price}</Text>
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
                  key={item.id ? `portfolio-${item.id}` : `portfolio-idx-${index}`}
                  style={styles.portfolioGridItem}
                  onPress={() => {
                    setZoomImageIndex(index);
                    setZoomModalVisible(true);
                  }}
                >
                  <Image source={{ uri: item.image_url }} style={styles.portfolioThumb} />
                  {item.video_url && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="play" size={12} color={Colors.white} />
                    </View>
                  )}
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
                {availableDates.map((date) => {
                  const dateObj = new Date(date);
                  const isSelected = selectedDate === date;
                  return (
                    <TouchableOpacity
                      key={date}
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
                        {dateObj.toLocaleDateString("en-US", { weekday: "short" })}
                      </Text>
                      <Text style={[styles.dateNumText, isSelected ? styles.activeDateText : null]}>
                        {dateObj.getDate()}
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
                  timeSlotsForSelectedDate.map((slot) => {
                    const isSelected = selectedTimeSlot === slot.id;
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[
                          styles.slotChip,
                          isSelected ? styles.activeSlotChip : null
                        ]}
                        onPress={() => setSelectedTimeSlot(slot.id)}
                      >
                        <Text style={[styles.slotText, isSelected ? styles.activeSlotText : null]}>
                          🕒 {slot.start_time} - {slot.end_time}
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
          <View style={styles.reviewDistributionCard}>
            <View style={styles.avgRatingCol}>
              <Text style={styles.ratingBigVal}>{Number(profile.avg_rating || 0).toFixed(1)}</Text>
              <View style={{ flexDirection: "row", marginVertical: 4 }}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Ionicons name="star" size={14} color="#FFB800" />
                <Ionicons name="star" size={14} color="#FFB800" />
                <Ionicons name="star" size={14} color="#FFB800" />
                <Ionicons name="star-half" size={14} color="#FFB800" />
              </View>
              <Text style={styles.ratingSubLabel}>{profile.total_reviews || 0} reviews</Text>
            </View>
            <View style={styles.distCol}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const total = reviewsData.reviews.length || 1;
                const count = reviewsData.distribution[stars] || 0;
                const pct = (count / total) * 100;
                return (
                  <View key={stars} style={styles.distRow}>
                    <Text style={styles.distStarText}>{stars} ⭐</Text>
                    <View style={styles.distTrack}>
                      <View style={[styles.distFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.distCountText}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Individual Reviews Rows */}
          {reviewsData.reviews.length === 0 ? (
            <Text style={styles.emptyText}>Be the first to review this artist!</Text>
          ) : (
            reviewsData.reviews.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.reviewCard}>
                <View style={styles.reviewerHeader}>
                  <Image
                    source={{ uri: item.user?.profile_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150" }}
                    style={styles.reviewerAvatar}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.reviewerName}>{item.user?.name || "Customer"}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.reviewerStars}>{"⭐".repeat(item.rating)}</Text>
                      <Text style={styles.reviewDate}>• {new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewContent}>{item.review_text}</Text>
                
                {/* Artist Reply */}
                {item.reply_text && (
                  <View style={styles.replyBox}>
                    <Text style={styles.replyHeader}>Reply from {profile.user?.name || "Artist"}:</Text>
                    <Text style={styles.replyText}>{item.reply_text}</Text>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {similar.map((item, index) => (
                <TouchableOpacity
                  key={item.id ? `similar-${item.id}` : `similar-idx-${index}`}
                  style={styles.relatedCard}
                  onPress={() => navigation.push("ArtistProfile", { artistId: item.id })}
                >
                  <Image
                    source={{ uri: item.user?.profile_image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300" }}
                    style={styles.relatedImage}
                  />
                  <Text style={styles.relatedName} numberOfLines={1}>{item.user?.name || "Artist"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <Ionicons name="star" size={12} color="#FFB800" />
                    <Text style={styles.relatedRating}>{Number(item.avg_rating || 0).toFixed(1)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Section */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity style={styles.chatFooterBtn} onPress={handleMessageArtist}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.primary} />
          <Text style={styles.chatFooterBtnText}>Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.bookFooterBtn} onPress={handleBookNow}>
          <Text style={styles.bookFooterBtnText}>Book Appointment</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.white} style={{ marginLeft: 6 }} />
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
            <Image
              source={{ uri: portfolio[zoomImageIndex]?.image_url }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
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
  zoomIndexText: { color: Colors.white, fontSize: 15, fontWeight: "700" }
});
