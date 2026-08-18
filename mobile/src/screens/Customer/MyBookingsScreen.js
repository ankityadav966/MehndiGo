import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { getBookingHistory } from "../../services/booking";

const getMoment = () => {
  const m = require("moment");
  return typeof m === "function" ? m : (m.default || m);
};

export default function MyBookingsScreen({ navigation }) {
  const { isDarkMode } = useAuth();

  const currentBgColor = isDarkMode ? "#0F0F11" : "#F9FAFB";
  const currentCardBg = isDarkMode ? "#1A1A1E" : "#FFFFFF";
  const currentTextColor = isDarkMode ? "#FFFFFF" : "#111827";
  const currentSecTextColor = isDarkMode ? "#9CA3AF" : "#6B7280";
  const currentBorderColor = isDarkMode ? "#27272A" : "#E5E7EB";

  const [selectedTab, setSelectedTab] = useState("All");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const LOCAL_CATEGORY_IMAGES = {
    bridal: require("../../assets/images/categories/bridal.png"),
    royal: require("../../assets/images/categories/royal.png"),
    arabic: require("../../assets/images/categories/arabic.png"),
    traditional: require("../../assets/images/categories/traditional.png"),
    floral: require("../../assets/images/categories/floral.png"),
    minimal: require("../../assets/images/categories/minimal.png"),
    custom: require("../../assets/images/categories/custom.png")
  };

  const getCategoryFallback = (item) => {
    const name = (item?.service?.specialization_name || item?.service?.category || "").toLowerCase();
    if (name.includes("bridal") || name.includes("royal")) return LOCAL_CATEGORY_IMAGES.bridal;
    if (name.includes("arabic")) return LOCAL_CATEGORY_IMAGES.arabic;
    if (name.includes("traditional")) return LOCAL_CATEGORY_IMAGES.traditional;
    if (name.includes("minimal")) return LOCAL_CATEGORY_IMAGES.minimal;
    return LOCAL_CATEGORY_IMAGES.custom;
  };

  const resolveBookingImage = (item) => {
    if (imageErrors[item.id]) {
      return getCategoryFallback(item);
    }
    const rawUri = item?.artist_image || item?.artist?.profile_image || item?.artist?.user?.profile_image || item?.service?.image;
    if (!rawUri || typeof rawUri !== "string") {
      return getCategoryFallback(item);
    }
    if (rawUri.startsWith("http://") || rawUri.startsWith("https://") || rawUri.startsWith("file://")) {
      return { uri: rawUri };
    }
    const { BASE_URL } = require("../../services/api");
    const cleanBase = (BASE_URL || "").replace(/\/api\/v1\/?$/, "");
    const cleanPath = rawUri.startsWith("/") ? rawUri : `/${rawUri}`;
    return { uri: `${cleanBase}${cleanPath}` };
  };

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getBookingHistory();
      setBookings(data || []);
    } catch (e) {
      console.log("Failed to fetch booking history:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchHistory();
    });
    return unsubscribe;
  }, [navigation, fetchHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const getFilteredBookings = () => {
    return bookings.filter((item) => {
      const status = String(item.detailed_status || item.booking_status || item.status || "").toUpperCase();
      if (selectedTab === "All") return true;
      if (selectedTab === "Pending") {
        return ["PENDING", "VIEWED", "CONFIRMED", "WAITING_FOR_USER_PAYMENT"].includes(status);
      } else if (selectedTab === "Accepted") {
        return ["ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "ARTIST_ARRIVED", "SERVICE_STARTED", "RESCHEDULED", "CASH_PAYMENT_PENDING", "ON_THE_WAY", "IN_PROGRESS"].includes(status);
      } else if (selectedTab === "Completed") {
        return ["COMPLETED", "AWAITING_CASH_CONFIRMATION", "COMPLETED_CLOSED"].includes(status);
      } else {
        return ["CANCELLED", "REJECTED", "REFUNDED"].includes(status);
      }
    });
  };

  const filteredData = getFilteredBookings();

  const getStatusBadgeConfig = (statusStr) => {
    const st = String(statusStr || "").toUpperCase();
    if (["COMPLETED", "COMPLETED_CLOSED", "AWAITING_CASH_CONFIRMATION"].includes(st)) {
      return { bg: "#EFF6FF", text: "#1D4ED8", label: "Completed" };
    }
    if (["SERVICE_IN_PROGRESS", "IN_PROGRESS", "PROCESSING", "CUSTOMER_VERIFIED", "SERVICE_STARTED"].includes(st)) {
      return { bg: "#FCE7F3", text: "#E91E63", label: "In Progress" };
    }
    if (["ARTIST_ARRIVED", "ARRIVED"].includes(st)) {
      return { bg: "#DBEAFE", text: "#2563EB", label: "Arrived" };
    }
    if (["ARTIST_ON_THE_WAY", "ON_THE_WAY"].includes(st)) {
      return { bg: "#EDE9FE", text: "#701DDB", label: "On The Way" };
    }
    if (["ARTIST_ACCEPTED", "ACCEPTED"].includes(st)) {
      return { bg: "#ECFDF5", text: "#047857", label: "Confirmed" };
    }
    if (["PENDING", "VIEWED", "CONFIRMED", "WAITING_FOR_USER_PAYMENT"].includes(st)) {
      return { bg: "#FFFBEB", text: "#D97706", label: "Pending" };
    }
    return { bg: "#FEF2F2", text: "#DC2626", label: "Cancelled" };
  };

  const formatTime = (timeVal) => {
    if (!timeVal) return "";
    const localMoment = getMoment();
    return localMoment(timeVal, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm:ssZ", "HH:mm:ss", "HH:mm"]).format("hh:mm A");
  };

  const renderBookingCard = ({ item }) => {
    const status = item.detailed_status || item.booking_status || "PENDING";
    const statusConfig = getStatusBadgeConfig(status);
    const localMoment = getMoment();
    
    const rawDate = item.booking_date || item.date || item.event_date || item.reschedule_date || item.slot?.date || item.slot?.start_time || item.created_at;
    let dateStr = rawDate ? localMoment(rawDate).format("DD MMM YYYY") : "Today";

    const rawTime = item.booking_time || item.time || item.time_slot || item.reschedule_time || (item.slot ? `${formatTime(item.slot.start_time)} - ${formatTime(item.slot.end_time)}` : null) || item.slot?.time_label;
    let timeStr = rawTime ? (rawTime.includes("AM") || rawTime.includes("PM") || rawTime.includes("-") ? rawTime : formatTime(rawTime)) : "TBD";

    const isLiveBooking = ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "ON_THE_WAY", "ARTIST_ARRIVED", "ARRIVED", "SERVICE_STARTED", "SERVICE_IN_PROGRESS", "IN_PROGRESS", "CHECKOUT"].includes(String(status).toUpperCase());
    const artistName = item.artist_name || item.artist?.user?.name || item.service_title || item.service?.specialization_name || "Mehndi Booking";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}
        onPress={() => navigation.navigate("BookingDetails", { bookingId: item.id, id: item.id })}
      >
        {/* Top Header */}
        <View style={styles.cardTopRow}>
          <Image
            source={resolveBookingImage(item)}
            onError={() => setImageErrors((prev) => ({ ...prev, [item.id]: true }))}
            style={styles.artistAvatar}
          />
          <View style={styles.cardHeaderInfo}>
            <View style={styles.titleStatusRow}>
              <Text numberOfLines={1} style={[styles.bookingTitle, { color: currentTextColor }]}>
                {artistName}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
              </View>
            </View>

            <View style={styles.codeRow}>
              <Text style={[styles.codeTag, { color: currentSecTextColor }]}>Ref: #{item.booking_code || item.id}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: currentBorderColor }]} />

        {/* Schedule & Price Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.detailText, { color: currentTextColor }]}>{dateStr}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.detailText, { color: currentTextColor }]}>{timeStr}</Text>
          </View>
          <View style={styles.detailItemEnd}>
            <Text style={styles.priceLabel}>Amount</Text>
            <Text style={styles.priceValue}>₹{item.final_amount || item.remaining_amount}</Text>
          </View>
        </View>

        {/* Live Booking Quick Action Buttons (Call / Chat) */}
        {isLiveBooking && (
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => {
                const phone = item.artist?.user?.phone || "9999999999";
                Linking.openURL(`tel:${phone}`);
              }}
            >
              <Ionicons name="call" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.callBtnText}>Call Specialist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => {
                navigation.navigate("ChatRoom", {
                  bookingId: item.id,
                  receiverId: item.artist?.user_id || item.artist_id,
                  receiverName: item.artist?.user?.name || "Artist",
                  receiverImage: item.artist?.user?.profile_image
                });
              }}
            >
              <Ionicons name="chatbubbles" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.chatBtnText}>Live Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Link */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerLinkText}>View Order Details & Status</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const filterTabs = ["All", "Pending", "Accepted", "Completed", "Cancelled"];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentBgColor }]} edges={["top"]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={currentBgColor} />

      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: currentTextColor }]}>My Bookings</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{bookings.length} Orders</Text>
        </View>
      </View>

      {/* Status Segmented Tabs */}
      <View style={styles.tabScrollWrap}>
        <FlatList
          horizontal
          data={filterTabs}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => {
            const isSelected = selectedTab === item;
            return (
              <TouchableOpacity
                style={[
                  styles.tabChip,
                  { backgroundColor: isDarkMode ? "#1A1A1E" : "#FFFFFF" },
                  isSelected && styles.tabChipActive
                ]}
                onPress={() => setSelectedTab(item)}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: currentSecTextColor },
                    isSelected && styles.tabChipTextActive
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="calendar-clear-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: currentTextColor }]}>No {selectedTab} Bookings</Text>
          <Text style={[styles.emptySubtitle, { color: currentSecTextColor }]}>
            You do not have any bookings logged under the {selectedTab} filter.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate("Categories")}
          >
            <Text style={styles.exploreBtnText}>Book Henna Artist</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderBookingCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  countBadge: {
    backgroundColor: "#FFF0F4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary || "#9C1344",
  },
  tabScrollWrap: {
    marginBottom: 12,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tabChipActive: {
    backgroundColor: Colors.primary || "#9C1344",
    borderColor: Colors.primary || "#9C1344",
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 180,
  },

  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  artistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  titleStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  codeRow: {
    marginTop: 4,
  },
  codeTag: {
    fontSize: 12,
    fontWeight: "500",
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailItemEnd: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    textTransform: "uppercase",
    fontWeight: "700",
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primary || "#9C1344",
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    height: 38,
    backgroundColor: Colors.primary || "#9C1344",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  callBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  chatBtn: {
    flex: 1,
    flexDirection: "row",
    height: 38,
    backgroundColor: "#059669",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  chatBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary || "#9C1344",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFF0F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreBtn: {
    backgroundColor: Colors.primary || "#9C1344",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  exploreBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
