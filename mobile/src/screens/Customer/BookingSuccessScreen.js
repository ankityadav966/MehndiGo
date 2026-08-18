import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  ScrollView,
  ActivityIndicator,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { getBookingDetails } from "../../services/booking";
import moment from "moment";

export default function BookingSuccessScreen({ route, navigation }) {
  const { bookingId, bookingCode: paramCode } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scaleAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true
    }).start();

    const loadData = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      try {
        const details = await getBookingDetails(bookingId);
        setBooking(details);
      } catch (err) {
        console.log("Error loading booking details in BookingSuccessScreen:", err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [bookingId, scaleAnim]);

  const bookingCode = booking?.booking_code || paramCode || (bookingId ? `MG-${bookingId}` : "MG-CONFIRMED");
  const artistName = booking?.artist_name || booking?.artist?.user?.name || "Mehndi Artist";
  const artistImage = booking?.artist_image || booking?.artist?.user?.profile_image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200";
  const serviceName = booking?.service_name || booking?.service?.specialization_name || "Bridal Mehndi Service";
  const rawDate = booking?.selected_date || booking?.date;
  const formattedDate = rawDate ? moment(rawDate).format("ddd, DD MMMM YYYY") : "Scheduled Date";
  const timeSlot = booking?.time_slot || booking?.slot_time || "10:00 AM - 11:00 AM";
  const totalAmount = Number(booking?.total_amount || booking?.final_amount || 0);
  const advancePaid = Number(booking?.advance_amount || booking?.advance_paid || Math.round(totalAmount * 0.10));
  const remainingDue = Number(booking?.remaining_amount !== undefined ? booking.remaining_amount : (totalAmount - advancePaid));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animated Success Badge */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.badgeOuter}>
            <View style={styles.badgeInner}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>

        <Text style={styles.title}>Booking Confirmed! 🎉</Text>
        <Text style={styles.subtitle}>
          Your 10% advance deposit is held securely in escrow. Your artist has been notified and will confirm shortly.
        </Text>

        {/* Escrow Guarantee Banner */}
        <View style={styles.escrowBanner}>
          <Ionicons name="shield-checkmark" size={16} color="#059669" />
          <Text style={styles.escrowText}>100% Escrow Advance Protection Active</Text>
        </View>

        {/* Dynamic Booking Details Card */}
        <View style={styles.bookingCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.bookingRefLabel}>Booking Reference</Text>
            <Text style={styles.bookingRefValue}>#{bookingCode}</Text>
          </View>

          <View style={styles.divider} />

          {loading ? (
            <ActivityIndicator size="small" color="#E91E63" style={{ paddingVertical: 16 }} />
          ) : (
            <>
              {/* Artist Row */}
              <View style={styles.artistRow}>
                <Image source={{ uri: artistImage }} style={styles.avatar} />
                <View style={styles.artistInfo}>
                  <Text style={styles.artistName}>{artistName}</Text>
                  <Text style={styles.serviceName}>{serviceName}</Text>
                </View>
              </View>

              <View style={styles.dividerLight} />

              {/* Schedule Info */}
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={15} color="#701DDB" />
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailValue}>{formattedDate} • {timeSlot}</Text>
              </View>

              {booking?.address && (
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={15} color="#E91E63" />
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{booking.address}</Text>
                </View>
              )}

              <View style={styles.dividerLight} />

              {/* Financial Snapshot */}
              <View style={styles.financeGrid}>
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>Advance Paid</Text>
                  <Text style={[styles.financeValue, { color: "#059669" }]}>₹{advancePaid}</Text>
                </View>
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>Pay After Service</Text>
                  <Text style={styles.financeValue}>₹{remainingDue}</Text>
                </View>
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>Total Amount</Text>
                  <Text style={[styles.financeValue, { color: "#E91E63" }]}>₹{totalAmount}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer CTAs */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("CustomerTabs", { screen: "Home" })}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            if (bookingId) {
              navigation.navigate("BookingDetails", { bookingId, id: bookingId });
            } else {
              navigation.navigate("CustomerTabs", { screen: "Bookings" });
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>View Booking</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center"
  },
  iconContainer: {
    marginBottom: 16
  },
  badgeOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4
  },
  badgeInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#212121",
    textAlign: "center"
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12
  },
  escrowBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 6
  },
  escrowText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46"
  },
  bookingCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  bookingRefLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280"
  },
  bookingRefValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#E91E63"
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12
  },
  dividerLight: {
    height: 1,
    backgroundColor: "#F9FAFB",
    marginVertical: 10
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#FCE7F3"
  },
  artistInfo: {
    marginLeft: 10,
    flex: 1
  },
  artistName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121"
  },
  serviceName: {
    fontSize: 12,
    color: "#E91E63",
    fontWeight: "600",
    marginTop: 2
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
    gap: 6
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280"
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#212121",
    flex: 1
  },
  financeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 12
  },
  financeItem: {
    alignItems: "center",
    flex: 1
  },
  financeLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600"
  },
  financeValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#212121",
    marginTop: 2
  },
  footerRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
    gap: 12
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center"
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#212121"
  },
  primaryBtn: {
    flex: 2,
    flexDirection: "row",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  }
});
