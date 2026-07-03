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
  RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
const moment = require("moment");
import { getBookingHistory } from "../../services/booking";

export default function MyBookingsScreen({ navigation }) {
  const [selectedTab, setSelectedTab] = useState("Pending");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        return status === "PENDING";
      } else if (selectedTab === "Accepted") {
        return ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED", "RESCHEDULED"].includes(status);
      } else if (selectedTab === "Completed") {
        return status === "COMPLETED";
      } else {
        return status === "CANCELLED";
      }
    });
  };

  const filteredData = getFilteredBookings();

  const formatTime = (timeVal) => {
    if (!timeVal) return "";
    const localMoment = require("moment");
    if (String(timeVal).includes("T") || (String(timeVal).includes("-") && String(timeVal).includes(":"))) {
      return localMoment(timeVal).format("hh:mm A");
    }
    return localMoment(timeVal, ["HH:mm:ss", "HH:mm", "hh:mm A", "hh:mm"]).format("hh:mm A");
  };

  const renderBooking = ({ item }) => {
    const status = item.detailed_status || item.booking_status || "PENDING";
    const localMoment = require("moment");
    
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
      <View style={styles.card}>
        <Image
          source={{ uri: item.user?.profile_image || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300" }}
          style={styles.artistImage}
        />
        <View style={styles.info}>
          <View style={styles.cardHeader}>
            <Text style={styles.artistName}>{item.service?.specialization_name || "Mehndi Booking"}</Text>
            <View style={[styles.statusBadge, isSuccessStatus && styles.badgeSuccess, status === "CANCELLED" && styles.badgeError]}>
              <Text style={[styles.statusText, isSuccessStatus && styles.textSuccess, status === "CANCELLED" && styles.textError]}>
                {status}
              </Text>
            </View>
          </View>
          
          <Text style={styles.service}>Code: {item.booking_code}</Text>
          <Text style={styles.date}>📅 {dateStr} • {timeStr}</Text>
          <Text style={styles.price}>💰 ₹{item.final_amount || item.remaining_amount}</Text>

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
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>My Bookings</Text>

      <View style={styles.tabContainer}>
        {["Pending", "Accepted", "Completed", "Cancelled"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
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
  dashboardBtnText: { color: Colors.white, fontWeight: "700", fontSize: 12 }
});
