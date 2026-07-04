import React, { useState, useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Modal
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { getPriceDetails, createBooking, createRazorpayOrder, verifyPayment } from "../../services/booking";
import { getArtistById } from "../../services/customer";

export default function BookingSummaryScreen({ route, navigation }) {
  const params = route.params || {};
  const {
    artistId,
    serviceId,
    selectedDate,
    slotId,
    timeLabel,
    address,
    landmark,
    latitude,
    longitude
  } = params;

  // Data states
  const [artist, setArtist] = useState(null);
  const [priceDetails, setPriceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // String of applied code

  const fetchPricingAndArtist = async (couponCode = null) => {
    try {
      const slotIds = Array.isArray(slotId) ? slotId : (slotId ? [slotId] : []);
      const slotCount = slotIds.length > 0 ? slotIds.length : 1;
      const [artistData, pricing] = await Promise.all([
        getArtistById(artistId),
        getPriceDetails(serviceId, couponCode, slotCount)
      ]);
      setArtist(artistData);
      setPriceDetails(pricing);
      if (couponCode) {
        setAppliedCoupon(couponCode);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to retrieve booking cost estimates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!artistId || !serviceId) {
      Alert.alert("Error", "Invalid booking route context.");
      navigation.goBack();
      return;
    }
    const timer = setTimeout(() => {
      fetchPricingAndArtist();
    }, 0);
    return () => clearTimeout(timer);
  }, [artistId, serviceId]);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) {
      Alert.alert("Error", "Please enter a coupon code.");
      return;
    }
    setLoading(true);
    fetchPricingAndArtist(couponInput.trim().toUpperCase());
  };

  const handleRemoveCoupon = () => {
    setLoading(true);
    setCouponInput("");
    setAppliedCoupon(null);
    fetchPricingAndArtist();
  };

  const handleProceedToPayment = async () => {
    setSubmitting(true);
    try {
      // 1. Create booking record
      const bookingData = {
        artistId,
        serviceId,
        slotId,
        address,
        landmark,
        notes: notes.trim() || null,
        couponCode: appliedCoupon,
        latitude,
        longitude,
        selectedDate,
        timeLabel
      };

      const newBooking = await createBooking(bookingData);

      // 2. Navigate to secure Payment screen passing real booking details
      navigation.navigate("Payment", {
        bookingId: newBooking.id,
        bookingCode: newBooking.booking_code,
        finalAmount: priceDetails.finalAmount
      });
    } catch (err) {
      Alert.alert("Booking Failed", err.message || "Failed to initiate payment checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          
          {/* Artist details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Professional Artist</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{artist?.user?.name || "Mehndi Specialist"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Experience</Text>
              <Text style={styles.value}>{artist?.experience_years || 5} Years</Text>
            </View>
          </View>

          {/* Date and time slot details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Schedule details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{selectedDate ? selectedDate.replace(/-/g, "/") : ""}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Time Slot</Text>
              <Text style={styles.value}>{timeLabel}</Text>
            </View>
          </View>

          {/* Visit location address */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Visit Address</Text>
            <Text style={styles.address}>{address}</Text>
            {landmark ? (
              <Text style={[styles.address, { fontStyle: "italic", marginTop: 4 }]}>
                📍 Landmark: {landmark}
              </Text>
            ) : null}
          </View>

          {/* Coupon codes panel */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Promotional Coupon</Text>
            {!appliedCoupon ? (
              <View style={{ flexDirection: "column" }}>
                <View style={styles.couponForm}>
                  <TextInput
                    placeholder="Enter Code (e.g. TEEJ20)"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.couponInput}
                    value={couponInput}
                    onChangeText={setCouponInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCoupon}>
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={{ marginTop: 10, alignSelf: "flex-start" }}
                  onPress={() => navigation.navigate("Coupons", {
                    onSelectCoupon: (code) => {
                      setCouponInput(code);
                      setLoading(true);
                      fetchPricingAndArtist(code);
                    }
                  })}
                >
                  <Text style={{ color: Colors.primary, fontWeight: "700", fontSize: 13 }}>
                    View Available Coupons & Offers →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.couponAppliedRow}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                <Text style={styles.couponAppliedText}>Code {appliedCoupon} Applied</Text>
                <TouchableOpacity onPress={handleRemoveCoupon}>
                  <Text style={styles.removeCouponText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Booking notes inputs */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Additional Notes</Text>
            <TextInput
              placeholder="Any specific design requests or instructions..."
              placeholderTextColor={Colors.textTertiary}
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          {/* Pricing calculations details */}
          {priceDetails && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Price Breakdown</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Service Base Price</Text>
                <Text style={styles.value}>₹{priceDetails.servicePrice}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Travel Charges</Text>
                <Text style={styles.value}>₹{priceDetails.travelCharges}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Platform Fee</Text>
                <Text style={styles.value}>₹{priceDetails.platformFee}</Text>
              </View>
              {priceDetails.couponDiscount > 0 && (
                <View style={styles.row}>
                  <Text style={[styles.label, { color: Colors.primary }]}>Discount</Text>
                  <Text style={[styles.value, { color: Colors.primary }]}>
                    -₹{priceDetails.couponDiscount}
                  </Text>
                </View>
              )}
              <View style={styles.row}>
                <Text style={styles.label}>GST (18%)</Text>
                <Text style={styles.value}>₹{priceDetails.gst}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.totalLabel}>Total Payable Amount</Text>
                <Text style={styles.totalAmount}>₹{priceDetails.finalAmount}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Booking Checkout proceed Button */}
      <View style={styles.footer}>
        <CustomButton
          title={submitting ? "Initiating Order..." : "Proceed To Payment"}
          disabled={loading || submitting}
          onPress={handleProceedToPayment}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingBottom: 120, paddingTop: 12 },
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.white, borderRadius: 14, padding: 14, elevation: 1 },
  cardTitle: { fontSize: 13, fontWeight: "700", marginBottom: 12, color: Colors.text },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: 8 },
  label: { fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 13, fontWeight: "600", color: Colors.text, flex: 1, textAlign: "right", marginLeft: 16 },
  address: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  couponForm: { flexDirection: "row" },
  couponInput: { flex: 1, height: 40, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 12, color: Colors.text },
  applyBtn: { marginLeft: 8, paddingHorizontal: 16, height: 40, backgroundColor: Colors.primary, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  applyBtnText: { color: Colors.white, fontSize: 12, fontWeight: "700" },
  couponAppliedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  couponAppliedText: { flex: 1, marginLeft: 8, fontSize: 12, fontWeight: "700", color: Colors.primary },
  removeCouponText: { fontSize: 12, color: Colors.error, fontWeight: "600" },
  notesInput: { height: 60, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: Colors.text, textAlignVertical: "top" },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  totalLabel: { fontSize: 14, fontWeight: "700" },
  totalAmount: { fontSize: 16, fontWeight: "800", color: Colors.primary },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: Colors.white, borderRadius: 18, padding: 20, alignItems: "center" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 15, fontWeight: "800", color: Colors.text, marginLeft: 8 },
  modalLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  modalAmountText: { fontSize: 18, fontWeight: "800", color: Colors.primary, marginBottom: 12 },
  modalDesc: { fontSize: 12, color: Colors.textTertiary, textAlign: "center", marginBottom: 20, lineHeight: 18 },
  simulateBtn: { width: "100%", height: 44, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  simulateBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 }
});
