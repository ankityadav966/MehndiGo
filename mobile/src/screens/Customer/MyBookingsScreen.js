import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
const getMoment = () => {
  const m = require("moment");
  return typeof m === "function" ? m : (m.default || m);
};
import { getBookingHistory } from "../../services/booking";

export default function MyBookingsScreen({ navigation }) {
  const { isDarkMode } = useAuth();

  const currentBgColor = isDarkMode ? "#000000" : Colors.background;
  const currentCardBg = isDarkMode ? "#121212" : Colors.white;
  const currentTextColor = isDarkMode ? "#FFFFFF" : Colors.text;
  const currentSecTextColor = isDarkMode ? "#B0B0B0" : Colors.textSecondary;
  const currentBorderColor = isDarkMode ? "#333333" : Colors.border;

  const [selectedTab, setSelectedTab] = useState("Pending");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState("This Month");

  const fetchHistory = async () => {
    try {
      const data = await getBookingHistory();
      setBookings(data || []);
    } catch (e) {
      console.log("Failed to fetch booking history:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (bookings.length === 0) {
        setLoading(true);
      }
      fetchHistory();
    });
    return unsubscribe;
  }, [navigation, bookings]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  // Filter bookings based on selected status tab
  const getFilteredBookings = () => {
    return bookings.filter((item) => {
      const status = item.detailed_status || item.booking_status;
      if (selectedTab === "Pending") {
        return ["PENDING", "VIEWED", "CONFIRMED"].includes(status);
      } else if (selectedTab === "Accepted") {
        return ["ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED", "RESCHEDULED"].includes(status);

      } else if (selectedTab === "Completed") {
        return ["COMPLETED", "AWAITING_CASH_CONFIRMATION", "COMPLETED_CLOSED"].includes(status);
      } else {
        return ["CANCELLED", "REJECTED", "REFUNDED"].includes(status);
      }
    });
  };

  const filteredData = getFilteredBookings();

  const getBookingStats = () => {
    const moment = getMoment();
    const now = moment();
    
    let total = bookings.length;
    let todayCount = 0;
    let weeklyCount = 0;
    let monthlyCount = 0;
    let completedCount = 0;
    let upcomingCount = 0;

    bookings.forEach((b) => {
      const bDateStr = b.slot?.date || b.slot?.start_time || b.reschedule_date || b.createdAt;
      const bDate = moment(bDateStr);
      const status = b.detailed_status || b.booking_status;

      if (bDate.isSame(now, "day")) todayCount++;
      if (bDate.isSame(now, "week")) weeklyCount++;
      if (bDate.isSame(now, "month")) monthlyCount++;
      if (status === "COMPLETED") completedCount++;
      if (["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED"].includes(status) && bDate.isSameOrAfter(now, "day")) {
        upcomingCount++;
      }
    });

    return { total, todayCount, weeklyCount, monthlyCount, completedCount, upcomingCount };
  };

  const getDashboardFilterStats = () => {
    const moment = getMoment();
    const now = moment();
    let filteredList = bookings.filter((b) => {
      const bDateStr = b.slot?.date || b.slot?.start_time || b.reschedule_date || b.createdAt;
      const bDate = moment(bDateStr);
      if (dashboardFilter === "Today") {
        return bDate.isSame(now, "day");
      } else if (dashboardFilter === "This Week") {
        return bDate.isSame(now, "week");
      } else {
        return bDate.isSame(now, "month");
      }
    });

    let total = filteredList.length;
    let completed = 0;
    let pending = 0;
    let cancelled = 0;

    filteredList.forEach((b) => {
      const status = b.detailed_status || b.booking_status;
      if (status === "COMPLETED") {
        completed++;
      } else if (status === "CANCELLED") {
        cancelled++;
      } else {
        pending++;
      }
    });

    return { total, completed, pending, cancelled };
  };

  const stats = getBookingStats();
  const filterStats = getDashboardFilterStats();

  const renderStatsCard = (title, count, icon, color) => (
    <View style={[styles.statsCard, { backgroundColor: currentCardBg, borderLeftColor: color }]}>
      <View style={styles.statsCardHeader}>
        <Text style={[styles.statsCardTitle, { color: currentSecTextColor }]}>{title}</Text>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={[styles.statsCardCount, { color: currentTextColor }]}>{count}</Text>
    </View>
  );

  const formatTime = (timeVal) => {
    if (!timeVal) return "";
    const localMoment = getMoment();
    const formats = [
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DDTHH:mm:ssZ",
      "YYYY-MM-DDTHH:mm:ss.SSSZ",
      "HH:mm:ss",
      "HH:mm",
      "hh:mm A",
      "hh:mm"
    ];
    return localMoment(timeVal, formats).format("hh:mm A");
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

  const renderBooking = ({ item }) => {
    const status = item.detailed_status || item.booking_status || "PENDING";
    const localMoment = getMoment();
    
    // Resolve clean slot date
    let dateStr = "Today";
    if (item.slot?.date) {
      dateStr = localMoment(item.slot.date).format("DD MMM YYYY");
    } else if (item.slot?.start_time) {
      dateStr = localMoment(item.slot.start_time).format("DD MMM YYYY");
    } else if (item.reschedule_date) {
      dateStr = localMoment(item.reschedule_date).format("DD MMM YYYY");
    }

    // Resolve clean time slot
    let timeStr = "TBD";
    if (item.slot?.start_time && item.slot?.end_time) {
      timeStr = `${formatTime(item.slot.start_time)} - ${formatTime(item.slot.end_time)}`;
    } else if (item.reschedule_time) {
      timeStr = formatTime(item.reschedule_time);
    }

    const isSuccessStatus = ["COMPLETED", "CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED"].includes(status);

    return (
      <View style={[styles.card, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}>
        <Image
          source={{ uri: resolveImage(item.artist?.user?.profile_image) }}
          style={styles.artistImage}
        />
        <View style={styles.info}>
          <View style={styles.cardHeader}>
            <Text style={[styles.artistName, { color: currentTextColor }]}>{item.service?.specialization_name || "Mehndi Booking"}</Text>
            <View style={[styles.statusBadge, isSuccessStatus && styles.badgeSuccess, status === "CANCELLED" && styles.badgeError]}>
              <Text style={[styles.statusText, isSuccessStatus && styles.textSuccess, status === "CANCELLED" && styles.textError]}>
                {status}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.service, { color: currentSecTextColor }]}>Code: {status === "CANCELLED" ? `${item.booking_code} (Expired)` : item.booking_code}</Text>
          <Text style={[styles.date, { color: currentSecTextColor }]}>📅 {dateStr} • {timeStr}</Text>
          <Text style={[styles.price, { color: currentTextColor }]}>💰 ₹{item.final_amount || item.remaining_amount}</Text>

          {["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED"].includes(status) && (
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: "row", height: 32, backgroundColor: Colors.primary, borderRadius: 6, justifyContent: "center", alignItems: "center" }}
                onPress={() => {
                  const phone = item.artist?.user?.phone || "9999999999";
                  const { Linking } = require("react-native");
                  Linking.openURL(`tel:${phone}`);
                }}
              >
                <Ionicons name="call" size={12} color={Colors.white} />
                <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "700", marginLeft: 4 }}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, flexDirection: "row", height: 32, backgroundColor: Colors.success, borderRadius: 6, justifyContent: "center", alignItems: "center", marginLeft: 8 }}
                onPress={() => {
                  navigation.navigate("ChatRoom", {
                    bookingId: item.id,
                    receiverId: item.artist?.user_id || item.artist_id,
                    receiverName: item.artist?.user?.name || "Artist",
                    receiverImage: item.artist?.user?.profile_image
                  });
                }}
              >
                <Ionicons name="chatbubbles" size={12} color={Colors.white} />
                <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "700", marginLeft: 4 }}>Chat</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => navigation.navigate("BookingDetails", { bookingId: item.id })}
          >
            <Text style={styles.detailsText}>View Details & Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentBgColor }]}>
      <Text style={[styles.header, { color: currentTextColor }]}>My Bookings</Text>

      {/* Booking Statistics Carousel */}
      <View style={{ maxHeight: 110, marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6 }}
        >
          {renderStatsCard("Total Bookings", stats.total, "calendar", Colors.primary)}
          {renderStatsCard("Today's Bookings", stats.todayCount, "today", "#2196F3")}
          {renderStatsCard("Weekly Bookings", stats.weeklyCount, "time", "#9C27B0")}
          {renderStatsCard("Monthly Bookings", stats.monthlyCount, "calendar-number", "#E91E63")}
          {renderStatsCard("Completed Bookings", stats.completedCount, "checkmark-circle", "#4CAF50")}
          {renderStatsCard("Upcoming Bookings", stats.upcomingCount, "hourglass", "#FF9800")}
        </ScrollView>
      </View>

      {/* Time Range Stats Filters */}
      <Text style={[styles.sectionSubtitle, { color: currentSecTextColor }]}>Time Range Dashboard</Text>
      <View style={[styles.filterTabContainer, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}>
        {["Today", "This Week", "This Month"].map((fTab) => (
          <TouchableOpacity
            key={fTab}
            onPress={() => setDashboardFilter(fTab)}
            style={[styles.filterTab, dashboardFilter === fTab && styles.activeFilterTab]}
          >
            <Text style={[styles.filterTabText, { color: currentSecTextColor }, dashboardFilter === fTab && styles.activeFilterTabText]}>
              {fTab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filterStatsPanel, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}>
        <View style={styles.filterStatCol}>
          <Text style={[styles.filterStatVal, { color: currentTextColor }]}>{filterStats.total}</Text>
          <Text style={[styles.filterStatLbl, { color: currentSecTextColor }]}>Total</Text>
        </View>
        <View style={styles.filterStatCol}>
          <Text style={[styles.filterStatVal, { color: "#4CAF50" }]}>{filterStats.completed}</Text>
          <Text style={[styles.filterStatLbl, { color: currentSecTextColor }]}>Completed</Text>
        </View>
        <View style={styles.filterStatCol}>
          <Text style={[styles.filterStatVal, { color: "#FF9800" }]}>{filterStats.pending}</Text>
          <Text style={[styles.filterStatLbl, { color: currentSecTextColor }]}>Pending</Text>
        </View>
        <View style={styles.filterStatCol}>
          <Text style={[styles.filterStatVal, { color: "#F44336" }]}>{filterStats.cancelled}</Text>
          <Text style={[styles.filterStatLbl, { color: currentSecTextColor }]}>Cancelled</Text>
        </View>
      </View>

      <Text style={[styles.sectionSubtitle, { color: currentSecTextColor }]}>Booking Status List</Text>

      <View style={[styles.tabContainer, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}>
        {["Pending", "Accepted", "Completed", "Cancelled"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, { color: currentSecTextColor }, selectedTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={70} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No {selectedTab} Bookings</Text>
          <Text style={styles.emptySubtitle}>{"You don't have any bookings logged under this tab."}</Text>
          <TouchableOpacity
            style={styles.dashboardBtn}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.dashboardBtnText}>Find Henna Artists</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderBooking}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { fontSize: 20, fontWeight: "700", marginHorizontal: 16, marginTop: 12, marginBottom: 16, color: Colors.text },
  tabContainer: { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, backgroundColor: Colors.white, borderRadius: 10, padding: 4, elevation: 1 },
  tab: { flex: 1, height: 38, justifyContent: "center", alignItems: "center", borderRadius: 8 },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  activeTabText: { color: Colors.white, fontWeight: "700" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { flexDirection: "row", backgroundColor: Colors.white, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, elevation: 2 },
  artistImage: { width: 75, height: 75, borderRadius: 12 },
  info: { flex: 1, marginLeft: 12, justifyContent: "space-between" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  artistName: { fontSize: 14, fontWeight: "700", color: Colors.text, flex: 1, marginRight: 8, flexWrap: "wrap" },
  statusBadge: { backgroundColor: Colors.primaryLight + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeSuccess: { backgroundColor: Colors.success + "15" },
  badgeError: { backgroundColor: Colors.error + "15" },
  statusText: { color: Colors.primary, fontWeight: "700", fontSize: 10 },
  textSuccess: { color: Colors.success },
  textError: { color: Colors.error },
  service: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  date: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  price: { fontSize: 12, color: Colors.primary, fontWeight: "700", marginTop: 4 },
  detailsBtn: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 12, height: 28, borderRadius: 6, backgroundColor: Colors.background, justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  detailsText: { color: Colors.textSecondary, fontSize: 11, fontWeight: "700" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, paddingVertical: 60 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  dashboardBtn: { marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  dashboardBtnText: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  
  // Dashboard additions
  statsCard: {
    width: 140,
    height: 85,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }
  },
  statsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  statsCardTitle: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 4
  },
  statsCardCount: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  filterTabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 2
  },
  filterTab: {
    flex: 1,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6
  },
  activeFilterTab: {
    backgroundColor: Colors.white,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  },
  filterTabText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600"
  },
  activeFilterTabText: {
    color: Colors.primary,
    fontWeight: "700"
  },
  filterStatsPanel: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  },
  filterStatCol: {
    flex: 1,
    alignItems: "center"
  },
  filterStatVal: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text
  },
  filterStatLbl: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 2
  }
});
