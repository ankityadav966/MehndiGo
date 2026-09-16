import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Linking
} from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useNotifications } from "../../context/NotificationContext";
import { getArtistDashboardData, updateArtistProfileDetails } from "../../services/artist";
import { acceptBooking, rejectBooking } from "../../services/booking";
import Alert from "../../utils/Alert";
import OptimizedImage from "../../components/OptimizedImage";

const FIGMA_COLORS = {
  primary: "#E91E63", // Deep pink
  primaryLight: "#FDF2F8", // Very light pink
  success: "#10B981",
  warning: "#F59E0B",
  info: "#3B82F6",
  textDark: "#111827",
  textMuted: "#6B7280",
  bgLight: "#F8FAFC",
  border: "#F3F4F6",
  teal: "#0D9488"
};

function formatBookingDateTime(item) {
  if (!item) return { dateStr: "Today", timeStr: "Flexible" };

  let dateStr = "";
  const rawDate = item.booking_date || item.date || item.created_at;

  if (rawDate) {
    const rawStr = String(rawDate).trim();
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(rawStr)) {
      dateStr = rawStr;
    } else {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        } else {
          const parts = rawStr.split(/[-/]/);
          if (parts.length === 3) {
            const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (!isNaN(parsed.getTime())) dateStr = parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            else dateStr = rawStr;
          } else dateStr = rawStr;
        }
      } catch {
        dateStr = rawStr;
      }
    }
  }
  if (!dateStr || dateStr.toLowerCase().includes("invalid")) dateStr = "Today";

  let timeStr = item.booking_time || item.time || item.slot?.start_time || "";
  if (!timeStr || timeStr.toLowerCase().includes("invalid")) timeStr = "Flexible";

  return { dateStr, timeStr };
}

function getDistanceText(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const d = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  return d < 1 ? "< 1 km" : `${d.toFixed(1)} km`;
}

// --- Top App Bar ---
function TopAppBar({ artist, unreadCount, onNotificationPress, onProfilePress }) {
  return (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>
        <Text style={styles.logoText}>Mehendi<Text style={{color: FIGMA_COLORS.primary}}>Go</Text></Text>
        <Text style={styles.logoSubtitle}>Artists • Beauty • Celebrations</Text>
      </View>
      <View style={styles.appBarRight}>
        <Pressable onPress={onNotificationPress} style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={24} color={FIGMA_COLORS.textDark} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={onProfilePress} style={{ marginLeft: 12 }}>
          <OptimizedImage
            source={{ uri: artist.profile_image || "https://picsum.photos/200" }}
            style={styles.smallAvatar}
          />
        </Pressable>
      </View>
    </View>
  );
}

// --- Greeting Section ---
function GreetingSection({ artist, onProfilePress }) {
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good Morning,";
    if (hrs < 17) return "Good Afternoon,";
    return "Good Evening,";
  };
  const getProfileCompletion = () => artist.verification_status === "APPROVED" ? 100 : (artist.experience_years ? 75 : 50);

  return (
    <View style={styles.greetingSection}>
      <View style={{ flexDirection: "row", flex: 1, alignItems: "center" }}>
        <View style={styles.avatarContainer}>
          <OptimizedImage
            source={{ uri: artist.profile_image || "https://picsum.photos/200" }}
            style={styles.greetingAvatar}
          />
          <View style={styles.topArtistBadge}>
            <Text style={styles.topArtistText}>Top Artist</Text>
          </View>
        </View>
        <View style={styles.greetingTextCol}>
          <Text style={styles.greetingTime}>{getGreeting()}</Text>
          <Text style={styles.greetingName}>{artist.full_name || "Specialist"} 👑</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <Ionicons name="location" size={12} color={FIGMA_COLORS.primary} />
            <Text style={styles.greetingLocation}>{artist.city || "Update Location"}</Text>
          </View>
        </View>
      </View>
      <Pressable style={styles.progressContainer} onPress={onProfilePress}>
        <View style={styles.progressCircle}>
          <Text style={styles.progressText}>{getProfileCompletion()}%</Text>
        </View>
        <Text style={styles.progressLabel}>Profile Complete {">"}</Text>
      </Pressable>
    </View>
  );
}

// --- Active Booking Hero ---
function ActiveBookingCard({ booking, onPress, onCall }) {
  if (!booking) return null;
  const { dateStr, timeStr } = formatBookingDateTime(booking);
  const distance = getDistanceText(booking.artist_latitude, booking.artist_longitude, booking.latitude, booking.longitude);
  const customerName = booking.customer_name || booking.client_name || "Customer";
  const customerAvatar = booking.customer_avatar || "https://picsum.photos/200";
  const serviceTitle = booking.service?.title || booking.service_title || "Mehndi Service";
  
  const statuses = ["CONFIRMED", "ARTIST_ON_THE_WAY", "ARTIST_ARRIVED", "SERVICE_STARTED", "COMPLETED"];
  const detailed = String(booking.detailed_status || booking.status).toUpperCase();
  
  let currentIndex = 0;
  if (detailed === "ARTIST_ON_THE_WAY") currentIndex = 1;
  else if (detailed === "ARTIST_ARRIVED") currentIndex = 2;
  else if (detailed === "SERVICE_STARTED" || detailed === "IN_PROGRESS") currentIndex = 3;
  else if (detailed === "COMPLETED") currentIndex = 4;
  else if (detailed === "CONFIRMED" || detailed === "ACCEPTED") currentIndex = 0;

  const getStatusText = () => {
    switch(currentIndex) {
      case 0: return "You have an upcoming booking";
      case 1: return "You're currently on the way";
      case 2: return "You have checked in";
      case 3: return "Service is in progress";
      case 4: return "Service completed";
      default: return "Booking is active";
    }
  };

  return (
    <Pressable style={styles.activeCardOuter} onPress={onPress}>
      <View style={styles.activeCardTop}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.activeIconWrap}>
            <Ionicons name="person" size={16} color={FIGMA_COLORS.primary} />
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.activeCardTitle}>Active Booking</Text>
              <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>● Live</Text></View>
            </View>
            <Text style={styles.activeCardSub}>{getStatusText()}</Text>
          </View>
        </View>
        <Text style={styles.activeCardDetails}>View Details →</Text>
      </View>

      <View style={styles.activeCardInner}>
        <View style={styles.activeCardInnerRow}>
          <Image source={{ uri: customerAvatar }} style={styles.activeInnerAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeInnerName}>{customerName}</Text>
            <Text style={styles.activeInnerService}>{serviceTitle}</Text>
            <View style={styles.activeInnerMetaRow}>
              <Ionicons name="calendar-outline" size={12} color={FIGMA_COLORS.textMuted} />
              <Text style={styles.activeInnerMetaText}>{dateStr} • {timeStr}</Text>
            </View>
            <View style={styles.activeInnerMetaRow}>
              <Ionicons name="location-outline" size={12} color={FIGMA_COLORS.primary} />
              <Text style={styles.activeInnerMetaText}>{booking.address?.substring(0,20) || "Location"} {distance ? `• ${distance}` : ""}</Text>
            </View>
            <View style={[styles.activeInnerMetaRow, { marginTop: 4 }]}>
              <Ionicons name="cash-outline" size={14} color={FIGMA_COLORS.primary} />
              <Text style={styles.activeInnerAmount}>₹ {booking.final_amount || booking.total_amount}</Text>
            </View>
          </View>
          <Pressable style={styles.callBtn} onPress={() => onCall(booking.customer_phone)}>
            <Ionicons name="call" size={14} color="#FFF" />
            <Text style={styles.callBtnText}>Call Client</Text>
          </Pressable>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBarWrapper}>
          {["Confirmed", "On The Way", "Checked In", "Service Started", "Completed"].map((label, idx) => (
            <View key={idx} style={{ flex: 1, alignItems: "center" }}>
              <View style={[styles.progressNode, currentIndex >= idx ? styles.progressNodeActive : styles.progressNodeInactive]}>
                {currentIndex > idx ? <Ionicons name="checkmark" size={10} color="#FFF" /> : <Text style={{fontSize: 10, color: currentIndex === idx ? "#FFF" : "#9CA3AF"}}>{idx+1}</Text>}
              </View>
              <Text style={[styles.progressNodeLabel, currentIndex >= idx && { color: FIGMA_COLORS.primary, fontWeight: "600" }]}>{label}</Text>
              {idx < 4 && <View style={[styles.progressLine, currentIndex > idx ? styles.progressLineActive : styles.progressLineInactive]} />}
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

// --- New Requests Banner ---
function NewRequestsBanner({ count, onPress }) {
  if (count <= 0) return null;
  return (
    <Pressable style={styles.requestsBanner} onPress={onPress}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={styles.requestsIconWrap}>
          <Ionicons name="notifications" size={18} color={FIGMA_COLORS.primary} />
        </View>
        <View style={{ marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.requestsTitle}>New Booking Request</Text>
            <View style={styles.requestsBadge}><Text style={styles.requestsBadgeText}>{count}</Text></View>
          </View>
          <Text style={styles.requestsSub}>{count} customer{count > 1 ? 's are' : ' is'} waiting for your response</Text>
        </View>
      </View>
      <Text style={styles.requestsViewAll}>View All {">"}</Text>
    </Pressable>
  );
}

let memoryCachedArtistDashboard = { userId: null, data: null };

export function clearArtistDashboardMemoryCache() {
  memoryCachedArtistDashboard = { userId: null, data: null };
}

export default function ArtistDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { unreadCount, refreshUnreadCount } = useNotifications();

  const isCacheForCurrentUser = Boolean(user?.id && memoryCachedArtistDashboard.userId === user?.id && memoryCachedArtistDashboard.data);

  const [dashboard, setDashboard] = useState(() => isCacheForCurrentUser ? memoryCachedArtistDashboard.data : null);
  const [loading, setLoading] = useState(() => !isCacheForCurrentUser);
  const [refreshing, setRefreshing] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useEffect(() => {
    if (user?.id && memoryCachedArtistDashboard.userId !== user.id) {
      setDashboard(null);
      setLoading(true);
      fetchDashboardDetails();
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (refreshUnreadCount) refreshUnreadCount();
      const { BackHandler } = require("react-native");
      const { handleRootDoubleBackExit } = require("../../utils/navigationHelper");
      const sub = BackHandler.addEventListener("hardwareBackPress", () => handleRootDoubleBackExit("Press back again to exit MehndiGo Artist"));
      return () => sub.remove();
    }, [refreshUnreadCount])
  );

  const fetchDashboardDetails = React.useCallback(async () => {
    try {
      const data = await getArtistDashboardData();
      if (data && user?.id) {
        memoryCachedArtistDashboard = { userId: user.id, data };
        setDashboard(data);
        const art = data.artist || {};
        const hasLocation = Boolean((art.latitude && art.longitude) || (art.location) || (art.city));
        setShowLocationPrompt(!hasLocation);
      }
    } catch (err) {
      if (!isCacheForCurrentUser && !err.message?.includes("complete your onboarding")) {
        Alert.alert("Error", "Something went wrong loading your dashboard. Please retry.");
      }
      if (!isCacheForCurrentUser) setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isCacheForCurrentUser]);

  useEffect(() => {
    if (socket) {
      const handleEv = () => fetchDashboardDetails();
      socket.on("BOOKING_CREATED", handleEv);
      socket.on("NEW_BOOKING_REQUEST", handleEv);
      socket.on("BOOKING_UPDATED", handleEv);
      socket.on("PAYMENT_RECEIVED", handleEv);
      return () => {
        socket.off("BOOKING_CREATED", handleEv);
        socket.off("NEW_BOOKING_REQUEST", handleEv);
        socket.off("BOOKING_UPDATED", handleEv);
        socket.off("PAYMENT_RECEIVED", handleEv);
      };
    }
  }, [socket, fetchDashboardDetails]);

  useFocusEffect(React.useCallback(() => { fetchDashboardDetails(); }, [fetchDashboardDetails]));

  const handleUpdateLocation = async () => {
    try {
      setFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      let locationName = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
      let city = "", state = "", pincode = "";
      try {
        const [address] = await Location.reverseGeocodeAsync(pos.coords);
        if (address) {
          city = address.city || address.subregion || "";
          state = address.region || "";
          pincode = address.postalCode || "";
          locationName = [address.street, address.subregion, address.city, address.region].filter(Boolean).join(", ");
        }
      } catch (e) {}

      await updateArtistProfileDetails({ latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude), location: locationName, city, state, pincode });
      setShowLocationPrompt(false);
      Alert.alert("Success", "Location updated successfully!");
      fetchDashboardDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to fetch live location.");
    } finally {
      setFetchingLocation(false);
    }
  };

  const resolveImage = (uri) => {
    const fallback = "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300";
    if (!uri) return fallback;
    if (uri.startsWith("http") || uri.startsWith("file") || uri.startsWith("content")) return uri;
    const { SOCKET_URL } = require("../../services/api");
    return SOCKET_URL ? `${SOCKET_URL}${uri.startsWith("/") ? "" : "/"}${uri}` : fallback;
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={FIGMA_COLORS.primary} /></View>;

  const artist = dashboard?.artist || {};
  artist.profile_image = resolveImage(artist.profile_image || user?.avatar);
  const counts = dashboard?.bookingCounts || {};
  
  const allBookings = dashboard?.recentBookings || [];
  const activeBooking = allBookings.find(b => {
    const st = String(b.status || "").toUpperCase();
    const det = String(b.detailed_status || "").toUpperCase();
    return (st === "ACCEPTED" || st === "CONFIRMED" || det === "ARTIST_ON_THE_WAY" || det === "ARTIST_ARRIVED" || det === "SERVICE_STARTED" || det === "IN_PROGRESS" || det === "ACCEPTED" || det === "CONFIRMED");
  });

  const pendingBookings = allBookings.filter(b => String(b.status).toUpperCase() === "PENDING" && String(b.detailed_status).toUpperCase() !== "PENDING_PAYMENT");
  const upcomingBookings = allBookings.filter(b => {
    const st = String(b.status).toUpperCase();
    return (st === "CONFIRMED" || st === "ACCEPTED") && b.id !== activeBooking?.id;
  });

  const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar 
        artist={artist} 
        unreadCount={unreadCount} 
        onNotificationPress={() => navigation.navigate("Notifications")} 
        onProfilePress={() => navigation.navigate("Profile")} 
      />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardDetails(); }} colors={[FIGMA_COLORS.primary]} />}
      >
        <GreetingSection artist={artist} onProfilePress={() => navigation.navigate("Profile")} />

        {activeBooking && (
          <ActiveBookingCard 
            booking={activeBooking} 
            onPress={() => navigation.navigate("BookingDetails", { bookingId: activeBooking.id })}
            onCall={(phone) => phone && Linking.openURL(`tel:${phone}`)}
          />
        )}

        <NewRequestsBanner 
          count={pendingBookings.length} 
          onPress={() => navigation.navigate("BookingRequests", { initialTab: "Pending" })} 
        />

        {/* Today's Summary */}
        <View style={styles.sectionHead}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="calendar" size={16} color={FIGMA_COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Today's Summary</Text>
          </View>
          <Text style={styles.sectionSubRight}>{todayStr}</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <View style={[styles.summaryIconBox, { backgroundColor: `${FIGMA_COLORS.primary}15` }]}>
              <Ionicons name="calendar-outline" size={18} color={FIGMA_COLORS.primary} />
            </View>
            <Text style={[styles.summaryVal, { color: FIGMA_COLORS.primary }]}>{dashboard?.todayBookings || 0}</Text>
            <Text style={styles.summaryLabel}>Bookings</Text>
            <Text style={styles.summarySubLabel}>{counts.COMPLETED || 0} completed</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="cash-outline" size={18} color={FIGMA_COLORS.success} />
            </View>
            <Text style={[styles.summaryVal, { color: FIGMA_COLORS.success }]}>₹ {(dashboard?.todayEarnings || 0).toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Earnings</Text>
            <Text style={[styles.summarySubLabel, { color: FIGMA_COLORS.success }]}>Cleared today</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE" }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="person-outline" size={18} color={FIGMA_COLORS.info} />
            </View>
            <Text style={[styles.summaryVal, { color: FIGMA_COLORS.info }]}>{counts.UPCOMING || 0}</Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
            <Text style={styles.summarySubLabel}>Booked jobs</Text>
          </View>
        </View>

        {/* Upcoming Bookings */}
        <View style={styles.sectionHead}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="sparkles" size={16} color={FIGMA_COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("BookingRequests", { initialTab: "Accepted" })}>
            <Text style={styles.viewAll}>View All {">"}</Text>
          </Pressable>
        </View>

        {upcomingBookings.slice(0, 3).map(b => {
          const cName = b.customer_name || b.client_name || b.user?.name || "Client";
          const cAvatar = resolveImage(b.customer_avatar || b.user?.profile_image);
          const { dateStr, timeStr } = formatBookingDateTime(b);
          const dist = getDistanceText(artist.latitude, artist.longitude, b.latitude, b.longitude);
          const isConfirmed = String(b.status).toUpperCase() === "CONFIRMED" || String(b.status).toUpperCase() === "ACCEPTED";
          
          return (
            <Pressable key={b.id} style={styles.upcomingCard} onPress={() => navigation.navigate("BookingDetails", { bookingId: b.id })}>
              <View style={styles.upcomingCardInner}>
                <Image source={{ uri: cAvatar }} style={styles.upcomingAvatar} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.upcomingTime}>{dateStr} • {timeStr}</Text>
                  <Text style={styles.upcomingName}>{cName}</Text>
                  <Text style={styles.upcomingService}>{b.service?.title || b.service_title || "Mehndi Service"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <Ionicons name="location-outline" size={12} color={FIGMA_COLORS.textMuted} />
                    <Text style={styles.upcomingLocation}>{b.address?.substring(0,20)} {dist ? `• ${dist}` : ""}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
                  <View style={[styles.statusPill, { backgroundColor: isConfirmed ? "#D1FAE5" : "#FEF3C7" }]}>
                    <Text style={[styles.statusPillText, { color: isConfirmed ? "#059669" : "#D97706" }]}>{isConfirmed ? "Confirmed" : "Pending"}</Text>
                  </View>
                  <Text style={styles.upcomingAmount}>₹ {b.final_amount || b.total_amount}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
        {upcomingBookings.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>You have no upcoming bookings.</Text>
            <Pressable style={styles.emptyCardBtn} onPress={() => navigation.navigate("AvailabilityCalendar")}>
              <Text style={styles.emptyCardBtnText}>View Calendar</Text>
            </Pressable>
          </View>
        )}

        {/* Wallet */}
        <Pressable style={styles.walletBanner} onPress={() => navigation.navigate("Wallet")}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.walletIconBox}>
              <Ionicons name="wallet" size={20} color={FIGMA_COLORS.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.walletLabel}>Available Balance</Text>
              <Text style={styles.walletAmount}>₹ {(dashboard?.walletBalance || 0).toLocaleString()}</Text>
            </View>
          </View>
          <Text style={styles.viewAll}>View Wallet {">"}</Text>
        </Pressable>

        {/* Profile Performance */}
        <View style={styles.sectionHead}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="stats-chart" size={16} color={FIGMA_COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Profile Performance</Text>
          </View>
          <Text style={styles.sectionSubRight}>Last 30 Days</Text>
        </View>

        <View style={styles.perfGrid}>
          <Pressable style={styles.perfItem} onPress={() => navigation.navigate("BookingRequests", { initialTab: "Completed" })}>
            <Ionicons name="eye" size={20} color={FIGMA_COLORS.info} />
            <Text style={styles.perfVal}>{dashboard?.totalBookings || 0}</Text>
            <Text style={styles.perfLabel}>Total Jobs</Text>
          </Pressable>
          <Pressable style={styles.perfItem} onPress={() => navigation.navigate("BookingRequests", { initialTab: "Pending" })}>
            <Ionicons name="chatbubbles" size={20} color={FIGMA_COLORS.primary} />
            <Text style={styles.perfVal}>{dashboard?.pendingRequests || 0}</Text>
            <Text style={styles.perfLabel}>Enquiries</Text>
          </Pressable>
          <Pressable style={styles.perfItem} onPress={() => navigation.navigate("Reviews")}>
            <Ionicons name="star" size={20} color={FIGMA_COLORS.warning} />
            <Text style={styles.perfVal}>{artist.avg_rating || "0.0"}</Text>
            <Text style={styles.perfLabel}>Rating</Text>
          </Pressable>
          <Pressable style={[styles.perfItem, { borderRightWidth: 0 }]} onPress={() => navigation.navigate("ArtistProfile")}>
            <Ionicons name="bar-chart" size={20} color={FIGMA_COLORS.teal} />
            <Text style={styles.perfVal}>{artist.verification_status === "APPROVED" ? 100 : 75}%</Text>
            <Text style={styles.perfLabel}>Completion</Text>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHead}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="grid" size={16} color={FIGMA_COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
        </View>
        
        <View style={styles.quickActionsGrid}>
          {[
            { icon: "calendar-outline", label: "Calendar", color: FIGMA_COLORS.primary, nav: "AvailabilityCalendar" },
            { icon: "images-outline", label: "Portfolio", color: FIGMA_COLORS.primary, nav: "Portfolio" },
            { icon: "list-outline", label: "Services", color: FIGMA_COLORS.primary, nav: "Services" },
            { icon: "share-social-outline", label: "Refer & Earn", color: FIGMA_COLORS.primary, nav: "ArtistReferral" }
          ].map((act, i) => (
            <Pressable key={i} style={styles.quickActionBtn} onPress={() => navigation.navigate(act.nav)}>
              <Ionicons name={act.icon} size={24} color={act.color} />
              <Text style={styles.quickActionLabel}>{act.label}</Text>
            </Pressable>
          ))}
        </View>

      </ScrollView>

      {/* Location Modal */}
      <Modal visible={showLocationPrompt} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrapper}>
              <Ionicons name="location" size={40} color={FIGMA_COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>Location Required</Text>
            <Text style={styles.modalDescription}>Please update your location to start receiving booking requests.</Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleUpdateLocation} disabled={fetchingLocation}>
              {fetchingLocation ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalButtonText}>Update Live Location</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => navigation.navigate("EditProfile")} disabled={fetchingLocation}>
              <Text style={styles.modalSecondaryButtonText}>Enter Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FIGMA_COLORS.bgLight },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: FIGMA_COLORS.bgLight },
  
  // App Bar
  appBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: "#FFF" },
  appBarLeft: { flex: 1 },
  logoText: { fontSize: 20, fontWeight: "900", color: FIGMA_COLORS.textDark, letterSpacing: -0.5 },
  logoSubtitle: { fontSize: 10, color: FIGMA_COLORS.textMuted, fontWeight: "600", marginTop: 2 },
  appBarRight: { flexDirection: "row", alignItems: "center" },
  bellBtn: { position: "relative" },
  bellBadge: { position: "absolute", top: -2, right: -4, backgroundColor: FIGMA_COLORS.primary, borderRadius: 10, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "#FFF" },
  bellBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  smallAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3F4F6" },

  // Greeting
  greetingSection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: FIGMA_COLORS.border },
  avatarContainer: { position: "relative" },
  greetingAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F3F4F6" },
  topArtistBadge: { position: "absolute", bottom: -8, alignSelf: "center", backgroundColor: FIGMA_COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: "#FFF" },
  topArtistText: { color: "#FFF", fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  greetingTextCol: { marginLeft: 16 },
  greetingTime: { fontSize: 12, color: FIGMA_COLORS.textMuted, fontWeight: "600" },
  greetingName: { fontSize: 18, fontWeight: "800", color: FIGMA_COLORS.textDark, marginTop: 2 },
  greetingLocation: { fontSize: 11, color: FIGMA_COLORS.textMuted, fontWeight: "500", marginLeft: 4 },
  progressContainer: { alignItems: "center" },
  progressCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: FIGMA_COLORS.teal, justifyContent: "center", alignItems: "center" },
  progressText: { fontSize: 12, fontWeight: "800", color: FIGMA_COLORS.textDark },
  progressLabel: { fontSize: 9, color: FIGMA_COLORS.textMuted, fontWeight: "600", marginTop: 4 },

  // Active Booking Card
  activeCardOuter: { margin: 16, backgroundColor: FIGMA_COLORS.primary, borderRadius: 20, shadowColor: FIGMA_COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  activeCardTop: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activeIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  activeCardTitle: { fontSize: 15, fontWeight: "800", color: "#FFF" },
  liveBadge: { backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  liveBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "700" },
  activeCardSub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },
  activeCardDetails: { color: "#FFF", fontSize: 11, fontWeight: "600" },
  activeCardInner: { backgroundColor: "#FFF", borderBottomLeftRadius: 20, borderBottomRightRadius: 20, padding: 16 },
  activeCardInnerRow: { flexDirection: "row", alignItems: "flex-start" },
  activeInnerAvatar: { width: 50, height: 50, borderRadius: 12, marginRight: 12 },
  activeInnerName: { fontSize: 15, fontWeight: "800", color: FIGMA_COLORS.textDark },
  activeInnerService: { fontSize: 12, color: FIGMA_COLORS.primary, fontWeight: "600", marginTop: 2 },
  activeInnerMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  activeInnerMetaText: { fontSize: 11, color: FIGMA_COLORS.textMuted, marginLeft: 6 },
  activeInnerAmount: { fontSize: 14, fontWeight: "800", color: FIGMA_COLORS.textDark, marginLeft: 6 },
  callBtn: { backgroundColor: FIGMA_COLORS.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  callBtnText: { color: "#FFF", fontSize: 11, fontWeight: "700", marginLeft: 6 },
  
  progressBarWrapper: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, position: "relative" },
  progressNode: { width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center", zIndex: 2 },
  progressNodeActive: { backgroundColor: FIGMA_COLORS.primary },
  progressNodeInactive: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  progressNodeLabel: { fontSize: 9, color: FIGMA_COLORS.textMuted, marginTop: 6, textAlign: "center", maxWidth: 50 },
  progressLine: { position: "absolute", top: 10, right: -50, width: "100%", height: 2, zIndex: 1 },
  progressLineActive: { backgroundColor: FIGMA_COLORS.primary },
  progressLineInactive: { backgroundColor: "#F3F4F6" },

  // New Requests
  requestsBanner: { marginHorizontal: 16, marginBottom: 16, backgroundColor: FIGMA_COLORS.primaryLight, borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#FCE7F3" },
  requestsIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FBCFE8", justifyContent: "center", alignItems: "center" },
  requestsTitle: { fontSize: 14, fontWeight: "800", color: FIGMA_COLORS.textDark },
  requestsBadge: { backgroundColor: FIGMA_COLORS.primary, width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  requestsBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  requestsSub: { fontSize: 11, color: FIGMA_COLORS.textMuted, marginTop: 2 },
  requestsViewAll: { fontSize: 12, fontWeight: "700", color: FIGMA_COLORS.primary },

  // Sections
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: FIGMA_COLORS.textDark },
  sectionSubRight: { fontSize: 12, color: FIGMA_COLORS.textMuted, fontWeight: "600" },
  viewAll: { color: FIGMA_COLORS.primary, fontWeight: "700", fontSize: 12 },

  // Summary Grid
  summaryGrid: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
  summaryBox: { flex: 1, backgroundColor: FIGMA_COLORS.primaryLight, padding: 12, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: "#FCE7F3" },
  summaryIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  summaryVal: { fontSize: 18, fontWeight: "800" },
  summaryLabel: { fontSize: 12, fontWeight: "700", color: FIGMA_COLORS.textDark, marginTop: 4 },
  summarySubLabel: { fontSize: 10, color: FIGMA_COLORS.textMuted, marginTop: 2 },

  // Upcoming Cards
  upcomingCard: { backgroundColor: "#FFF", marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, borderWidth: 1, borderColor: FIGMA_COLORS.border },
  upcomingCardInner: { flexDirection: "row", alignItems: "center" },
  upcomingAvatar: { width: 56, height: 56, borderRadius: 14 },
  upcomingTime: { fontSize: 11, fontWeight: "700", color: FIGMA_COLORS.textDark },
  upcomingName: { fontSize: 15, fontWeight: "800", color: FIGMA_COLORS.textDark, marginTop: 2 },
  upcomingService: { fontSize: 12, color: FIGMA_COLORS.textMuted, marginTop: 2 },
  upcomingLocation: { fontSize: 11, color: FIGMA_COLORS.textMuted, marginLeft: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  upcomingAmount: { fontSize: 14, fontWeight: "800", color: FIGMA_COLORS.textDark, marginTop: 8 },
  emptyCard: { backgroundColor: "#FFF", marginHorizontal: 16, padding: 24, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: FIGMA_COLORS.border },
  emptyCardText: { fontSize: 13, color: FIGMA_COLORS.textMuted, fontWeight: "500", marginBottom: 12 },
  emptyCardBtn: { backgroundColor: FIGMA_COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  emptyCardBtnText: { color: "#FFF", fontSize: 12, fontWeight: "700" },

  // Wallet
  walletBanner: { marginHorizontal: 16, marginTop: 12, backgroundColor: "#FFF", borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, borderWidth: 1, borderColor: FIGMA_COLORS.border },
  walletIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: FIGMA_COLORS.primary, justifyContent: "center", alignItems: "center" },
  walletLabel: { fontSize: 12, color: FIGMA_COLORS.textMuted, fontWeight: "600" },
  walletAmount: { fontSize: 20, fontWeight: "900", color: FIGMA_COLORS.textDark, marginTop: 2 },

  // Performance
  perfGrid: { flexDirection: "row", backgroundColor: "#FFF", marginHorizontal: 16, borderRadius: 16, paddingVertical: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, borderWidth: 1, borderColor: FIGMA_COLORS.border },
  perfItem: { flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: FIGMA_COLORS.border },
  perfVal: { fontSize: 16, fontWeight: "800", color: FIGMA_COLORS.textDark, marginTop: 8 },
  perfLabel: { fontSize: 10, color: FIGMA_COLORS.textMuted, fontWeight: "600", marginTop: 4 },

  // Quick Actions
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 12 },
  quickActionBtn: { width: "22%", backgroundColor: "#FFF", borderRadius: 16, padding: 12, alignItems: "center", marginHorizontal: "1.5%", marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1, borderWidth: 1, borderColor: FIGMA_COLORS.border },
  quickActionLabel: { fontSize: 10, fontWeight: "600", color: FIGMA_COLORS.textDark, marginTop: 8, textAlign: "center" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 20, padding: 24, width: "100%", alignItems: "center" },
  modalIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: FIGMA_COLORS.primaryLight, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: FIGMA_COLORS.textDark, marginBottom: 10, textAlign: "center" },
  modalDescription: { fontSize: 14, color: FIGMA_COLORS.textMuted, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  modalButton: { backgroundColor: FIGMA_COLORS.primary, width: "100%", height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  modalButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  modalSecondaryButton: { width: "100%", height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: FIGMA_COLORS.border },
  modalSecondaryButtonText: { color: FIGMA_COLORS.textDark, fontSize: 16, fontWeight: "600" }
});
