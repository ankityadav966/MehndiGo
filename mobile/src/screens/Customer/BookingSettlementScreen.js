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
import { getBookingDetails, selectCashPayment } from "../../services/booking";

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
      finalAmount: booking.final_amount,

      isSettlement: true
    });
  };

  const handlePayCash = async () => {
    setActionLoading(true);
    try {
      await selectCashPayment(bookingId);
      Alert.alert(
        "Waiting for Artist Confirmation",
        "Your cash payment request has been sent to the artist. You will be notified once the artist confirms payment.",
        [
          {
            text: "OK",
            onPress: () => {
              fetchDetails();
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to submit cash selection request.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !booking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentDetailedStatus = booking.detailed_status || booking.booking_status || "PENDING";
  const isAwaitingCash = currentDetailedStatus === "AWAITING_CASH_CONFIRMATION";

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
            source={{ uri: booking.artist?.user?.profile_image || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300" }}
            style={styles.avatar}
          />
          <Text style={styles.artistName}>{booking.artist?.user?.name || "Professional Specialist"}</Text>
          <Text style={styles.bookingCode}>Booking Reference ID: #{booking.booking_code}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Settlement Details</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Booking Date</Text>
            <Text style={styles.value}>
              {booking.slot?.start_time || booking.slot?.date ? new Date(booking.slot.start_time || booking.slot.date).toLocaleDateString() : (booking.reschedule_date || "TBD")}
            </Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Total Price Amount</Text>
            <Text style={styles.value}>₹{booking.total_price}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Remaining Payable Amount</Text>
            <Text style={[styles.value, { color: Colors.primary, fontWeight: "800" }]}>₹{booking.final_amount}</Text>

          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Payment Status</Text>
            <Text style={[styles.value, { color: booking.payment_status === "PAID" ? Colors.success : Colors.primary }]}>
              {booking.payment_status}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Detailed Status</Text>
            <Text style={styles.value}>{currentDetailedStatus}</Text>
          </View>
        </View>

        {isAwaitingCash ? (
          <View style={styles.waitingCard}>
            <Ionicons name="time" size={24} color="#D97706" />
            <Text style={styles.waitingTitle}>Waiting for Artist Confirmation</Text>
            <Text style={styles.waitingMsg}>
              Your cash payment request has been sent to the artist. You will be notified once the artist confirms payment.
            </Text>
          </View>
        ) : (
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Choose Payment Method</Text>

            <TouchableOpacity style={styles.optionBtn} onPress={handlePayOnline} disabled={actionLoading}>
              <View style={styles.optionLeft}>
                <Ionicons name="card" size={22} color={Colors.primary} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Pay Online</Text>
                  <Text style={styles.optionSubtitle}>Secure payment using UPI, Card or Wallet</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionBtn, { marginTop: 12 }]} onPress={handlePayCash} disabled={actionLoading}>
              <View style={styles.optionLeft}>
                <Ionicons name="cash" size={22} color={Colors.success} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Cash Payment</Text>
                  <Text style={styles.optionSubtitle}>Pay the Mehendi Artist physically in hand</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
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
  optionSubtitle: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  waitingCard: { margin: 16, backgroundColor: "#FEF3C7", borderRadius: 16, padding: 18, alignItems: "center", borderWidth: 1, borderColor: "#F59E0B" },
  waitingTitle: { fontSize: 14, fontWeight: "700", color: "#D97706", marginTop: 8, marginBottom: 6 },
  waitingMsg: { fontSize: 12, color: "#92400E", textAlign: "center", lineHeight: 18 }
});
