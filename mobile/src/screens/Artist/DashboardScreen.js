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
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useNotifications } from "../../context/NotificationContext";
import { getArtistDashboardData } from "../../services/artist";
import { confirmCashPayment, rejectCashPayment, acceptBooking, rejectBooking } from "../../services/booking";
import Alert from "../../utils/Alert";

// --- Greeting Header Component ---
function GreetingHeader({ artist, isVerified, unreadCount, onProfilePress, onNotificationPress }) {
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good Morning 👋";
    if (hrs < 17) return "Good Afternoon 👋";
    return "Good Evening 👋";
  };

  const getProfileCompletion = () => {
    if (isVerified) return 100;
    if (artist.experience_years) return 75;
    return 50;
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerProfileRow}>
        <Pressable onPress={onProfilePress} style={styles.avatarWrapper}>
          <Image
            source={{ uri: artist.profile_image || "https://picsum.photos/200" }}
            style={styles.avatarImage}
          />
          {isVerified && (
            <View style={styles.verifiedMiniBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.white} />
            </View>
          )}
        </Pressable>
        <View style={styles.headerTextCol}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={styles.artistNameText}>{artist.name || "Sonu Ma'am"}</Text>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: isVerified ? "#E6F4EA" : "#FEF3C7" }]}>
              <Text style={[styles.statusBadgeText, { color: isVerified ? Colors.success : Colors.warning }]}>
                {isVerified ? "Approved Professional" : artist.verification_status || "PENDING"}
              </Text>
            </View>
            <Text style={styles.completionPercentage}>
              Completion: {getProfileCompletion()}%
            </Text>
          </View>
        </View>
      </View>
      <Pressable onPress={onNotificationPress} style={styles.bellBtn}>
        <Ionicons name="notifications-outline" size={24} color={Colors.text} />
        {unreadCount > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// --- Wallet Card Component ---
function WalletCard({ balance, onWithdrawPress, onCardPress }) {
  return (
    <Pressable onPress={onCardPress}>
      <View style={styles.walletCardBackground}>
        <View style={styles.walletHeader}>
          <View style={styles.walletTitleRow}>
            <Ionicons name="wallet" size={20} color={Colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.walletLabel}>Available Wallet Balance</Text>
          </View>
          <Text style={styles.walletSecureText}>Safe & Secure Payouts</Text>
        </View>
        <View style={styles.walletBody}>
          <Text style={styles.walletBalance}>₹{balance.toLocaleString()}</Text>
          <Pressable onPress={onWithdrawPress} style={styles.walletBtn}>
            <Ionicons name="arrow-up-circle-outline" size={16} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.walletBtnText}>Withdraw</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// --- Animated Dashboard Card Component ---
function DashboardCard({ count, title, description, iconName, accentColor, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 4,
      tension: 50
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 50
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.cardOuter]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ color: "rgba(0,0,0,0.05)" }}
        style={[styles.cardContainer, { borderLeftColor: accentColor || Colors.primary }]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.cardIconBox, { backgroundColor: `${accentColor || Colors.primary}12` }]}>
            <Ionicons name={iconName} size={20} color={accentColor || Colors.primary} />
          </View>
          <Text style={styles.cardCount}>{count}</Text>
        </View>
        <View style={styles.cardInfoCol}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{description}</Text>
        </View>
        <View style={styles.cardFooterRow}>
          <Text style={[styles.viewDetailsText, { color: accentColor || Colors.primary }]}>View Details</Text>
          <Ionicons name="chevron-forward-outline" size={14} color={accentColor || Colors.primary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// --- Main Screen ---
export default function ArtistDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { unreadCount } = useNotifications();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardDetails = React.useCallback(async () => {
    try {
      const data = await getArtistDashboardData();
      setDashboard(data);
    } catch (err) {
      console.log("Failed to load artist dashboard details:", err.message);
      // Fallback
      setDashboard({
        artist: {
          name: user?.name || "Sonu Ma'am",
          profile_image: user?.profile_image || "https://picsum.photos/200",
          verification_status: "APPROVED",
          avg_rating: "4.8",
          total_reviews: 24,
          experience_years: 5
        },
        todayBookings: 2,
        todayEarnings: 4500,
        pendingRequests: 3,
        walletBalance: 12500,
        bookingCounts: {
          PENDING: 3,
          UPCOMING: 4,
          ACCEPTED: 5,
          ONGOING: 1,
          COMPLETED: 18,
          AWAITING_SETTLEMENT: 2,
          PENDING_CASH_APPROVAL: 1,
          CANCELLED: 2
        },
        recentBookings: [
          { id: 1, booking_code: "BK-591602", user: { name: "Ananya Sharma" }, service: { specialization_name: "Bridal Traditional Mehndi" }, booking_status: "CONFIRMED", total_price: 3500, final_amount: 3500, createdAt: new Date().toISOString() },
          { id: 2, booking_code: "BK-302198", user: { name: "Ritika Patel" }, service: { specialization_name: "Arabic Intricate Mehndi" }, booking_status: "PENDING", total_price: 1500, final_amount: 1500, createdAt: new Date().toISOString() }
        ]
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      const handleBookingUpdate = () => {
        fetchDashboardDetails();
      };
      socket.on("booking_created", handleBookingUpdate);
      socket.on("new_notification", handleBookingUpdate);
      return () => {
        socket.off("booking_created", handleBookingUpdate);
        socket.off("new_notification", handleBookingUpdate);
      };
    }
  }, [socket]);

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardDetails();
    }, [fetchDashboardDetails])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardDetails();
  };

  const resolveImage = (uri) => {
    const placeholder = "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300";
    if (!uri) return placeholder;
    if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://") || uri.startsWith("content://")) {
      return uri;
    }
    const cleanUri = uri.startsWith("/") ? uri : `/${uri}`;
    const { SOCKET_URL } = require("../../services/api");
    if (!SOCKET_URL) return placeholder;
    const finalUrl = `${SOCKET_URL}${cleanUri}`;
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      return placeholder;
    }
    return finalUrl;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const artist = dashboard?.artist || {};
  const isVerified = artist.verification_status === "APPROVED";
  const counts = dashboard?.bookingCounts || {};

  // Quick Management Actions
  const quickActions = [
    { icon: "calendar-outline", label: "My Bookings", screen: "BookingRequests" },
    { icon: "wallet-outline", label: "Wallet Ledger", screen: "Wallet" },
    { icon: "calendar-number-outline", label: "Availability", screen: "AvailabilityCalendar" },
    { icon: "list-outline", label: "Services", screen: "Services" },
    { icon: "images-outline", label: "Portfolio", screen: "Portfolio" },
    { icon: "star-outline", label: "Reviews", screen: "Reviews" },
    { icon: "notifications-outline", label: "Alerts", screen: "Notifications" }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Greeting Header Component */}
      <GreetingHeader
        artist={{
          ...artist,
          profile_image: resolveImage(artist.profile_image)
        }}
        isVerified={isVerified}
        unreadCount={unreadCount}
        onProfilePress={() => navigation.navigate("Profile")}
        onNotificationPress={() => navigation.navigate("Notifications")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
      >
        {/* 2. Wallet Card Component */}
        <WalletCard
          balance={dashboard?.walletBalance || 0}
          onWithdrawPress={() => navigation.navigate("Wallet", { initialTab: "Withdraw" })}
          onCardPress={() => navigation.navigate("Wallet", { initialTab: "Withdraw" })}
        />

        {/* 3. Core Stats Widgets */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          <DashboardCard
            count={dashboard?.todayBookings || 0}
            title="Today's Jobs"
            description="Active jobs scheduled for today"
            iconName="calendar-outline"
            accentColor={Colors.primary}
            onPress={() => navigation.navigate("BookingRequests", { initialTab: "Accepted", filterToday: true })}
          />
          <DashboardCard
            count={`₹${(dashboard?.todayEarnings || 0).toLocaleString()}`}
            title="Today's Payout"
            description="Earnings cleared today"
            iconName="cash-outline"
            accentColor={Colors.success}
            onPress={() => navigation.navigate("Wallet", { initialTab: "Transactions" })}
          />
          <DashboardCard
            count={dashboard?.pendingRequests || 0}
            title="New Requests"
            description="Leads awaiting response"
            iconName="people-outline"
            accentColor={Colors.warning}
            onPress={() => navigation.navigate("Leads", { initialTab: "New Lead" })}
          />
          <DashboardCard
            count={artist.avg_rating ? Number(artist.avg_rating).toFixed(1) : "0.0"}
            title="Average Rating"
            description="Your customer rating"
            iconName="star-outline"
            accentColor={Colors.info}
            onPress={() => navigation.navigate("Reviews")}
          />
        </View>

        {/* 4. Booking Performance Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Booking Performance</Text>
        </View>
        <View style={styles.statsGrid}>
          <DashboardCard
            count={counts.PENDING || 0}
            title="Pending Requests"
            description="Awaiting confirmation"
            iconName="hourglass-outline"
            accentColor={Colors.warning}
            onPress={() => navigation.navigate("BookingRequests", { initialTab: "Pending" })}
          />
          <DashboardCard
            count={counts.UPCOMING || 0}
            title="Upcoming Bookings"
            description="Booked jobs in queue"
            iconName="calendar-number-outline"
            accentColor={Colors.info}
            onPress={() => navigation.navigate("BookingRequests", { initialTab: "Accepted" })}
          />
          <DashboardCard
            count={counts.ACCEPTED || 0}
            title="Accepted Bookings"
            description="Confirmed artist bookings"
            iconName="checkbox-outline"
            accentColor={Colors.success}
            onPress={() => navigation.navigate("BookingRequests", { initialTab: "Accepted" })}
          />
          <DashboardCard
            count={counts.ONGOING || 0}
            title="Ongoing Bookings"
            description="Services currently active"
            iconName="play-circle-outline"
            accentColor={Colors.primary}
            onPress={() => navigation.navigate("BookingRequests", { initialTab: "Accepted" })}
          />
          <DashboardCard
            count={counts.COMPLETED || 0}
            title="Completed Bookings"
            description="Total finished jobs"
            iconName="checkmark-done-circle-outline"
            accentColor="#10B981"
            onPress={() => navigation.navigate("BookingRequests", { initialTab: "Completed" })}
          />
          <DashboardCard
            count={counts.AWAITING_SETTLEMENT || 0}
            title="Awaiting Settlement"
            description="Settlements currently pending"
            iconName="logo-usd"
            accentColor="#EF4444"
            onPress={() => navigation.navigate("Wallet", { initialTab: "Withdraw" })}
          />
          <DashboardCard
            count={counts.PENDING_CASH_APPROVAL || 0}
            title="Pending Cash Confirm"
            description="Cash payments awaiting approval"
            iconName="card-outline"
            accentColor="#F59E0B"
            onPress={() => navigation.navigate("BookingRequests", { initialTab: "Accepted" })}
          />
          <DashboardCard
            count={counts.CANCELLED || 0}
            title="Cancelled Bookings"
            description="Total cancelled jobs"
            iconName="close-circle-outline"
            accentColor="#6B7280"
            onPress={() => navigation.navigate("BookingRequests", { initialTab: "Completed" })}
          />
        </View>

        {/* 5. Quick Actions segment */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Management Control</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
          {quickActions.map((action, index) => (
            <Pressable
              key={index}
              style={styles.actionChip}
              onPress={() => navigation.navigate(action.screen)}
            >
              <Ionicons name={action.icon} size={16} color={Colors.primary} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 6. Active Actions (Pending Bookings) */}
        {dashboard?.recentBookings?.filter(b => b.booking_status === "PENDING" || (b.booking_status === "CONFIRMED" && b.detailed_status === "CONFIRMED")).length > 0 && (
          <View style={styles.cashSection}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={styles.sectionTitle}>New Pending Bookings</Text>
              <Pressable onPress={() => navigation.navigate("BookingRequests", { initialTab: "Pending" })}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
            {dashboard.recentBookings.filter(b => b.booking_status === "PENDING" || (b.booking_status === "CONFIRMED" && b.detailed_status === "CONFIRMED")).slice(0, 3).map((item) => {
              const slotDate = item.slot?.start_time ? new Date(item.slot.start_time).toLocaleDateString() : (item.reschedule_date || "TBD");
              const slotTime = item.slot ? `${new Date(item.slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(item.slot.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : (item.reschedule_time || "TBD");

              return (
                <View key={item.id} style={styles.cashConfirmCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <Image
                      source={{ uri: item.user?.profile_image || "https://picsum.photos/200" }}
                      style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cashCustomer}>{item.user?.name || "Client"}</Text>
                      <Text style={styles.cashService}>{item.service?.specialization_name || "Mehndi Design"}</Text>
                    </View>
                  </View>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.metaLabel}>Booking ID:</Text>
                    <Text style={styles.metaValue}>#{item.booking_code}</Text>
                  </View>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.metaLabel}>Date & Time:</Text>
                    <Text style={styles.metaValue}>{slotDate} • {slotTime}</Text>
                  </View>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.metaLabel}>Amount:</Text>
                    <Text style={[styles.metaValue, { fontWeight: "800", color: Colors.primary }]}>₹{item.final_amount}</Text>
                  </View>

                  <View style={styles.cashActionsRow}>
                    <Pressable
                      style={[styles.cashBtn, { backgroundColor: Colors.success }]}
                      onPress={async () => {
                        try {
                          setLoading(true);
                          await acceptBooking(item.id);
                          Alert.alert("Success", "Booking request accepted successfully!");
                          fetchDashboardDetails();
                        } catch (err) {
                          Alert.alert("Error", err.message || "Failed to accept booking.");
                          setLoading(true);
                          fetchDashboardDetails();
                        }
                      }}
                    >
                      <Text style={styles.cashBtnText}>Accept</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.cashBtn, { backgroundColor: Colors.error }]}
                      onPress={() => {
                        Alert.alert(
                          "Decline Booking",
                          "Are you sure you want to decline this booking request?",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Decline",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  setLoading(true);
                                  await rejectBooking(item.id, "Declined by artist");
                                  Alert.alert("Declined", "Booking request declined.");
                                  fetchDashboardDetails();
                                } catch (err) {
                                  Alert.alert("Error", err.message || "Failed to decline booking.");
                                  setLoading(true);
                                  fetchDashboardDetails();
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.cashBtnText}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 7. Active Actions (Pending Cash Confirmations) */}
        {dashboard?.recentBookings?.filter(b => b.detailed_status === "AWAITING_CASH_CONFIRMATION" || b.booking_status === "AWAITING_CASH_CONFIRMATION").length > 0 && (
          <View style={styles.cashSection}>
            <Text style={styles.sectionTitle}>Pending Cash Confirmations</Text>
            {dashboard.recentBookings.filter(b => b.detailed_status === "AWAITING_CASH_CONFIRMATION" || b.booking_status === "AWAITING_CASH_CONFIRMATION").map((item) => (
              <View key={item.id} style={styles.cashConfirmCard}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                  <View style={[styles.cardIconBox, { backgroundColor: "#FFF0F4", marginRight: 12 }]}>
                    <Ionicons name="card" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cashCustomer}>{item.user?.name || "Client"}</Text>
                    <Text style={styles.cashService}>Awaiting cash settlement approval</Text>
                  </View>
                </View>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.metaLabel}>Booking ID:</Text>
                  <Text style={styles.metaValue}>#{item.booking_code}</Text>
                </View>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.metaLabel}>Cash Amount:</Text>
                  <Text style={[styles.metaValue, { fontWeight: "800", color: Colors.primary }]}>₹{item.final_amount}</Text>
                </View>

                <View style={styles.cashActionsRow}>
                  <Pressable
                    style={[styles.cashBtn, { backgroundColor: Colors.success }]}
                    onPress={async () => {
                      try {
                        setLoading(true);
                        await confirmCashPayment(item.id);
                        Alert.alert("Success", "Cash payment approved successfully!");
                        fetchDashboardDetails();
                      } catch (err) {
                        Alert.alert("Error", err.message);
                        setLoading(true);
                        fetchDashboardDetails();
                      }
                    }}
                  >
                    <Text style={styles.cashBtnText}>Approve Payment</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.cashBtn, { backgroundColor: Colors.error }]}
                    onPress={async () => {
                      try {
                        setLoading(true);
                        await rejectCashPayment(item.id);
                        Alert.alert("Success", "Cash payment rejected.");
                        fetchDashboardDetails();
                      } catch (err) {
                        Alert.alert("Error", err.message);
                        setLoading(true);
                        fetchDashboardDetails();
                      }
                    }}
                  >
                    <Text style={styles.cashBtnText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 8. Recent Bookings List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Booking Jobs</Text>
          <Pressable onPress={() => navigation.navigate("BookingRequests")}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        {dashboard?.recentBookings?.slice(0, 3).map((item) => (
          <Pressable
            key={item.id}
            style={styles.bookingCard}
            onPress={() => navigation.navigate("BookingDetails", { bookingId: item.id })}
          >
            <View style={styles.bookingLeft}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.bookingInfo}>
                <Text style={styles.customerName}>{item.user?.name || "Client Name"}</Text>
                <Text style={styles.serviceName}>{item.service?.specialization_name || "Mehndi Booking"}</Text>
                <Text style={styles.bookingDate}>
                  Status: {item.booking_status} • Value: ₹{item.total_price}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </Pressable>
        ))}

        {(!dashboard?.recentBookings || dashboard.recentBookings.length === 0) && (
          <Text style={styles.emptyText}>No booking details mapped.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  
  // Greeting Header Styles
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4
  },
  headerProfileRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarWrapper: { position: "relative" },
  avatarImage: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border },
  verifiedMiniBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: Colors.success,
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.white
  },
  headerTextCol: { marginLeft: 12, flex: 1 },
  greetingText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  artistNameText: { fontSize: 18, fontWeight: "800", color: Colors.text },
  statusBadgeRow: { flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  completionPercentage: { fontSize: 10, color: Colors.textTertiary, fontWeight: "600" },
  bellBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  bellBadge: { position: "absolute", top: 8, right: 8, backgroundColor: Colors.primary, borderRadius: 8, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center", paddingHorizontal: 2 },
  bellBadgeText: { color: Colors.white, fontSize: 9, fontWeight: "800" },

  // Wallet Card Styles
  walletCardBackground: {
    margin: 20,
    backgroundColor: "#7D1538",
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8
  },
  walletHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.15)", paddingBottom: 12 },
  walletTitleRow: { flexDirection: "row", alignItems: "center" },
  walletLabel: { fontSize: 12, color: Colors.white, opacity: 0.8 },
  walletSecureText: { fontSize: 9, color: Colors.white, opacity: 0.6, fontWeight: "600" },
  walletBody: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  walletBalance: { fontSize: 32, fontWeight: "800", color: Colors.white },
  walletBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, elevation: 1 },
  walletBtnText: { color: Colors.primary, fontWeight: "800", fontSize: 13 },

  // Section Styles
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: Colors.text, marginVertical: 8 },
  viewAll: { color: Colors.primary, fontWeight: "800", fontSize: 13 },

  // Stats Grid Styles
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 4 },
  cardOuter: { width: "48%", marginBottom: 16, borderRadius: 16, backgroundColor: Colors.white, elevation: 2, shadowColor: Colors.shadow, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  cardContainer: { padding: 14, borderRadius: 16, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border, height: 135, justifyContent: "space-between" },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cardCount: { fontSize: 20, fontWeight: "800", color: Colors.text },
  cardInfoCol: { flex: 1, justifyContent: "center", marginTop: 6 },
  cardTitle: { fontSize: 12, fontWeight: "700", color: Colors.text },
  cardDesc: { fontSize: 9, color: Colors.textSecondary, marginTop: 2, lineHeight: 12 },
  cardFooterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 6, marginTop: 4 },
  viewDetailsText: { fontSize: 9, fontWeight: "800" },

  // Quick Actions Styles
  actionsRow: { paddingLeft: 20, paddingBottom: 16 },
  actionChip: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginRight: 12, elevation: 1 },
  actionLabel: { fontSize: 12, fontWeight: "700", color: Colors.text, marginLeft: 8 },

  // Booking Card Styles
  bookingCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.white, marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  bookingLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center" },
  bookingInfo: { marginLeft: 12, flex: 1 },
  customerName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  serviceName: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  bookingDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 4 },
  emptyText: { fontSize: 12, color: Colors.textSecondary, textAlign: "center", marginVertical: 32 },

  // Cash Section Card Styles
  cashSection: { paddingHorizontal: 20, marginVertical: 10 },
  cashConfirmCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border, elevation: 2 },
  cashCustomer: { fontSize: 15, fontWeight: "800", color: Colors.text },
  cashService: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  itemMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  metaLabel: { fontSize: 12, color: Colors.textSecondary },
  metaValue: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  cashActionsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  cashBtn: { flex: 1, height: 42, borderRadius: 10, justifyContent: "center", alignItems: "center", marginHorizontal: 4 },
  cashBtnText: { color: Colors.white, fontWeight: "800", fontSize: 12 }
});
