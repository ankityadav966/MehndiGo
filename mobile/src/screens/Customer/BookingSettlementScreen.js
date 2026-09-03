import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import OptimizedImage from "../../components/OptimizedImage";
import { getBookingDetails, selectCashPayment } from "../../services/booking";

export default function BookingSettlementScreen({ route, navigation }) {
  const bookingId = route.params?.bookingId || route.params?.id || route.params?.booking_id;

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
    const unsubscribe = navigation.addListener("focus", () => {
      fetchDetails();
    });
    return unsubscribe;
  }, [bookingId, navigation]);

  const handlePayOnline = () => {
    if (!booking) return;
    navigation.navigate("Payment", {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      finalAmount: booking.remaining_amount !== undefined ? booking.remaining_amount : booking.final_amount,
      advanceAmount: booking.advance_amount || booking.advance_paid,
      remainingAmount: booking.remaining_amount,
      artistName: booking.artist_name || booking.artist?.user?.name,
      serviceTitle: booking.service_name || booking.service_title,
      isSettlement: true
    });
  };

  const handlePayCash = async () => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await selectCashPayment(booking.id);
      Alert.alert(
        "Cash Payment Selected 💵",
        `Please hand ₹${booking.remaining_amount || 0} to the artist. The artist will confirm cash receipt on their app.`,
        [
          {
            text: "View Booking Details",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: "BookingDetails",
                    params: { bookingId: booking.id }
                  }
                ]
              });
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to select cash payment.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !booking) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.loadingText}>Loading settlement details...</Text>
      </SafeAreaView>
    );
  }

  const totalAmount = Number(booking.total_amount || booking.final_amount || 0);
  const advanceAmount = Number(booking.advance_amount || booking.advance_paid || Math.round(totalAmount * 0.10));
  const remainingAmount = Number(booking.remaining_amount !== undefined ? booking.remaining_amount : (totalAmount - advanceAmount));

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#212121" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Final Settlement</Text>
          <Text style={styles.headerSubtitle}>#{booking.booking_code || `MG-${booking.id}`}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 2. Artist Card */}
        <View style={styles.artistCard}>
          <OptimizedImage
            source={{ uri: booking.artist?.user?.profile_image || booking.artist_image || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300" }}
            style={styles.avatar}
          />
          <Text style={styles.artistName}>
            {booking.artist?.user?.name || booking.artist_name || "Mehndi Specialist"}
          </Text>
          <Text style={styles.serviceName}>{booking.service_name || "Mehndi Application Complete"}</Text>
        </View>

        {/* 3. Settlement Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Breakdown</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Total Service Amount</Text>
            <Text style={styles.value}>₹{totalAmount}</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: "#059669" }]}>10% Advance Deposit Paid (Escrow)</Text>
            <Text style={[styles.value, { color: "#059669" }]}>- ₹{advanceAmount}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowHighlight}>
            <View>
              <Text style={styles.highlightLabel}>REMAINING BALANCE DUE</Text>
              <Text style={styles.highlightSub}>To be settled directly to complete booking</Text>
            </View>
            <Text style={styles.highlightVal}>₹{remainingAmount}</Text>
          </View>
        </View>

        {/* 4. Payment Options */}
        <Text style={styles.sectionTitle}>Choose Settlement Method</Text>

        {/* Pay Online */}
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={handlePayOnline}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.optionIconBox, { backgroundColor: "#FDF2F8" }]}>
              <Ionicons name="card" size={22} color="#E91E63" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Pay Online (UPI / Cards)</Text>
              <Text style={styles.optionSubtitle}>Instant settlement via Google Pay, PhonePe, Cards</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#E91E63" />
        </TouchableOpacity>

        {/* Pay Cash */}
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={handlePayCash}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.optionIconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="cash" size={22} color="#059669" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Pay Cash to Artist</Text>
              <Text style={styles.optionSubtitle}>Hand ₹{remainingAmount} in cash to the artist directly</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#059669" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 10,
    fontWeight: "600"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitleContainer: {
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121"
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40
  },
  artistCard: {
    alignItems: "center",
    backgroundColor: "#FDF2F8",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FCE7F3"
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8
  },
  artistName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121"
  },
  serviceName: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121",
    marginBottom: 12
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  label: {
    fontSize: 13,
    color: "#4B5563"
  },
  value: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10
  },
  rowHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF5F8",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCE7F3"
  },
  highlightLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E91E63",
    letterSpacing: 0.5
  },
  highlightSub: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2
  },
  highlightVal: {
    fontSize: 22,
    fontWeight: "900",
    color: "#E91E63"
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121",
    marginBottom: 10
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  optionText: {
    flex: 1,
    marginLeft: 12
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#212121"
  },
  optionSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2
  }
});
