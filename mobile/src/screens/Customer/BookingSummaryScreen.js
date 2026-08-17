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
import OptimizedImage from "../../components/OptimizedImage";
import { getPriceDetails, createBooking } from "../../services/booking";
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
    longitude,
    selectedArt
  } = params;

  // Data states
  const [artist, setArtist] = useState(null);
  const [priceDetails, setPriceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Group & Coverage states
  const [groupSize, setGroupSize] = useState(1);
  const [serviceCoverage, setServiceCoverage] = useState("BOTH_HANDS");

  // Form states
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // String of applied code

  const fetchPricingAndArtist = async (couponCode = null, newGroupSize = groupSize, newCoverage = serviceCoverage) => {
    try {
      const [artistData, pricing] = await Promise.all([
        getArtistById(artistId),
        getPriceDetails(serviceId, couponCode, 1, selectedArt?.price, newGroupSize, newCoverage)
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

  const handleGroupSizeChange = (newSize) => {
    if (newSize < 1 || newSize > 10) return;
    setGroupSize(newSize);
    setLoading(true);
    fetchPricingAndArtist(appliedCoupon, newSize, serviceCoverage);
  };

  const handleCoverageChange = (newCoverage) => {
    setServiceCoverage(newCoverage);
    setLoading(true);
    fetchPricingAndArtist(appliedCoupon, groupSize, newCoverage);
  };

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
    fetchPricingAndArtist(null);
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
        timeLabel,
        group_size: groupSize,
        service_coverage: serviceCoverage,
        selectedArt: selectedArt ? {
          id: selectedArt.id,
          title: selectedArt.title,
          image_url: selectedArt.image_url,
          art_tier: selectedArt.art_tier,
          duration_minutes: selectedArt.duration_minutes,
          price: selectedArt.price
        } : null,
        selected_art_id: selectedArt?.id || null,
        selected_art_title: selectedArt?.title || null,
        selected_art_image: selectedArt?.image_url || null,
        selected_art_tier: selectedArt?.art_tier || null,
        selected_art_duration: selectedArt?.duration_minutes ? (Number(selectedArt.duration_minutes) * groupSize) : (60 * groupSize),
        selected_art_price: selectedArt?.price || null
      };

      const newBooking = await createBooking(bookingData);

      // 2. Navigate to secure Payment screen passing real booking details
      navigation.navigate("Payment", {
        bookingId: newBooking.id,
        bookingCode: newBooking.booking_code,
        finalAmount: priceDetails.finalAmount,
        artistId: artistId
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
          
          {/* Temporary 15-min Slot Hold Banner */}
          <View style={{ backgroundColor: "#FEF3C7", borderColor: "#F59E0B", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 20, marginRight: 8 }}>⏱️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400E" }}>15-Minute Slot Hold Active</Text>
              <Text style={{ fontSize: 11, color: "#B45309" }}>This slot is reserved for you. Complete payment to confirm booking.</Text>
            </View>
          </View>

          {/* Group Size & Coverage Options */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>People & Coverage</Text>
            
            {/* Group Size Counter */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text }}>Number of Persons</Text>
                <Text style={{ fontSize: 11, color: Colors.textSecondary }}>Dynamic duration & pricing calculated</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 8, padding: 4 }}>
                <TouchableOpacity onPress={() => handleGroupSizeChange(groupSize - 1)} style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: groupSize > 1 ? Colors.text : "#CBD5E1" }}>-</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 15, fontWeight: "bold", paddingHorizontal: 8, color: Colors.text }}>{groupSize}</Text>
                <TouchableOpacity onPress={() => handleGroupSizeChange(groupSize + 1)} style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: Colors.primary }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Coverage Selector */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Design Coverage</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                { id: "BOTH_HANDS", label: "Both Hands (Standard)" },
                { id: "ONE_HAND", label: "One Hand (-30%)" },
                { id: "FEET_AND_HANDS", label: "Hands & Feet (+50%)" },
                { id: "BRIDAL_FULL", label: "Bridal Full (+50%)" }
              ].map((cov) => (
                <TouchableOpacity
                  key={cov.id}
                  onPress={() => handleCoverageChange(cov.id)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: serviceCoverage === cov.id ? Colors.primary : "#E2E8F0",
                    backgroundColor: serviceCoverage === cov.id ? "#FEF2F2" : "#FFFFFF"
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: serviceCoverage === cov.id ? "700" : "500", color: serviceCoverage === cov.id ? Colors.primary : Colors.text }}>
                    {cov.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selected Art Design Card if applicable */}
          {selectedArt && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Selected Mehndi Art Design</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                {Boolean(selectedArt.image_url) && (
                  <OptimizedImage
                    source={{ uri: selectedArt.image_url }}
                    style={{ width: 56, height: 56, borderRadius: 8, marginRight: 12 }}
                    width={56}
                    height={56}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.text }}>{selectedArt.title || "Custom Art Design"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <View style={{ backgroundColor: selectedArt.art_tier === "PREMIUM" ? "#EDE9FE" : "#F1F5F9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: selectedArt.art_tier === "PREMIUM" ? "#7C3AED" : "#475569" }}>
                        {selectedArt.art_tier === "PREMIUM" ? "💎 PREMIUM ART" : "✨ STANDARD ART"}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.textSecondary }}>⏱️ {(selectedArt.duration_minutes || 60) * groupSize} mins total</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

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
              <Text style={styles.cardTitle}>Bill & Price Breakdown</Text>
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Mehndi Service Rate</Text>
                  <Text style={styles.subTextLabel}>Base price for design & application</Text>
                </View>
                <Text style={styles.value}>₹{priceDetails.servicePrice || priceDetails.basePrice}</Text>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Artist Travel Charge</Text>
                  <Text style={styles.subTextLabel}>0-10 KM Free • 100% Artist Earning</Text>
                </View>
                <Text style={[styles.value, { color: (priceDetails.confirmed_travel_charge || priceDetails.travel_charge || priceDetails.travelCharges || 0) === 0 ? "#10B981" : Colors.text }]}>
                  {(priceDetails.confirmed_travel_charge || priceDetails.travel_charge || priceDetails.travelCharges || 0) === 0 ? "FREE (0-10 KM)" : `₹${priceDetails.confirmed_travel_charge || priceDetails.travel_charge || priceDetails.travelCharges}`}
                </Text>
              </View>

              {(priceDetails.couponDiscount || priceDetails.discount || 0) > 0 && (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: Colors.primary }]}>Promotional Discount</Text>
                    <Text style={[styles.subTextLabel, { color: Colors.primary }]}>Coupon {appliedCoupon || ""} applied</Text>
                  </View>
                  <Text style={[styles.value, { color: Colors.primary, fontWeight: "700" }]}>
                    -₹{priceDetails.couponDiscount || priceDetails.discount}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.totalLabel}>Total Booking Amount</Text>
                <Text style={styles.totalAmount}>₹{priceDetails.finalAmount || priceDetails.totalAmount}</Text>
              </View>

              <View style={styles.splitBreakdownCard}>
                <View style={styles.splitRow}>
                  <Text style={styles.splitLabel}>• Advance Deposit (10% Online):</Text>
                  <Text style={[styles.splitValue, { color: Colors.primary }]}>
                    ₹{priceDetails.requiredAdvance || Math.round((priceDetails.finalAmount || priceDetails.totalAmount || 0) * 0.10)}
                  </Text>
                </View>
                <View style={styles.splitRow}>
                  <Text style={styles.splitLabel}>• Remaining Cash (To Artist):</Text>
                  <Text style={[styles.splitValue, { color: "#10B981" }]}>
                    ₹{Math.max(0, (priceDetails.finalAmount || priceDetails.totalAmount || 0) - (priceDetails.requiredAdvance || Math.round((priceDetails.finalAmount || priceDetails.totalAmount || 0) * 0.10)))}
                  </Text>
                </View>
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
  subTextLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 1 },
  value: { fontSize: 13, fontWeight: "600", color: Colors.text, textAlign: "right" },
  splitBreakdownCard: { marginTop: 10, padding: 10, backgroundColor: "#f9fafb", borderRadius: 8, borderWidth: 1, borderColor: "#f3f4f6" },
  splitRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 3 },
  splitLabel: { fontSize: 11, color: Colors.textSecondary },
  splitValue: { fontSize: 11, fontWeight: "700" },
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
