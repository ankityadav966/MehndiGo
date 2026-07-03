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
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getBookingHistory, acceptBooking, rejectBooking } from "../../services/booking";

export default function BookingRequestsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("Pending");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await getBookingHistory();
      setBookings(data || []);
    } catch (e) {
      console.log("Failed to fetch artist bookings:", e.message);
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

  const handleAccept = async (bookingId) => {
    try {
      await acceptBooking(bookingId);
      Alert.alert("Success", "Booking request accepted successfully!");
      fetchHistory();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to accept booking.");
    }
  };

  const handleReject = (bookingId) => {
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
              await rejectBooking(bookingId, "Declined by artist");
              Alert.alert("Declined", "Booking request declined.");
              fetchHistory();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to decline booking.");
            }
          }
        }
      ]
    );
  };

  const getFilteredBookings = () => {
    return bookings.filter((item) => {
      const status = item.detailed_status || item.booking_status;
      if (activeTab === "Pending") {
        return status === "PENDING";
      } else if (activeTab === "Accepted") {
        return ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED", "RESCHEDULED"].includes(status);
      } else {
        return ["COMPLETED", "CANCELLED"].includes(status);
      }
    });
  };

  const filteredData = getFilteredBookings();

  const formatTime = (timeVal) => {
    if (!timeVal) return "";
    const moment = require("moment");
    if (String(timeVal).includes("T") || (String(timeVal).includes("-") && String(timeVal).includes(":"))) {
      return moment(timeVal).format("hh:mm A");
    }
    return moment(timeVal, ["HH:mm:ss", "HH:mm", "hh:mm A", "hh:mm"]).format("hh:mm A");
  };

  const renderItem = ({ item }) => {
    const moment = require("moment");
    let dateStr = "Today";
    if (item.slot?.date) {
      dateStr = moment(item.slot.date).format("YYYY/MM/DD");
    } else if (item.slot?.start_time) {
      dateStr = moment(item.slot.start_time).format("YYYY/MM/DD");
    } else if (item.reschedule_date) {
      dateStr = moment(item.reschedule_date).format("YYYY/MM/DD");
    }

    const timeStr = item.slot 
      ? `${formatTime(item.slot.start_time)} - ${formatTime(item.slot.end_time)}` 
      : (item.reschedule_time ? formatTime(item.reschedule_time) : "TBD");
    const status = item.detailed_status || item.booking_status || "PENDING";

    return (
      <View style={styles.card}>
        <View style={styles.topSection}>
          <Image
            source={{ uri: item.user?.profile_image || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300" }}
            style={styles.avatar}
          />
          <View style={styles.infoContainer}>
            <Text style={styles.name}>{item.user?.name || "Client"}</Text>
            <View style={styles.row}>
              <Ionicons name="brush-outline" size={13} color={Colors.textTertiary} />
              <Text style={styles.service}>{item.service?.specialization_name || "Mehndi Service"}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={13} color={Colors.textTertiary} />
              <Text style={styles.date}>{dateStr} • {timeStr}</Text>
            </View>
          </View>
          <Text style={styles.price}>₹{item.final_amount || item.remaining_amount}</Text>
        </View>

        {activeTab === "Pending" && (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(item.id)}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(item.id)}>
              <Text style={styles.rejectButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab !== "Pending" && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => navigation.navigate("BookingDetails", { bookingId: item.id })}
            >
              <Text style={styles.viewButtonText}>View Status Timeline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Booking Requests</Text>
      </View>
      <View style={styles.tabsContainer}>
        {["Pending", "Accepted", "Completed"].map((tab) => (
          <TouchableOpacity key={tab} style={styles.tabButton} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            {activeTab === tab && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="archive-outline" size={60} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Inbox Clean</Text>
          <Text style={styles.emptySubtitle}>No booking requests found under this category.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  tabsContainer: { flexDirection: "row", backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 10, paddingVertical: 2, marginBottom: 12, elevation: 1 },
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  tabText: { fontSize: 13, fontWeight: "600", color: Colors.textTertiary },
  activeTabText: { color: Colors.primary },
  activeIndicator: { position: "absolute", bottom: 0, width: 32, height: 3, borderRadius: 10, backgroundColor: Colors.primary },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { paddingHorizontal: 16, paddingBottom: 120 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 12, elevation: 2 },
  topSection: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  infoContainer: { flex: 1, marginLeft: 12 },
  name: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  service: { fontSize: 11, color: Colors.textSecondary, marginLeft: 5 },
  date: { fontSize: 11, color: Colors.textSecondary, marginLeft: 5 },
  price: { fontSize: 14, fontWeight: "800", color: Colors.primary },
  actionContainer: { flexDirection: "row", marginTop: 14, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  acceptButton: { flex: 1, height: 36, backgroundColor: Colors.primary, borderRadius: 8, justifyContent: "center", alignItems: "center", marginRight: 8 },
  acceptButtonText: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  rejectButton: { flex: 1, height: 36, borderWidth: 1, borderColor: Colors.error, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  rejectButtonText: { color: Colors.error, fontWeight: "700", fontSize: 12 },
  viewButton: { flex: 1, height: 36, borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  viewButtonText: { color: Colors.primary, fontWeight: "700", fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 }
});
