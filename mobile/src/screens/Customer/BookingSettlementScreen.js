import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { getBookingDetails } from "../../services/booking";

const resolveImage = (uri) => {
  if (!uri || typeof uri !== "string") return null;
  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("data:")) return uri;
  if (uri.startsWith("/")) {
    const { BASE_URL } = require("../../services/api");
    return `${BASE_URL}${uri}`;
  }
  return uri;
};

export default function BookingSettlementScreen({ route, navigation }) {
  const { bookingId } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      const data = await getBookingDetails(bookingId);
      setBooking(data);
    } catch (e) {
      Alert.alert("Error", "Could not load booking details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bookingId) {
      Alert.alert("Error", "Missing booking ID parameter.");
      navigation.goBack();
      return;
    }
    fetchDetails();
  }, [bookingId]);

  const handlePayOnline = () => {
    if (!booking) return;
    navigation.navigate("Payment", {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      finalAmount: booking.remaining_amount || booking.final_amount,

      isSettlement: true
    });
  };

  if (loading || !booking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentDetailedStatus = booking.detailed_status || booking.booking_status || "PENDING";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Settlement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.artistCard}>
          <Image
            source={{ uri: resolveImage(booking.artist?.user?.profile_image) || resolveImage(booking.artist_image) || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300" }}
            style={styles.avatar}
          />
          <Text style={styles.artistName}>{booking.artist?.user?.name || booking.artist_name || booking.artist?.business_name || "Mehndi Specialist"}</Text>
          <Text style={styles.bookingCode}>Booking Reference ID: #{booking.booking_code || (`MG-${String(booking.id).padStart(6, "0")}`)}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Settlement Details</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Booking Date</Text>
            <Text style={styles.value}>
              {booking.booking_date || booking.bookingDate || booking.slot?.date || (booking.slot?.start_time ? new Date(booking.slot.start_time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : (booking.reschedule_date || "As Scheduled"))}
            </Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Total Price Amount</Text>
<<<<<<< HEAD
            <Text style={styles.value}>₹{booking.total_price || booking.final_amount}</Text>

=======
            <Text style={styles.value}>₹{booking.customer_total_amount ?? booking.total_amount ?? booking.total_price ?? booking.final_amount ?? 0}</Text>
>>>>>>> 3d724d199dd5257dfe28c46b3e3429559b9d412b
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Advance Paid</Text>
            <Text style={styles.value}>₹{booking.advance_paid ?? 0}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Remaining Payable Amount</Text>
<<<<<<< HEAD
            <Text style={[styles.value, { color: Colors.primary, fontWeight: "800" }]}>₹{booking.remaining_amount || booking.final_amount}</Text>

=======
            <Text style={[styles.value, { color: Colors.primary, fontWeight: "800" }]}>
              ₹{booking.remaining_amount ?? booking.remainingAmount ?? 0}
            </Text>
>>>>>>> 3d724d199dd5257dfe28c46b3e3429559b9d412b
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Payment Status</Text>
            <Text style={[styles.value, { color: String(booking.payment_status).toUpperCase() === "PAID" ? Colors.success : Colors.primary }]}>
              {booking.payment_status || "pending"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Detailed Status</Text>
            <Text style={styles.value}>{currentDetailedStatus}</Text>
          </View>
        </View>

        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <TouchableOpacity style={styles.optionBtn} onPress={handlePayOnline} disabled={actionLoading} activeOpacity={0.8}>
            <View style={styles.optionLeft}>
              <Ionicons name="card" size={22} color={Colors.primary} />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Pay Online</Text>
                <Text style={styles.optionSubtitle}>Secure payment using UPI, Cards, Net Banking or Wallet</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 60 },
  artistCard: { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  artistName: { fontSize: 16, fontWeight: "800", color: Colors.text },
  bookingCode: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  detailsCard: { marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border + "10" },
  label: { fontSize: 12, color: Colors.textSecondary },
  value: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  optionsContainer: { margin: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, marginBottom: 12 },
  optionBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  optionLeft: { flexDirection: "row", alignItems: "center" },
  optionText: { marginLeft: 14 },
  optionTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  optionSubtitle: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 }
});
