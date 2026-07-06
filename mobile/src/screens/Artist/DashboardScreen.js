import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { getArtistDashboardData } from "../../services/artist";
import { confirmCashPayment, rejectCashPayment, acceptBooking, rejectBooking } from "../../services/booking";
import Alert from "../../utils/Alert";

export default function ArtistDashboardScreen({ navigation }) {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardDetails = React.useCallback(async () => {
    try {
      const data = await getArtistDashboardData();
      setDashboard(data);
    } catch (err) {
      console.log("Failed to load artist dashboard details:", err.message);
      // Fallback fallback details
      setDashboard({
        artist: {
          name: user?.name || "Priya Sharma",
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
        recentBookings: [
          { id: 1, user: { name: "Ananya Sharma" }, service: { specialization_name: "Bridal Traditional Mehndi" }, booking_status: "CONFIRMED", total_price: 3500, createdAt: new Date().toISOString() },
          { id: 2, user: { name: "Ritika Patel" }, service: { specialization_name: "Arabic Intricate Mehndi" }, booking_status: "PENDING", total_price: 1500, createdAt: new Date().toISOString() }
        ]
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const { socket } = useSocket();

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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const artist = dashboard?.artist || {};
  const isVerified = artist.verification_status === "APPROVED";

  const quickActions = [
    { icon: "calendar-outline", label: "My Bookings", screen: "BookingRequests" },
    { icon: "wallet-outline", label: "Wallet Ledger", screen: "Wallet" },
    { icon: "calendar-number-outline", label: "Availability", screen: "AvailabilityCalendar" },
    { icon: "list-outline", label: "Services", screen: "Services" },
    { icon: "images-outline", label: "Portfolio", screen: "Portfolio" },
    { icon: "star-outline", label: "Reviews", screen: "Reviews" },
    { icon: "notifications-outline", label: "Alerts", screen: "Notifications" }
  ];

  const resolveImage = (uri) => {
    if (!uri) return null;
    if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://") || uri.startsWith("content://")) {
      return uri;
    }
    const cleanUri = uri.startsWith("/") ? uri : `/${uri}`;
    const { BASE_URL } = require("../../services/api");
    return `${BASE_URL}${cleanUri}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Header Profile Photo info */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerProfile} onPress={() => navigation.navigate("Profile")}>
            <Image source={{ uri: resolveImage(artist.profile_image) || "https://picsum.photos/200" }} style={styles.headerAvatar} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerGreeting}>Hi, {artist.name || "Artist"} 👋</Text>
              <View style={styles.badgeRow}>
                <Ionicons
                  name={isVerified ? "shield-checkmark" : "time-outline"}
                  size={12}
                  color={isVerified ? Colors.success : Colors.warning}
                />
                <Text style={[styles.badgeText, { color: isVerified ? Colors.success : Colors.warning }]}>
                  {artist.verification_status || "PENDING"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationBtn} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Wallet Balance Hero Card */}
        <View style={styles.walletHeroCard}>
          <View>
            <Text style={styles.walletHeroTitle}>Available Wallet Balance</Text>
            <Text style={styles.walletHeroAmount}>₹{(dashboard?.walletBalance || 0).toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.walletHeroBtn} onPress={() => navigation.navigate("Wallet")}>
            <Ionicons name="wallet-outline" size={16} color={Colors.white} />
            <Text style={styles.walletHeroBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Stats metrics widgets */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
            <Text style={styles.statValue}>{dashboard?.todayBookings || 0}</Text>
            <Text style={styles.statLabel}>{"Today's Jobs"}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
            <Text style={styles.statValue}>₹{(dashboard?.todayEarnings || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>{"Today's Payout"}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
            <Text style={styles.statValue}>{dashboard?.pendingRequests || 0}</Text>
            <Text style={styles.statLabel}>New Requests</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.info }]}>
            <Text style={styles.statValue}>
              {artist.avg_rating !== undefined && artist.avg_rating !== null ? Number(artist.avg_rating).toFixed(1) : "0.0"}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>

        {/* Booking Performance Breakdown Section */}
        <Text style={styles.sectionTitle}>Booking Performance Breakdown</Text>
        <View style={styles.statsContainer}>
          {[
            { label: "Pending Requests", value: dashboard?.bookingCounts?.PENDING || 0, color: Colors.primary },
            { label: "Upcoming Bookings", value: dashboard?.bookingCounts?.UPCOMING || 0, color: Colors.info },
            { label: "Accepted Bookings", value: dashboard?.bookingCounts?.ACCEPTED || 0, color: Colors.success },
            { label: "Ongoing Bookings", value: dashboard?.bookingCounts?.ONGOING || 0, color: Colors.warning },
            { label: "Completed Bookings", value: dashboard?.bookingCounts?.COMPLETED || 0, color: "#10B981" },
            { label: "Awaiting Settlement", value: dashboard?.bookingCounts?.AWAITING_SETTLEMENT || 0, color: "#EF4444" },
            { label: "Pending Cash Confirm", value: dashboard?.bookingCounts?.PENDING_CASH_APPROVAL || 0, color: "#F59E0B" },
            { label: "Cancelled Bookings", value: dashboard?.bookingCounts?.CANCELLED || 0, color: "#6B7280" }
          ].map((item, idx) => (
            <View key={idx} style={[styles.statCard, { borderLeftColor: item.color }]}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions List Grid */}
        <Text style={styles.sectionTitle}>Quick Management Control</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionChip}
              onPress={() => navigation.navigate(action.screen)}
            >
              <Ionicons name={action.icon} size={16} color={Colors.primary} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Pending Bookings Section */}
        {dashboard?.recentBookings?.filter(b => b.booking_status === "PENDING").length > 0 && (
          <View style={styles.cashSection}>
            <Text style={styles.sectionTitle}>Pending Bookings</Text>
            {dashboard.recentBookings.filter(b => b.booking_status === "PENDING").map((item) => {
              const paymentRecord = item.payments && item.payments[0];
              const paymentMethod = paymentRecord?.payment_method || "Online";
              const paymentStatus = paymentRecord?.status || item.payment_status || "PENDING";
              const slotDate = item.slot?.date ? new Date(item.slot.date).toLocaleDateString() : (item.reschedule_date || "TBD");
              const slotTime = item.slot ? `${new Date(item.slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(item.slot.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : (item.reschedule_time || "TBD");
              
              return (
                <View key={item.id} style={styles.cashConfirmCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    <Image 
                      source={{ uri: item.user?.profile_image || "https://picsum.photos/200" }} 
                      style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cashCustomer} numberOfLines={1} adjustsFontSizeToFit={true}>Customer Name: {item.user?.name || "Client"}</Text>
                      <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Service Name: {item.service?.specialization_name || "Mehndi Design"}</Text>
                    </View>
                  </View>
                  <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Booking ID: #{item.booking_code}</Text>
                  <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Booking Date: {slotDate}</Text>
                  <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Booking Time: {slotTime}</Text>
                  <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Booking Amount: ₹{item.final_amount}</Text>
                  <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Payment Method: {paymentMethod}</Text>
                  <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Booking Status: {item.booking_status}</Text>
                  <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Payment Status: {paymentStatus}</Text>
                  
                  <View style={styles.cashActionsRow}>
                    <TouchableOpacity
                      style={[styles.cashBtn, { backgroundColor: Colors.success }]}
                      onPress={async () => {
                        try {
                          setLoading(true);
                          await acceptBooking(item.id);
                          Alert.alert("Success", "Booking request accepted successfully!");
                          fetchDashboardDetails();
                        } catch (err) {
                          Alert.alert("Error", err.message || "Failed to accept booking.");
                          setLoading(false);
                        }
                      }}
                    >
                      <Text style={styles.cashBtnText} numberOfLines={1} adjustsFontSizeToFit={true}>✅ Accept Booking</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cashBtn, { backgroundColor: "#EF4444" }]}
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
                                  setLoading(false);
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.cashBtnText} numberOfLines={1} adjustsFontSizeToFit={true}>❌ Decline Booking</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Pending Cash Payment Requests Section */}
        {dashboard?.recentBookings?.filter(b => b.detailed_status === "AWAITING_CASH_CONFIRMATION" || b.booking_status === "AWAITING_CASH_CONFIRMATION").length > 0 && (
          <View style={styles.cashSection}>
            <Text style={styles.sectionTitle}>Pending Cash Payment Requests</Text>
            {dashboard.recentBookings.filter(b => b.detailed_status === "AWAITING_CASH_CONFIRMATION" || b.booking_status === "AWAITING_CASH_CONFIRMATION").map((item) => (
              <View key={item.id} style={styles.cashConfirmCard}>
                <View style={styles.cashHeader}>
                  <Text style={styles.cashCustomer} numberOfLines={1} adjustsFontSizeToFit={true}>Customer Name: {item.user?.name || "Client"}</Text>
                  <Text style={styles.cashAmount} numberOfLines={1} adjustsFontSizeToFit={true}>Booking Amount: ₹{item.final_amount}</Text>
                </View>
                <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Booking ID: #{item.booking_code}</Text>
                <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Booking Date: {item.slot?.date ? new Date(item.slot.date).toLocaleDateString() : (item.reschedule_date || "TBD")}</Text>
                <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Payment Method: Cash</Text>
                <Text style={styles.cashBookingCode} numberOfLines={1} adjustsFontSizeToFit={true}>Payment Status: Pending Cash Confirmation</Text>
                
                <View style={styles.cashActionsRow}>
                  <TouchableOpacity
                    style={[styles.cashBtn, { backgroundColor: Colors.success }]}
                    onPress={async () => {
                      try {
                        setLoading(true);
                        await confirmCashPayment(item.id);
                        Alert.alert("Success", "Cash payment approved successfully!");
                        fetchDashboardDetails();
                      } catch (err) {
                        Alert.alert("Error", err.message);
                        setLoading(false);
                      }
                    }}
                  >
                    <Text style={styles.cashBtnText} numberOfLines={1} adjustsFontSizeToFit={true}>✅ Approve Payment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cashBtn, { backgroundColor: "#EF4444" }]}
                    onPress={async () => {
                      try {
                        setLoading(true);
                        await rejectCashPayment(item.id);
                        Alert.alert("Success", "Cash payment rejected.");
                        fetchDashboardDetails();
                      } catch (err) {
                        Alert.alert("Error", err.message);
                        setLoading(false);
                      }
                    }}
                  >
                    <Text style={styles.cashBtnText} numberOfLines={1} adjustsFontSizeToFit={true}>❌ Reject Payment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent booking request cards list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Booking Jobs</Text>
          <TouchableOpacity onPress={() => navigation.navigate("BookingRequests")}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {dashboard?.recentBookings?.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.bookingCard}
            onPress={() => navigation.navigate("BookingDetails", { bookingId: item.id })}
          >
            <View style={styles.bookingLeft}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={24} color={Colors.primary} />
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
          </TouchableOpacity>
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
  walletHeroCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.shadow || "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  walletHeroTitle: { fontSize: 11, color: Colors.textSecondary },
  walletHeroAmount: { fontSize: 24, fontWeight: "800", color: Colors.text, marginTop: 4 },
  walletHeroBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  walletHeroBtnText: { color: Colors.white, fontWeight: "700", fontSize: 12, marginLeft: 6 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerProfile: { flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background },
  headerTextContainer: { marginLeft: 12 },
  headerGreeting: { fontSize: 16, fontWeight: "800", color: Colors.text },
  badgeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  badgeText: { fontSize: 9, fontWeight: "800", marginLeft: 4, textTransform: "uppercase" },
  notificationBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  statsContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16 },
  statCard: { width: "48%", backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  statValue: { fontSize: 18, fontWeight: "800", color: Colors.text },
  statLabel: { marginTop: 4, color: Colors.textSecondary, fontSize: 11 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingRight: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, marginLeft: 16, marginVertical: 12 },
  viewAll: { color: Colors.primary, fontWeight: "700", fontSize: 12 },
  actionsRow: { paddingLeft: 16, paddingBottom: 10 },
  actionChip: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10 },
  actionLabel: { fontSize: 11, fontWeight: "700", color: Colors.text, marginLeft: 6 },
  bookingCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  bookingLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center" },
  bookingInfo: { marginLeft: 12, flex: 1 },
  customerName: { fontSize: 13, fontWeight: "700", color: Colors.text },
  serviceName: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  bookingDate: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  emptyText: { fontSize: 11, color: Colors.textSecondary, textAlign: "center", marginVertical: 32 },
  cashSection: { paddingHorizontal: 16, marginVertical: 10 },
  cashConfirmCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  cashHeader: { flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start", marginBottom: 6 },
  cashCustomer: { fontSize: 13, fontWeight: "700", color: Colors.text },
  cashAmount: { fontSize: 13, fontWeight: "800", color: Colors.primary, marginTop: 2 },
  cashBookingCode: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, width: "100%" },
  cashActionsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, width: "100%" },
  cashBtn: { flex: 1, height: 38, borderRadius: 8, justifyContent: "center", alignItems: "center", marginHorizontal: 4, paddingHorizontal: 4 },
  cashBtnText: { color: Colors.white, fontWeight: "700", fontSize: 10, textAlign: "center" }
});
