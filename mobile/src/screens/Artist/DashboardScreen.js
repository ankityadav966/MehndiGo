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
import OptimizedImage from "../../components/OptimizedImage";

function formatBookingDateTime(item) {
  if (!item) return { dateStr: "Today", timeStr: "Flexible" };

  let dateStr = "";
  const rawDate =
    item.booking_date ||
    item.date ||
    item.bookingDate ||
    item.event_date ||
    item.slot?.date ||
    item.reschedule_date ||
    item.created_at ||
    item.createdAt;

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
            if (!isNaN(parsed.getTime())) {
              dateStr = parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            } else {
              dateStr = rawStr;
            }
          } else {
            dateStr = rawStr;
          }
        }
      } catch {
        dateStr = rawStr;
      }
    }
  }

  if (!dateStr || dateStr.toLowerCase().includes("invalid")) {
    if (item.created_at || item.createdAt) {
      try {
        const cd = new Date(item.created_at || item.createdAt);
        if (!isNaN(cd.getTime())) {
          dateStr = cd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        }
      } catch (_) {}
    }
    if (!dateStr || dateStr.toLowerCase().includes("invalid")) {
      dateStr = "Today";
    }
  }

  let timeStr =
    item.booking_time ||
    item.time ||
    item.bookingTime ||
    item.slot_time ||
    item.reschedule_time ||
    item.slot?.slot_window ||
    "";

  if (!timeStr && item.slot) {
    if (typeof item.slot.start_time === "string") {
      const st = item.slot.start_time;
      const et = item.slot.end_time;
      timeStr = et ? `${st} - ${et}` : st;
    }
  }

  if (!timeStr || timeStr.toLowerCase().includes("invalid")) {
    timeStr = "Flexible / Scheduled Slot";
  }

  return { dateStr, timeStr };
}

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
          <OptimizedImage
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
          <Text style={styles.artistNameText}>{artist.full_name || artist.name || "Specialist Artist"}</Text>
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
function WalletCard({ balance, cashCollected, onWithdrawPress, onCardPress, onCashPress }) {
  return (
    <View style={styles.walletCardBackground}>
      <Pressable onPress={onCardPress}>
        <View style={styles.walletHeader}>
          <View style={styles.walletTitleRow}>
            <View style={styles.walletBadgeIcon}>
              <Ionicons name="card-outline" size={15} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.walletLabel}>Online Withdrawable Balance</Text>
              <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", fontWeight: "600" }}>Online Payments Only</Text>
            </View>
          </View>
          <Text style={styles.walletSecureText}>Safe & Secure Payouts</Text>
        </View>
        <View style={styles.walletBody}>
          <View>
            <Text style={styles.walletBalance}>₹{Number(balance || 0).toLocaleString("en-IN")}</Text>
            <Text style={styles.walletSubText}>Actual Withdrawable Balance</Text>
          </View>
          <Pressable onPress={onWithdrawPress} style={styles.walletBtn}>
            <Ionicons name="arrow-up-circle" size={15} color="#9C1344" style={{ marginRight: 4 }} />
            <Text style={styles.walletBtnText}>Withdraw</Text>
          </Pressable>
        </View>
      </Pressable>

      {/* Dedicated Cash Entries / Cash Collected Row */}
      <Pressable
        onPress={onCashPress || onCardPress}
        style={styles.walletCashBanner}
      >
        <View style={styles.walletCashLeft}>
          <View style={styles.walletCashIconWrap}>
            <Ionicons name="cash-outline" size={15} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.walletCashTitle}>Cash Collected (In-Hand)</Text>
            <Text style={styles.walletCashSubtitle}>Direct Payout • Excluded from Wallet</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.walletCashAmount}>₹{Number(cashCollected || 0).toLocaleString("en-IN")}</Text>
          <Text style={styles.walletCashViewText}>View Entries →</Text>
        </View>
      </Pressable>
    </View>
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

let memoryCachedArtistDashboard = { userId: null, data: null };

export function clearArtistDashboardMemoryCache() {
  memoryCachedArtistDashboard = { userId: null, data: null };
}

// --- Main Screen ---
export default function ArtistDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { unreadCount } = useNotifications();

  if (__DEV__) console.log(`[ARTIST_APPROVAL_DEBUG] CURRENT_ROUTE: ArtistDashboardScreen | USER_ID: ${user?.id} | ROLE: ${user?.role}`);

  const isCacheForCurrentUser = Boolean(user?.id && memoryCachedArtistDashboard.userId === user?.id && memoryCachedArtistDashboard.data);

  const [dashboard, setDashboard] = useState(() => isCacheForCurrentUser ? memoryCachedArtistDashboard.data : null);
  const [loading, setLoading] = useState(() => !isCacheForCurrentUser);
  const [refreshing, setRefreshing] = useState(false);

  // Reset state whenever user ID changes (account switch / new login)
  useEffect(() => {
    if (user?.id && memoryCachedArtistDashboard.userId !== user.id) {
      setDashboard(null);
      setLoading(true);
      fetchDashboardDetails();
    }
  }, [user?.id]);

  // Root level back handler with double-back-to-exit prevention
  useFocusEffect(
    React.useCallback(() => {
      const { BackHandler } = require("react-native");
      const { handleRootDoubleBackExit } = require("../../utils/navigationHelper");

      const onBackPress = () => {
        return handleRootDoubleBackExit("Press back again to exit MehndiGo Artist");
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [])
  );

  const fetchDashboardDetails = React.useCallback(async () => {
    try {
      const data = await getArtistDashboardData();
      if (data && user?.id) {
        memoryCachedArtistDashboard = { userId: user.id, data };
        setDashboard(data);
      }
    } catch (err) {
      console.log("Failed to load artist dashboard details:", err.message);
      if (!isCacheForCurrentUser) {
        if (!err.message?.includes("complete your onboarding")) {
          Alert.alert("Error", "Something went wrong loading your dashboard. Please retry.");
        }
        setDashboard(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isCacheForCurrentUser]);

  useEffect(() => {
    if (socket) {
      const handleBookingUpdate = () => {
        fetchDashboardDetails();
      };
      socket.on("BOOKING_CREATED", handleBookingUpdate);
      socket.on("NEW_BOOKING_REQUEST", handleBookingUpdate);
      socket.on("BOOKING_UPDATED", handleBookingUpdate);
      socket.on("PAYMENT_RECEIVED", handleBookingUpdate);
      socket.on("booking_created", handleBookingUpdate);
      socket.on("new_notification", handleBookingUpdate);
      return () => {
        socket.off("BOOKING_CREATED", handleBookingUpdate);
        socket.off("NEW_BOOKING_REQUEST", handleBookingUpdate);
        socket.off("BOOKING_UPDATED", handleBookingUpdate);
        socket.off("PAYMENT_RECEIVED", handleBookingUpdate);
        socket.off("booking_created", handleBookingUpdate);
        socket.off("new_notification", handleBookingUpdate);
      };
    }
  }, [socket, fetchDashboardDetails]);

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
    { icon: "cash-outline", label: "Cash Entries", screen: "Wallet", params: { initialTab: "Cash" } },
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
          profile_image: resolveImage(artist.profile_image || artist.avatar || user?.profile_image || user?.avatar)
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
          cashCollected={dashboard?.cashEarnings || dashboard?.totalCash || dashboard?.cashCollected || 0}
          onWithdrawPress={() => navigation.navigate("Wallet", { initialTab: "Withdraw", balance: dashboard?.walletBalance })}
          onCardPress={() => navigation.navigate("Wallet", { initialTab: "Transactions", balance: dashboard?.walletBalance })}
          onCashPress={() => navigation.navigate("Wallet", { initialTab: "Cash", balance: dashboard?.walletBalance })}
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
            onPress={() => navigation.navigate("Wallet", { initialTab: "Transactions", balance: dashboard?.walletBalance })}
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
            onPress={() => navigation.navigate("Wallet", { initialTab: "Transactions", balance: dashboard?.walletBalance })}
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
              onPress={() => navigation.navigate(action.screen, action.params)}
            >
              <Ionicons name={action.icon} size={16} color={Colors.primary} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 6. Active Actions (Pending Bookings) */}
        {dashboard?.recentBookings?.filter(b => {
          const st = String(b.booking_status || b.status || "").toUpperCase();
          const det = String(b.detailed_status || b.detailedStatus || "").toUpperCase();
          const pStatus = String(b.payment_status || "").toUpperCase();
          const pMode = String(b.payment_mode || "").toUpperCase();
          const advance = Number(b.advance_paid || 0);

          const isCash = pMode === "CASH";
          const isPaidAdvance = advance > 0 || pStatus === "PAID" || pStatus === "PARTIAL" || pStatus === "ADVANCE_PAID";
          const isUnpaidOnlineDraft = det === "PENDING_PAYMENT" || (!isCash && pStatus === "PENDING" && advance <= 0);

          if (isUnpaidOnlineDraft) return false;
          if (!isCash && !isPaidAdvance) return false;

          const isAccepted = st === "ACCEPTED" || st === "CONFIRMED" || det === "ARTIST_ACCEPTED" || det === "ACCEPTED" || det === "CONFIRMED" || det === "ARTIST_ON_THE_WAY" || det === "ARTIST_ARRIVED" || det === "SERVICE_STARTED" || det === "IN_PROGRESS";
          const isCancelled = st === "CANCELLED" || st === "REJECTED" || st === "DECLINED" || det === "CANCELLED" || det === "REJECTED" || det === "DECLINED";
          const isCompleted = st === "COMPLETED" || det === "COMPLETED";

          return !isAccepted && !isCancelled && !isCompleted;
        }).length > 0 && (
          <View style={styles.cashSection}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={styles.sectionTitle}>New Pending Bookings</Text>
              <Pressable onPress={() => navigation.navigate("BookingRequests", { initialTab: "Pending" })}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
            {dashboard.recentBookings.filter(b => {
              const st = String(b.booking_status || b.status || "").toUpperCase();
              const det = String(b.detailed_status || b.detailedStatus || "").toUpperCase();
              const pStatus = String(b.payment_status || "").toUpperCase();
              const pMode = String(b.payment_mode || "").toUpperCase();
              const advance = Number(b.advance_paid || 0);

              const isCash = pMode === "CASH";
              const isPaidAdvance = advance > 0 || pStatus === "PAID" || pStatus === "PARTIAL" || pStatus === "ADVANCE_PAID";
              const isUnpaidOnlineDraft = det === "PENDING_PAYMENT" || (!isCash && pStatus === "PENDING" && advance <= 0);

              if (isUnpaidOnlineDraft) return false;
              if (!isCash && !isPaidAdvance) return false;

              const isAccepted = st === "ACCEPTED" || st === "CONFIRMED" || det === "ARTIST_ACCEPTED" || det === "ACCEPTED" || det === "CONFIRMED" || det === "ARTIST_ON_THE_WAY" || det === "ARTIST_ARRIVED" || det === "SERVICE_STARTED" || det === "IN_PROGRESS";
              const isCancelled = st === "CANCELLED" || st === "REJECTED" || st === "DECLINED" || det === "CANCELLED" || det === "REJECTED" || det === "DECLINED";
              const isCompleted = st === "COMPLETED" || det === "COMPLETED";

              return !isAccepted && !isCancelled && !isCompleted;
            }).slice(0, 3).map((item) => {
              const { dateStr, timeStr } = formatBookingDateTime(item);

              return (
                <View key={item.id} style={styles.cashConfirmCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <Image
                      source={{ uri: item.customer_avatar || item.user?.profile_image || item.customer?.profile_image || "https://picsum.photos/200" }}
                      style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cashCustomer}>{item.customer_name || item.client_name || item.user?.name || item.customer?.name || "Client"}</Text>
                      <Text style={styles.cashService}>{item.service?.specialization_name || item.service_title || "Mehndi Design"}</Text>
                    </View>
                  </View>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.metaLabel}>Booking ID:</Text>
                    <Text style={styles.metaValue}>#{item.booking_code || item.booking_number || item.id}</Text>
                  </View>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.metaLabel}>Date & Time:</Text>
                    <Text style={[styles.metaValue, { fontWeight: "700", color: "#1F2937" }]}>{dateStr} • {timeStr}</Text>
                  </View>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.metaLabel}>Amount:</Text>
                    <Text style={[styles.metaValue, { fontWeight: "800", color: Colors.primary }]}>₹{item.final_amount || item.total_amount || 0}</Text>
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

        {/* 8. Recent Bookings List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Booking Jobs</Text>
          <Pressable onPress={() => navigation.navigate("BookingRequests")}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        {dashboard?.recentBookings?.slice(0, 5).map((item) => {
          const customerName = item.user?.name || item.customer_name || item.client_name || item.customer?.name || "Client";
          const customerPhone = item.user?.phone || item.customer_phone || "";
          const customerAvatar = resolveImage(item.user?.profile_image || item.customer_avatar || item.customer?.profile_image);
          const { dateStr, timeStr } = formatBookingDateTime(item);
          
          return (
            <Pressable
              key={item.id}
              style={styles.bookingCard}
              onPress={() => navigation.navigate("BookingDetails", { bookingId: item.id })}
            >
              <View style={styles.bookingLeft}>
                <Image
                  source={{ uri: customerAvatar }}
                  style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: Colors.border }}
                />
                <View style={styles.bookingInfo}>
                  <Text style={styles.customerName}>{customerName}</Text>
                  {customerPhone ? (
                    <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: "600", marginTop: 1 }}>
                      📞 {customerPhone}
                    </Text>
                  ) : null}
                  <Text style={styles.serviceName}>{item.service?.specialization_name || item.service_title || "Mehndi Booking"}</Text>
                  <Text style={[styles.bookingDate, { color: "#374151", fontWeight: "600" }]}>
                    📅 {dateStr} • ⏰ {timeStr}
                  </Text>
                  <Text style={styles.bookingDate}>
                    Status: {item.detailed_status || item.booking_status} • Value: ₹{item.final_amount || item.total_price || item.total_amount || 0}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </Pressable>
          );
        })}

        {(!dashboard?.recentBookings || dashboard.recentBookings.length === 0) && (
          <Text style={styles.emptyText}>No booking details mapped.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" },
  
  // Greeting Header Styles
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerProfileRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarWrapper: { position: "relative" },
  avatarImage: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F3F4F6", borderWidth: 2, borderColor: Colors.white },
  verifiedMiniBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: Colors.success,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.white
  },
  headerTextCol: { marginLeft: 10, flex: 1 },
  greetingText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500", marginBottom: 1 },
  artistNameText: { fontSize: 16, fontWeight: "800", color: Colors.text },
  statusBadgeRow: { flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap", gap: 6 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  completionPercentage: { fontSize: 10, color: Colors.textTertiary, fontWeight: "600" },
  bellBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  bellBadge: { position: "absolute", top: 6, right: 6, backgroundColor: Colors.error, borderRadius: 7, minWidth: 14, height: 14, justifyContent: "center", alignItems: "center", paddingHorizontal: 3, borderWidth: 1, borderColor: Colors.white },
  bellBadgeText: { color: Colors.white, fontSize: 8, fontWeight: "800" },

  // Wallet Card Styles
  walletCardBackground: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: "#9C1344", // Royal Rose / Burgundy from WalletScreen
    borderRadius: 18,
    padding: 16,
    elevation: 5,
    shadowColor: "#9C1344",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10
  },
  walletHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.15)", paddingBottom: 10 },
  walletTitleRow: { flexDirection: "row", alignItems: "center" },
  walletBadgeIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 8 },
  walletLabel: { fontSize: 12, color: "rgba(255,255,255,0.95)", fontWeight: "600" },
  walletSecureText: { fontSize: 9, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  walletBody: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  walletBalance: { fontSize: 26, fontWeight: "900", color: Colors.white, letterSpacing: -0.5 },
  walletSubText: { fontSize: 10, color: "rgba(255, 255, 255, 0.8)", marginTop: 2, fontWeight: "500" },
  walletBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, elevation: 2 },
  walletBtnText: { color: "#9C1344", fontWeight: "800", fontSize: 12 },
  walletCashBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  walletCashLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 },
  walletCashIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(255, 255, 255, 0.2)", justifyContent: "center", alignItems: "center", marginRight: 8 },
  walletCashTitle: { fontSize: 11, fontWeight: "700", color: Colors.white },
  walletCashSubtitle: { fontSize: 9, color: "rgba(255, 255, 255, 0.75)", marginTop: 1 },
  walletCashAmount: { fontSize: 14, fontWeight: "800", color: "#A7F3D0" },
  walletCashViewText: { fontSize: 9, color: "rgba(255, 255, 255, 0.85)", fontWeight: "600", marginTop: 2 },

  // Section Styles
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 6, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#111827", letterSpacing: -0.3 },
  viewAll: { color: "#9C1344", fontWeight: "700", fontSize: 13 },

  // Stats Grid Styles
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 2 },
  cardOuter: { width: "48%", marginBottom: 10 },
  cardContainer: { 
    padding: 12, 
    borderRadius: 14, 
    backgroundColor: Colors.white,
    height: 110, 
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  cardCount: { fontSize: 18, fontWeight: "900", color: "#111827" },
  cardInfoCol: { flex: 1, justifyContent: "center", marginTop: 4 },
  cardTitle: { fontSize: 12, fontWeight: "700", color: "#374151" },
  cardDesc: { fontSize: 9, color: "#6B7280", marginTop: 1, lineHeight: 12 },
  cardFooterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 6, marginTop: 4 },
  viewDetailsText: { fontSize: 9, fontWeight: "700" },

  // Quick Actions Styles
  actionsRow: { paddingLeft: 16, paddingBottom: 16, marginTop: 2 },
  actionChip: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: "#E5E7EB", elevation: 1, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  actionLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginLeft: 6 },

  // Booking Card Styles
  bookingCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  bookingLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  bookingInfo: { marginLeft: 10, flex: 1 },
  customerName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  serviceName: { fontSize: 12, color: "#4B5563", marginTop: 1 },
  bookingDate: { fontSize: 11, color: "#6B7280", marginTop: 3, fontWeight: "500" },
  emptyText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginVertical: 30, fontWeight: "500" },

  // Cash Section Card Styles
  cashSection: { paddingHorizontal: 16, marginVertical: 8 },
  cashConfirmCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#F3F4F6", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cashCustomer: { fontSize: 14, fontWeight: "800", color: "#111827" },
  cashService: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  itemMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  metaLabel: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  metaValue: { fontSize: 12, color: "#111827", fontWeight: "700" },
  cashActionsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 },
  cashBtn: { flex: 1, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cashBtnText: { color: Colors.white, fontWeight: "800", fontSize: 13 }
});
