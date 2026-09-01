import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import OptimizedImage from "../../components/OptimizedImage";
import { getPriceDetails, createBooking } from "../../services/booking";
import { getArtistById } from "../../services/customer";
import { formatServiceDate } from "../../utils/date";

export default function BookingSummaryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const rawParams = route.params || {};

  // Store persistent booking context in ref so parameters are never lost on sub-screen navigation
  const paramsRef = React.useRef({
    artistId: rawParams.artistId || rawParams.artist?.id || rawParams.artist_id,
    serviceId: rawParams.serviceId || rawParams.service?.id || rawParams.service_id || rawParams.selectedArt?.service_id || 1,
    selectedDate: rawParams.selectedDate,
    slotId: rawParams.slotId,
    timeLabel: rawParams.timeLabel,
    address: rawParams.address,
    landmark: rawParams.landmark,
    latitude: rawParams.latitude,
    longitude: rawParams.longitude,
    selectedArt: rawParams.selectedArt,
    packageId: rawParams.packageId
  });

  // Keep params ref up to date if new values arrive
  if (rawParams.artistId || rawParams.artist?.id) paramsRef.current.artistId = rawParams.artistId || rawParams.artist?.id || rawParams.artist_id;
  if (rawParams.serviceId || rawParams.service?.id) paramsRef.current.serviceId = rawParams.serviceId || rawParams.service?.id || rawParams.service_id;
  if (rawParams.selectedDate) paramsRef.current.selectedDate = rawParams.selectedDate;
  if (rawParams.slotId !== undefined) paramsRef.current.slotId = rawParams.slotId;
  if (rawParams.timeLabel) paramsRef.current.timeLabel = rawParams.timeLabel;
  if (rawParams.address) paramsRef.current.address = rawParams.address;
  if (rawParams.landmark !== undefined) paramsRef.current.landmark = rawParams.landmark;
  if (rawParams.latitude !== undefined) paramsRef.current.latitude = rawParams.latitude;
  if (rawParams.longitude !== undefined) paramsRef.current.longitude = rawParams.longitude;
  if (rawParams.selectedArt) paramsRef.current.selectedArt = rawParams.selectedArt;
  if (rawParams.packageId !== undefined) paramsRef.current.packageId = rawParams.packageId;

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
    selectedArt,
    packageId
  } = paramsRef.current;

  // Data states
  const [artist, setArtist] = useState(null);
  const [priceDetails, setPriceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Group & Coverage states
  const [groupSize, setGroupSize] = useState(Number(rawParams.groupSize || rawParams.group_size || 1));
  const [serviceCoverage, setServiceCoverage] = useState(rawParams.serviceCoverage || rawParams.service_coverage || "BOTH_HANDS");

  // Form states
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState(rawParams.selectedCouponCode || rawParams.prefilledCode || "");
  const [appliedCoupon, setAppliedCoupon] = useState(rawParams.selectedCouponCode || rawParams.prefilledCode || null);
  const isFetchingRef = React.useRef(false);

  const fetchPricingAndArtist = useCallback(async (couponCode = null, newGroupSize = 1, newCoverage = "BOTH_HANDS") => {
    const aid = artistId || rawParams.artistId || rawParams.artist?.id || rawParams.artist_id;
    const sid = serviceId || rawParams.serviceId || rawParams.service?.id || 1;
    if (!aid || aid === "undefined") return;

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [artistData, pricing] = await Promise.all([
        getArtistById(aid).catch(() => null),
        getPriceDetails(sid, couponCode, 1, selectedArt?.price, newGroupSize, newCoverage).catch(() => null)
      ]);

      if (artistData) setArtist(artistData);

      const unitRate = Number(selectedArt?.price || artistData?.starting_price || 500);
      const calcBase = unitRate * newGroupSize;

      if (pricing && (pricing.total_amount || pricing.totalAmount || pricing.final_amount || pricing.service_price)) {
        setPriceDetails(pricing);
        const discount = Number(pricing?.couponDiscount || pricing?.coupon_discount || pricing?.discount_amount || 0);
        if (couponCode && discount > 0) {
          setAppliedCoupon(couponCode);
        } else if (couponCode && discount === 0) {
          setAppliedCoupon(null);
        }
      } else {
        const adv = Math.round(calcBase * 0.10);
        setPriceDetails({
          service_price: calcBase,
          servicePrice: calcBase,
          base_price: calcBase,
          basePrice: calcBase,
          unit_rate: unitRate,
          unitRate: unitRate,
          group_size: newGroupSize,
          groupSize: newGroupSize,
          total_amount: calcBase,
          finalAmount: calcBase,
          final_amount: calcBase,
          totalAmount: calcBase,
          advance_amount: adv,
          advanceAmount: adv,
          remaining_amount: Math.max(0, calcBase - adv),
          remainingAmount: Math.max(0, calcBase - adv),
          remainingCash: Math.max(0, calcBase - adv),
          coupon_discount: 0,
          couponDiscount: 0
        });
      }
    } catch (err) {
      if (__DEV__) console.log("Failed to retrieve booking cost estimates:", err.message);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [artistId, serviceId, selectedArt?.price]);

  useEffect(() => {
    const aid = artistId || rawParams.artistId || rawParams.artist?.id;
    if (!aid) {
      Alert.alert("Error", "Invalid booking parameters. Please choose an artist to book.");
      navigation.goBack();
      return;
    }
    fetchPricingAndArtist(appliedCoupon, groupSize, serviceCoverage);
  }, [artistId]);

  useEffect(() => {
    if (route.params?.selectedCouponCode) {
      const code = String(route.params.selectedCouponCode).trim().toUpperCase();
      setCouponInput(code);
      setAppliedCoupon(code);
      fetchPricingAndArtist(code, groupSize, serviceCoverage);
    }
  }, [route.params?.selectedCouponCode, fetchPricingAndArtist, groupSize, serviceCoverage]);

  const handleGroupSizeChange = (newSize) => {
    if (newSize < 1 || newSize > 10) return;
    setGroupSize(newSize);

    // Update local price details immediately for instantaneous UI feedback
    setPriceDetails((prev) => {
      const unitRate = Number(prev?.unitRate || prev?.unit_rate || selectedArt?.price || 500);
      const newBase = unitRate * newSize;
      const disc = Number(prev?.couponDiscount || prev?.coupon_discount || 0);
      const tf = Number(prev?.travelFee || prev?.travel_fee || 0);
      const total = Math.max(10, newBase + tf - disc);
      const adv = Math.round(total * 0.10);
      const rem = Math.max(0, total - adv);
      return {
        ...(prev || {}),
        unit_rate: unitRate,
        unitRate: unitRate,
        group_size: newSize,
        groupSize: newSize,
        service_price: newBase,
        servicePrice: newBase,
        base_price: newBase,
        basePrice: newBase,
        total_amount: total,
        final_amount: total,
        finalAmount: total,
        totalAmount: total,
        advance_amount: adv,
        advanceAmount: adv,
        remaining_amount: rem,
        remainingAmount: rem,
        remainingCash: rem
      };
    });

    setLoading(true);
    fetchPricingAndArtist(appliedCoupon, newSize, serviceCoverage);
  };

  const handleCoverageChange = (newCoverage) => {
    setServiceCoverage(newCoverage);
    setLoading(true);
    fetchPricingAndArtist(appliedCoupon, groupSize, newCoverage);
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      Alert.alert("Error", "Please enter a coupon code.");
      return;
    }
    if (code === appliedCoupon) {
      Alert.alert("Notice", "This coupon is already applied.");
      return;
    }
    setLoading(true);
    try {
      const sid = serviceId || 1;
      const pricing = await getPriceDetails(sid, code, 1, selectedArt?.price, groupSize, serviceCoverage);
      const discount = Number(pricing?.couponDiscount || pricing?.coupon_discount || pricing?.discount_amount || pricing?.discount || 0);
      if (discount > 0) {
        setPriceDetails(pricing);
        setAppliedCoupon(code);
        Alert.alert("Coupon Applied 🎉", `Successfully applied ${code}! Saved ₹${discount}.`);
      } else {
        setAppliedCoupon(null);
        Alert.alert("Coupon Notice", pricing?.message || `Coupon '${code}' requires a higher booking amount or is inactive.`);
      }
    } catch (err) {
      setAppliedCoupon(null);
      Alert.alert("Coupon Error", err.message || "Failed to apply coupon.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setLoading(true);
    setCouponInput("");
    setAppliedCoupon(null);
    try {
      const sid = serviceId || 1;
      const pricing = await getPriceDetails(sid, null, 1, selectedArt?.price, groupSize, serviceCoverage);
      if (pricing) {
        setPriceDetails(pricing);
      } else {
        const unitRate = Number(selectedArt?.price || 500);
        const newBase = unitRate * groupSize;
        const adv = Math.round(newBase * 0.10);
        setPriceDetails({
          service_price: newBase,
          servicePrice: newBase,
          base_price: newBase,
          basePrice: newBase,
          total_amount: newBase,
          finalAmount: newBase,
          advance_amount: adv,
          remaining_amount: Math.max(0, newBase - adv),
          coupon_discount: 0,
          couponDiscount: 0
        });
      }
    } catch (err) {
      if (__DEV__) console.log("Failed to refresh pricing on coupon removal:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    setSubmitting(true);
    try {
      const safeFinal = Number(
        priceDetails?.final_amount ||
        priceDetails?.total_amount ||
        priceDetails?.finalAmount ||
        ((Number(selectedArt?.price || 500) * groupSize))
      );
      const safeAdvance = Number(
        priceDetails?.advance_amount ||
        priceDetails?.advanceAmount ||
        priceDetails?.required_advance ||
        priceDetails?.requiredAdvance ||
        Math.round(safeFinal * 0.10) ||
        50
      );
      const safeRemaining = Math.max(0, safeFinal - safeAdvance);

      const bookingData = {
        artistId: Number(artistId || 1),
        serviceId: Number(serviceId || 1),
        packageId: packageId ? (isNaN(Number(packageId)) ? null : Number(packageId)) : null,
        package_id: packageId ? (isNaN(Number(packageId)) ? null : Number(packageId)) : null,
        slotId: slotId ? (isNaN(Number(slotId)) ? null : Number(slotId)) : null,
        address: String(address || "Jaipur, Rajasthan, 302021"),
        landmark: landmark || null,
        notes: (notes || "").trim() || null,
        couponCode: appliedCoupon || null,
        coupon_code: appliedCoupon || null,
        discount_amount: Number(priceDetails?.couponDiscount || priceDetails?.coupon_discount || priceDetails?.discount_amount || 0),
        coupon_discount: Number(priceDetails?.couponDiscount || priceDetails?.coupon_discount || priceDetails?.discount_amount || 0),
        latitude: latitude ? Number(latitude) : 26.9124,
        longitude: longitude ? Number(longitude) : 75.7873,
        selectedDate: selectedDate || new Date().toISOString().split("T")[0],
        timeLabel: timeLabel || "02:00 PM",
        group_size: Number(groupSize || 1),
        groupSize: Number(groupSize || 1),
        service_coverage: serviceCoverage || "BOTH_HANDS",
        serviceCoverage: serviceCoverage || "BOTH_HANDS",
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
        selected_art_tier: selectedArt?.art_tier || "STANDARD",
        selected_art_duration: selectedArt?.duration_minutes ? (Number(selectedArt.duration_minutes) * Number(groupSize || 1)) : (60 * Number(groupSize || 1)),
        selected_art_price: selectedArt?.price || null
      };

      const checkoutData = {
        ...bookingData,
        total_amount: safeFinal,
        advance_amount: safeAdvance,
        remaining_amount: safeRemaining,
        artistName: artist?.name || artist?.full_name || artist?.user?.name || artist?.user?.full_name || artist?.business_name || "Mehndi Specialist",
        serviceTitle: selectedArt?.title || artist?.specialization_name || "Mehndi Service",
        service_price: Number(priceDetails?.service_price || priceDetails?.servicePrice || safeFinal)
      };

      // Navigate directly to Payment screen with checkout intent data (NO BOOKING CREATED YET)
      navigation.navigate("Payment", {
        checkoutData,
        bookingId: null,
        bookingCode: `MG-CHKT-${Date.now().toString().slice(-6)}`,
        finalAmount: safeFinal,
        advanceAmount: safeAdvance,
        remainingAmount: safeRemaining,
        artistName: checkoutData.artistName,
        serviceTitle: checkoutData.serviceTitle,
        isSettlement: false
      });
    } catch (err) {
      console.log("[Proceed to payment error]:", err.message);
      Alert.alert("Checkout Notice", err.message || "Failed to proceed to payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "CustomerTabs", params: { screen: "Home" } }]
      });
    }
    return true;
  };

  useEffect(() => {
    const { BackHandler } = require("react-native");
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => backSubscription.remove();
  }, [navigation]);

  if (loading && !priceDetails) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.loadingText}>Calculating pricing & booking summary...</Text>
      </SafeAreaView>
    );
  }

  const basePrice = Number(priceDetails?.servicePrice || priceDetails?.service_price || priceDetails?.base_amount || priceDetails?.subtotal || 0);
  const discountAmount = Number(priceDetails?.couponDiscount || priceDetails?.coupon_discount || priceDetails?.discount_amount || 0);
  const totalAmount = Number(priceDetails?.finalAmount || priceDetails?.final_amount || priceDetails?.total_amount || (basePrice - discountAmount));
  const advanceAmount = Number(priceDetails?.advanceAmount || priceDetails?.advance_amount || Math.round(totalAmount * 0.10) || 50);
  const remainingAmount = Number(priceDetails?.remainingCash !== undefined ? priceDetails?.remainingCash : (priceDetails?.remaining_amount !== undefined ? priceDetails?.remaining_amount : Math.max(0, totalAmount - advanceAmount)));

  const artistName = artist?.name || artist?.full_name || artist?.user?.name || artist?.user?.full_name || artist?.business_name || "Mehndi Artist";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* 1. Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#212121" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Booking Summary</Text>
            <Text style={styles.headerSubtitle}>Review details & deposit</Text>
          </View>
          <View style={styles.secureBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#059669" />
            <Text style={styles.secureBadgeText}>100% Escrow</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        {/* 2. Artist Profile & Service Card */}
        <View style={styles.card}>
          <View style={styles.artistRow}>
            <OptimizedImage
              source={{ uri: artist?.user?.profile_image || artist?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=800020&color=fff&size=200` }}
              style={styles.artistAvatar}
            />
            <View style={styles.artistInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.artistName} numberOfLines={1}>
                  {artistName}
                </Text>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
              </View>
              <Text style={styles.artistCategory}>
                {selectedArt?.title || artist?.specialization_name || "Custom Henna Design"}
              </Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#D97706" />
                <Text style={styles.ratingText}>{Number(artist?.avg_rating || artist?.rating_avg || 5.0).toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({artist?.total_reviews || artist?.review_count || 0} reviews)</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Schedule & Location Details */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#E91E63" />
              <View style={styles.metaTextGroup}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{selectedDate ? formatServiceDate(selectedDate) : "Scheduled Date"}</Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#701DDB" />
              <View style={styles.metaTextGroup}>
                <Text style={styles.metaLabel}>Time Slot</Text>
                <Text style={styles.metaValue}>{timeLabel || "Flexible"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.addressBox}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.addressText} numberOfLines={2}>
              {address ? `${address}${landmark ? `, ${landmark}` : ""}` : "Customer Location"}
            </Text>
          </View>
        </View>

        {/* 3. Group Size & Coverage Options */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Booking Customization</Text>

          {/* Group Size Selector */}
          <View style={styles.customRow}>
            <View>
              <Text style={styles.customLabel}>Number of Persons</Text>
              <Text style={styles.customSub}>Select total guests for mehndi</Text>
            </View>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={[styles.stepperBtn, groupSize <= 1 && styles.stepperBtnDisabled]}
                onPress={() => handleGroupSizeChange(groupSize - 1)}
                disabled={groupSize <= 1 || loading}
              >
                <Ionicons name="remove" size={16} color={groupSize <= 1 ? "#9CA3AF" : "#212121"} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{groupSize}</Text>
              <TouchableOpacity
                style={[styles.stepperBtn, groupSize >= 10 && styles.stepperBtnDisabled]}
                onPress={() => handleGroupSizeChange(groupSize + 1)}
                disabled={groupSize >= 10 || loading}
              >
                <Ionicons name="add" size={16} color={groupSize >= 10 ? "#9CA3AF" : "#212121"} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Coverage Options */}
          <Text style={[styles.customLabel, { marginTop: 4, marginBottom: 8 }]}>Hand Coverage</Text>
          <View style={styles.coverageGrid}>
            {[
              { id: "BOTH_HANDS", label: "Both Hands (Palm & Back)" },
              { id: "FULL_HANDS", label: "Full Hands (Up to Elbow)" },
              { id: "FEET_AND_HANDS", label: "Feet & Hands Combo" }
            ].map((cov) => (
              <TouchableOpacity
                key={cov.id}
                style={[styles.coverageChip, serviceCoverage === cov.id && styles.coverageChipActive]}
                onPress={() => handleCoverageChange(cov.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={serviceCoverage === cov.id ? "radio-button-on" : "radio-button-off"}
                  size={16}
                  color={serviceCoverage === cov.id ? "#E91E63" : "#9CA3AF"}
                />
                <Text style={[styles.coverageChipText, serviceCoverage === cov.id && styles.coverageChipTextActive]}>
                  {cov.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. Promo Coupon Section */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Have a Promo Code?</Text>
          {appliedCoupon ? (
            <View style={styles.appliedCouponCard}>
              <View style={styles.couponLeft}>
                <Ionicons name="pricetag" size={18} color="#059669" />
                <View>
                  <Text style={styles.appliedCode}>{appliedCoupon}</Text>
                  <Text style={styles.appliedSavings}>Saved ₹{discountAmount} on this booking!</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
                <Text style={styles.removeCouponText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.couponInputRow}>
                <TextInput
                  style={styles.couponInput}
                  value={couponInput}
                  onChangeText={(t) => setCouponInput(t.toUpperCase())}
                  placeholder="Enter coupon code (e.g. RAKHI20)"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={handleApplyCoupon}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
                onPress={() => navigation.navigate("Coupons", {
                  artistId,
                  serviceId,
                  selectedDate,
                  slotId,
                  timeLabel,
                  address,
                  landmark,
                  latitude,
                  longitude,
                  selectedArt,
                  packageId,
                  groupSize,
                  serviceCoverage,
                  basePrice: Number(priceDetails?.servicePrice || priceDetails?.service_price || priceDetails?.base_price || ((selectedArt?.price || 500) * groupSize)),
                  prefilledCode: appliedCoupon,
                  returnScreen: "BookingSummary"
                })}
              >
                <Ionicons name="sparkles" size={13} color="#9C1344" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: "#9C1344", fontWeight: "600" }}>View All Available Coupons & Offers →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 5. Special Notes */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Special Instructions (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g., Organic henna preferred, landmark near green gate..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* 6. Authoritative Financial Breakdown Card */}
        <View style={[styles.card, styles.amountCard]}>
          <Text style={styles.cardSectionTitle}>Payment Breakdown</Text>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Service Base Price ({groupSize} {groupSize > 1 ? "Persons" : "Person"})</Text>
            <Text style={styles.amountVal}>₹{basePrice}</Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: "#059669" }]}>Coupon Discount</Text>
              <Text style={[styles.amountVal, { color: "#059669" }]}>- ₹{discountAmount}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.amountRow}>
            <Text style={styles.totalLabel}>Total Booking Amount</Text>
            <Text style={styles.totalVal}>₹{totalAmount}</Text>
          </View>

          {/* Dual Payment Highlight Box */}
          <View style={styles.depositBox}>
            <View style={styles.depositLeft}>
              <View style={styles.depositPill}>
                <Ionicons name="lock-closed" size={12} color="#059669" />
                <Text style={styles.depositPillText}>10% ADVANCE DEPOSIT</Text>
              </View>
              <Text style={styles.depositDesc}>Pay now to lock artist slot (Held in Escrow)</Text>
            </View>
            <Text style={styles.depositAmount}>₹{advanceAmount}</Text>
          </View>

          <View style={styles.remainingBox}>
            <View style={styles.remainingLeft}>
              <View style={styles.remainingPill}>
                <Ionicons name="time" size={12} color="#701DDB" />
                <Text style={styles.remainingPillText}>REMAINING BALANCE (90%)</Text>
              </View>
              <Text style={styles.remainingDesc}>Pay after service completion (Cash or Online)</Text>
            </View>
            <Text style={styles.remainingAmount}>₹{remainingAmount}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 7. Bottom CTA Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.bottomPriceGroup}>
          <Text style={styles.bottomPayLabel}>Pay Advance Today</Text>
          <Text style={styles.bottomPayAmount}>₹{advanceAmount}</Text>
          <Text style={styles.bottomTotalSub}>Total: ₹{totalAmount}</Text>
        </View>

        <TouchableOpacity
          style={styles.payBtn}
          onPress={handleProceedToPayment}
          disabled={submitting || loading}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payBtnText}>Proceed to Pay</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </>
          )}
        </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  loadingContainer: {
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
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4
  },
  secureBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669"
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 140
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121",
    marginBottom: 10
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  artistAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F3F4F6"
  },
  artistInfo: {
    flex: 1,
    marginLeft: 12
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  artistName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#212121"
  },
  artistCategory: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 3
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#212121"
  },
  reviewCount: {
    fontSize: 11,
    color: "#6B7280"
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  metaTextGroup: {},
  metaLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase"
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 10,
    gap: 6
  },
  addressText: {
    fontSize: 12,
    color: "#4B5563",
    flex: 1,
    lineHeight: 16
  },
  customRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  customLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  customSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 2
  },
  stepperBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8
  },
  stepperBtnDisabled: {
    opacity: 0.4
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121",
    paddingHorizontal: 12
  },
  coverageGrid: {
    gap: 8
  },
  coverageChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    gap: 8
  },
  coverageChipActive: {
    backgroundColor: "#FDF2F8",
    borderColor: "#E91E63"
  },
  coverageChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563"
  },
  coverageChipTextActive: {
    color: "#E91E63",
    fontWeight: "700"
  },
  couponInputRow: {
    flexDirection: "row",
    gap: 8
  },
  couponInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  applyBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#701DDB",
    justifyContent: "center",
    alignItems: "center"
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  appliedCouponCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  couponLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  appliedCode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46"
  },
  appliedSavings: {
    fontSize: 11,
    color: "#047857"
  },
  removeCouponBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  removeCouponText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626"
  },
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 12,
    color: "#212121",
    minHeight: 50,
    textAlignVertical: "top"
  },
  amountCard: {
    borderColor: "#FCE7F3"
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  amountLabel: {
    fontSize: 13,
    color: "#4B5563"
  },
  amountVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#212121"
  },
  totalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#E91E63"
  },
  depositBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  depositLeft: {
    flex: 1,
    marginRight: 10
  },
  depositPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  depositPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#065F46"
  },
  depositDesc: {
    fontSize: 10,
    color: "#047857",
    marginTop: 2
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#059669"
  },
  remainingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3E8FF",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E9D5FF"
  },
  remainingLeft: {
    flex: 1,
    marginRight: 10
  },
  remainingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  remainingPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#701DDB"
  },
  remainingDesc: {
    fontSize: 10,
    color: "#6B21A8",
    marginTop: 2
  },
  remainingAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#701DDB"
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8
  },
  bottomPriceGroup: {},
  bottomPayLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
    textTransform: "uppercase"
  },
  bottomPayAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: "#212121"
  },
  bottomTotalSub: {
    fontSize: 11,
    color: "#6B7280"
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E91E63",
    paddingHorizontal: 22,
    height: 48,
    borderRadius: 14,
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4
  },
  payBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  }
});
