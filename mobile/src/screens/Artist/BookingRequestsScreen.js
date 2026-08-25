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
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || "Pending");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await getArtistBookingsData();
      setBookings(data || []);
    } catch (e) {
      if (__DEV__) console.log("Failed to fetch artist bookings:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  useEffect(() => {
    fetchHistory();
    const { BackHandler } = require("react-native");

    const unsubscribeFocus = navigation.addListener("focus", () => {
      fetchHistory();
    });

    const onBackPress = () => {
      if (navigation?.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("ArtistTabs", { screen: "Dashboard" });
      }
      return true;
    };

    const backSub = BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () => {
      unsubscribeFocus();
      backSub.remove();
    };
  }, [navigation]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleAccept = async (bookingId) => {
    try {
      setLoading(true);
      await acceptBooking(bookingId);
      Alert.alert("Success", "Booking request accepted successfully!");
      await fetchHistory();
      setActiveTab("Accepted");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to accept booking.");
      setLoading(false);
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
              setLoading(true);
              await rejectBooking(bookingId, "Declined by artist");
              Alert.alert("Declined", "Booking request declined.");
              await fetchHistory();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to decline booking.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAcceptAll = async () => {
    const pendingBookings = filteredData.filter((b) => {
      const st = String(b.status || b.booking_status || "").toUpperCase();
      const det = String(b.detailed_status || b.detailedStatus || "").toUpperCase();
      return (
        st !== "ACCEPTED" &&
        det !== "ARTIST_ACCEPTED" &&
        det !== "ACCEPTED" &&
        det !== "CANCELLED" &&
        det !== "REJECTED"
      );
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
                if (__DEV__) console.log(`Failed to accept booking ${b.id}:`, err.message);
                errorCount++;
              }
            }
            await fetchHistory();
            setActiveTab("Accepted");
            if (errorCount > 0) {
              Alert.alert(
                "Batch Complete",
                `Accepted ${successCount} bookings. Failed to accept ${errorCount} bookings.`
              );
            } else {
              Alert.alert("Success", `All ${successCount} booking requests accepted successfully!`);
            }
          }
        }
      ]
    );
  };

  const handleDeclineAll = async () => {
    const pendingBookings = filteredData.filter((b) => {
      const st = String(b.status || b.booking_status || "").toUpperCase();
      const det = String(b.detailed_status || b.detailedStatus || "").toUpperCase();
      return (
        st !== "ACCEPTED" &&
        det !== "ARTIST_ACCEPTED" &&
        det !== "ACCEPTED" &&
        det !== "CANCELLED" &&
        det !== "REJECTED"
      );
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
                if (__DEV__) console.log(`Failed to decline booking ${b.id}:`, err.message);
                errorCount++;
              }
            }
            await fetchHistory();
            if (errorCount > 0) {
              Alert.alert(
                "Batch Complete",
                `Declined ${successCount} bookings. Failed to decline ${errorCount} bookings.`
              );
            } else {
              Alert.alert("Success", `All ${successCount} booking requests declined.`);
            }
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
        const bookingDate =
          item.slot?.date || item.slot?.start_time || item.reschedule_date || item.booking_date;
        if (!bookingDate || !moment(bookingDate).isSame(moment(), "day")) {
          return false;
        }
      }

      const rawStatus = String(item.status || item.booking_status || "").toUpperCase();
      const rawDetailed = String(item.detailed_status || item.detailedStatus || "").toUpperCase();

      let status = "PENDING";
      if (
        rawStatus === "ACCEPTED" ||
        rawStatus === "CONFIRMED" ||
        rawStatus === "ARTIST_ACCEPTED" ||
        rawDetailed === "ARTIST_ACCEPTED" ||
        rawDetailed === "ACCEPTED" ||
        rawDetailed === "CONFIRMED"
      ) {
        status = "ARTIST_ACCEPTED";
      } else if (rawStatus === "ON_THE_WAY" || rawDetailed === "ARTIST_ON_THE_WAY" || rawDetailed === "ON_THE_WAY") {
        status = "ARTIST_ON_THE_WAY";
      } else if (rawStatus === "ARRIVED" || rawDetailed === "ARTIST_ARRIVED" || rawDetailed === "ARRIVED") {
        status = "ARTIST_ARRIVED";
      } else if (
        rawStatus === "IN_PROGRESS" ||
        rawDetailed === "SERVICE_IN_PROGRESS" ||
        rawDetailed === "SERVICE_STARTED" ||
        rawDetailed === "IN_PROGRESS" ||
        rawDetailed === "PROCESSING" ||
        rawDetailed === "CHECKOUT"
      ) {
        status = "SERVICE_IN_PROGRESS";
      } else if (
        rawStatus === "CANCELLED" ||
        rawStatus === "REJECTED" ||
        rawStatus === "DECLINED" ||
        rawDetailed === "CANCELLED" ||
        rawDetailed === "REJECTED" ||
        rawDetailed === "DECLINED" ||
        rawDetailed === "REFUNDED"
      ) {
        status = "CANCELLED";
      } else if (
        rawStatus === "COMPLETED" ||
        rawDetailed === "COMPLETED" ||
        rawDetailed === "AWAITING_CASH_CONFIRMATION" ||
        rawDetailed === "COMPLETED_CLOSED"
      ) {
        status = "COMPLETED";
      } else if (rawDetailed && !["PENDING", "REQUESTED", "CREATED", "PENDING_PAYMENT", "VIEWED"].includes(rawDetailed)) {
        status = rawDetailed;
      } else {
        status = "PENDING";
      }

      if (activeTab === "Pending") {
        return (
          status === "PENDING" ||
          rawStatus === "PENDING" ||
          rawStatus === "REQUESTED" ||
          rawStatus === "PENDING_PAYMENT" ||
          rawDetailed === "PENDING" ||
          rawDetailed === "REQUESTED" ||
          rawDetailed === "PENDING_PAYMENT"
        ) && !["ARTIST_ACCEPTED", "ACCEPTED", "CONFIRMED", "ARTIST_ON_THE_WAY", "ON_THE_WAY", "ARTIST_ARRIVED", "ARRIVED", "SERVICE_IN_PROGRESS", "SERVICE_STARTED", "IN_PROGRESS", "CHECKOUT", "COMPLETED", "CANCELLED", "REJECTED", "DECLINED"].includes(status);
      }

      if (activeTab === "Accepted") {
        return [
          "ARTIST_ACCEPTED",
          "ACCEPTED",
          "CONFIRMED",
          "ARTIST_ON_THE_WAY",
          "ON_THE_WAY",
          "ARTIST_ARRIVED",
          "ARRIVED",
          "SERVICE_IN_PROGRESS",
          "SERVICE_STARTED",
          "IN_PROGRESS",
          "PROCESSING",
          "CHECKOUT",
          "RESCHEDULED",
          "CASH_PAYMENT_PENDING",
          "CASH_DISPUTED",
          "WAITING_FOR_USER_PAYMENT"
        ].includes(status);
      }

      if (activeTab === "Cancelled") {
        return ["CANCELLED", "REJECTED", "DECLINED", "REFUNDED"].includes(status);
      }

      return ["COMPLETED", "AWAITING_CASH_CONFIRMATION", "COMPLETED_CLOSED"].includes(status);
    });
  };

  const filteredData = getFilteredBookings();

  const formatTime = (timeVal) => {
    if (!timeVal) return "";
    const moment = require("moment");
    const getMoment = () => {
      return typeof moment === "function" ? moment : moment.default || moment;
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
    if (
      uri.startsWith("http://") ||
      uri.startsWith("https://") ||
      uri.startsWith("file://") ||
      uri.startsWith("content://")
    ) {
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
      : item.reschedule_time
      ? formatTime(item.reschedule_time)
      : "TBD";

    const customerName =
      item.user?.name || item.customer_name || item.client_name || item.customer?.name || "Client";
    const customerPhone = item.user?.phone || item.customer_phone || "";
    const customerAvatar = resolveImage(
      item.user?.profile_image || item.customer_avatar || item.customer?.profile_image
    );

    const priceValue = Number(item.final_amount || item.total_price || item.remaining_amount || 0);

    return (
      <View style={styles.card}>
        <View style={styles.topSection}>
          <Image source={{ uri: customerAvatar }} style={styles.avatar} />
          <View style={styles.infoContainer}>
            <View style={styles.namePriceRow}>
              <Text style={styles.name} numberOfLines={1}>{customerName}</Text>
              <Text style={styles.price}>₹{priceValue.toLocaleString("en-IN")}</Text>
            </View>

            {customerPhone ? (
              <View style={styles.row}>
                <Ionicons name="call" size={12} color="#E91E63" />
                <Text style={styles.phoneText}>+91 {customerPhone}</Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <Ionicons name="sparkles" size={12} color="#701DDB" />
              <Text style={styles.service}>{item.service?.specialization_name || "Mehndi Service"}</Text>
            </View>

            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={12} color="#6B7280" />
              <Text style={styles.date}>
                {dateStr} • {timeStr}
              </Text>
            </View>

            {Boolean(item.address || item.landmark) && (
              <View style={[styles.row, { marginTop: 4, alignItems: "flex-start" }]}>
                <Ionicons name="location-outline" size={12} color="#9CA3AF" style={{ marginTop: 2 }} />
                <Text style={styles.addressText} numberOfLines={2}>
                  {item.address} {item.landmark ? `(Landmark: ${item.landmark})` : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        {activeTab === "Pending" && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(item.id || item.booking_id || item.bookingId)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={15} color="#DC2626" />
              <Text style={styles.rejectButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAccept(item.id || item.booking_id || item.bookingId)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accept Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab !== "Pending" && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() =>
                navigation.navigate("BookingDetails", {
                  bookingId: item.id || item.booking_id || item.bookingId
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.viewButtonText}>View Status & Service Flow</Text>
              <Ionicons name="arrow-forward" size={14} color="#E91E63" />
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
        {["Pending", "Accepted", "Completed", "Cancelled"].map((tab) => (
          <TouchableOpacity key={tab} style={styles.tabButton} onPress={() => setActiveTab(tab)} activeOpacity={0.75}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            {activeTab === tab && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "Pending" && filteredData.length > 0 && (
        <View style={styles.bulkActionContainer}>
          <TouchableOpacity style={styles.bulkAcceptButton} onPress={handleAcceptAll} activeOpacity={0.85}>
            <Ionicons name="checkmark-done" size={16} color={Colors.white} />
            <Text style={styles.bulkButtonText}>Accept All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkDeclineButton} onPress={handleDeclineAll} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={16} color="#DC2626" />
            <Text style={styles.bulkDeclineButtonText}>Decline All</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="archive-outline" size={36} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Inbox Clean</Text>
          <Text style={styles.emptySubtitle}>No booking requests found under this category.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#E91E63"]} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FA"
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1F2937"
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF"
  },
  activeTabText: {
    color: "#E91E63",
    fontWeight: "800"
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    width: 32,
    height: 3,
    borderRadius: 10,
    backgroundColor: "#E91E63"
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  topSection: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#FCE7F3",
    backgroundColor: "#F9FAFB"
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12
  },
  namePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
    flex: 1,
    marginRight: 8
  },
  price: {
    fontSize: 16,
    fontWeight: "900",
    color: "#E91E63"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4
  },
  phoneText: {
    fontSize: 11.5,
    color: "#E91E63",
    fontWeight: "700"
  },
  service: {
    fontSize: 11.5,
    color: "#4B5563",
    fontWeight: "600"
  },
  date: {
    fontSize: 11.5,
    color: "#6B7280",
    fontWeight: "500"
  },
  addressText: {
    fontSize: 11.5,
    color: "#9CA3AF",
    flex: 1,
    lineHeight: 16
  },
  actionContainer: {
    flexDirection: "row",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    gap: 10
  },
  acceptButton: {
    flex: 1.5,
    flexDirection: "row",
    height: 44,
    backgroundColor: "#059669",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    height: 44,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 4
  },
  rejectButtonText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 13
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    height: 44,
    borderWidth: 1.2,
    borderColor: "#FCE7F3",
    backgroundColor: "#FFF8FA",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6
  },
  viewButtonText: {
    color: "#E91E63",
    fontWeight: "800",
    fontSize: 13
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937"
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4
  },
  bulkActionContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10
  },
  bulkAcceptButton: {
    flex: 1.5,
    flexDirection: "row",
    height: 44,
    backgroundColor: "#059669",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  bulkButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13
  },
  bulkDeclineButton: {
    flex: 1,
    flexDirection: "row",
    height: 44,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 4
  },
  bulkDeclineButtonText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 13
  }
});
