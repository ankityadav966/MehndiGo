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
import { acceptBooking, rejectBooking } from "../../services/booking";
import { getArtistBookingsData } from "../../services/artist";

export default function BookingRequestsScreen({ route, navigation }) {
  const [activeTab, setActiveTab] = useState("Pending");

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await getArtistBookingsData();
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

  const handleAcceptAll = async () => {
    const pendingBookings = filteredData.filter(b => {
      const bookingStatus = String(b.booking_status || "").toUpperCase();
      const detailedStatus = String(b.detailed_status || "").toUpperCase();
      return bookingStatus === "PENDING" || ["PENDING", "VIEWED", "CONFIRMED"].includes(detailedStatus);
    });

    if (pendingBookings.length === 0) {
      Alert.alert("No pending requests", "There are no pending booking requests to accept.");
      return;
    }

    Alert.alert(
      "Accept All",
      `Are you sure you want to accept all ${pendingBookings.length} pending booking requests?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept All",
          onPress: async () => {
            setLoading(true);
            let successCount = 0;
            let errorCount = 0;
            for (const b of pendingBookings) {
              try {
                await acceptBooking(b.id);
                successCount++;
              } catch (err) {
                console.log(`Failed to accept booking ${b.id}:`, err.message);
                errorCount++;
              }
            }
            setLoading(false);
            if (errorCount > 0) {
              Alert.alert("Batch Complete", `Accepted ${successCount} bookings. Failed to accept ${errorCount} bookings.`);
            } else {
              Alert.alert("Success", `All ${successCount} booking requests accepted successfully!`);
            }
            fetchHistory();
          }
        }
      ]
    );
  };

  const handleDeclineAll = async () => {
    const pendingBookings = filteredData.filter(b => {
      const bookingStatus = String(b.booking_status || "").toUpperCase();
      const detailedStatus = String(b.detailed_status || "").toUpperCase();
      return bookingStatus === "PENDING" || ["PENDING", "VIEWED", "CONFIRMED"].includes(detailedStatus);
    });

    if (pendingBookings.length === 0) {
      Alert.alert("No pending requests", "There are no pending booking requests to decline.");
      return;
    }

    Alert.alert(
      "Decline All",
      `Are you sure you want to decline all ${pendingBookings.length} pending booking requests?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline All",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            let successCount = 0;
            let errorCount = 0;
            for (const b of pendingBookings) {
              try {
                await rejectBooking(b.id, "Declined by artist in bulk");
                successCount++;
              } catch (err) {
                console.log(`Failed to decline booking ${b.id}:`, err.message);
                errorCount++;
              }
            }
            setLoading(false);
            if (errorCount > 0) {
              Alert.alert("Batch Complete", `Declined ${successCount} bookings. Failed to decline ${errorCount} bookings.`);
            } else {
              Alert.alert("Success", `All ${successCount} booking requests declined.`);
            }
            fetchHistory();
          }
        }
      ]
    );
  };

  const getFilteredBookings = () => {
    return bookings.filter((item) => {
      // Only apply today's filter on the Accepted tab
      if (activeTab === "Accepted" && route.params?.filterToday) {
        const moment = require("moment");
        const bookingDate = item.slot?.date || item.slot?.start_time || item.reschedule_date;
        if (!bookingDate || !moment(bookingDate).isSame(moment(), 'day')) {
          return false;
        }
      }

      const bookingStatus = String(item.booking_status || "").toUpperCase();
      const detailedStatus = String(item.detailed_status || "").toUpperCase();
      const status = detailedStatus || bookingStatus;

      if (activeTab === "Pending") {
        return bookingStatus === "PENDING" || ["PENDING", "VIEWED", "CONFIRMED"].includes(detailedStatus);
      }
      
      if (activeTab === "Accepted") {
        return bookingStatus !== "PENDING" && ["ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED", "RESCHEDULED", "CASH_PAYMENT_PENDING", "CASH_DISPUTED"].includes(status);
      } else {
        return bookingStatus !== "PENDING" && ["COMPLETED", "CANCELLED", "AWAITING_CASH_CONFIRMATION", "COMPLETED_CLOSED"].includes(status);

      }
    });
  };

  const filteredData = getFilteredBookings();

  const formatTime = (timeVal) => {
    if (!timeVal) return "";
    const moment = require("moment");
    const getMoment = () => {
      return typeof moment === "function" ? moment : (moment.default || moment);
    };
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

    if (String(timeVal).includes("T") || (String(timeVal).includes("-") && String(timeVal).includes(":"))) {
      return localMoment(timeVal, formats).format("hh:mm A");
    }
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
            source={{ uri: resolveImage(item.user?.profile_image) }}
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

      {activeTab === "Pending" && filteredData.length > 0 && (
        <View style={styles.bulkActionContainer}>
          <TouchableOpacity style={styles.bulkAcceptButton} onPress={handleAcceptAll}>
            <Ionicons name="checkmark-done" size={16} color={Colors.white} />
            <Text style={styles.bulkButtonText}>Accept All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkDeclineButton} onPress={handleDeclineAll}>
            <Ionicons name="close-circle" size={16} color={Colors.error} />
            <Text style={styles.bulkDeclineButtonText}>Decline All</Text>
          </TouchableOpacity>
        </View>
      )}

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
  emptySubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  bulkActionContainer: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, gap: 10, justifyContent: "space-between" },
  bulkAcceptButton: { flex: 1, flexDirection: "row", height: 40, backgroundColor: Colors.primary, borderRadius: 8, justifyContent: "center", alignItems: "center", gap: 6 },
  bulkButtonText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  bulkDeclineButton: { flex: 1, flexDirection: "row", height: 40, borderWidth: 1, borderColor: Colors.error, borderRadius: 8, justifyContent: "center", alignItems: "center", gap: 6 },
  bulkDeclineButtonText: { color: Colors.error, fontWeight: "700", fontSize: 13 }
});
