import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import RazorpayCheckoutModal from "../../components/RazorpayCheckoutModal";
import { createPaymentSession, verifyPaymentSignature } from "../../services/payment";
import { getBookingDetails, selectCashPayment } from "../../services/booking";
import { openRazorpayCheckout } from "../../services/razorpayHelper";

export default function PaymentScreen({ route, navigation }) {
  const {
    bookingId,
    bookingCode,
    finalAmount,
    advanceAmount: routeAdvance,
    remainingAmount: routeRemaining,
    artistName: routeArtist,
    serviceTitle: routeService,
    isSettlement
  } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("online"); // "online" or "cash"
  const [loading, setLoading] = useState(false);
  const [processingModalVisible, setProcessingModalVisible] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [, setRazorpayKeyId] = useState("");

  const [activeBookingId, setActiveBookingId] = useState(bookingId || null);

  // In-App Razorpay Web Checkout fallback (for Expo Go / simulators)
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState(null);
  const [currentSessionData, setCurrentSessionData] = useState(null);

  const loadBookingDetails = useCallback(async (targetId) => {
    const idToFetch = targetId || activeBookingId;
    if (!idToFetch) return;

    try {
      const details = await getBookingDetails(idToFetch);
      setBooking(details);
    } catch (err) {
      console.log("Failed to fetch booking details in PaymentScreen:", err.message);
    }
  }, [activeBookingId]);

  useEffect(() => {
    async function initPayment() {
      if (bookingId) {
        setActiveBookingId(bookingId);
        loadBookingDetails(bookingId);
        return;
      }

      // Auto-recover missing bookingId from recent pending booking history
      try {
        const { getBookingHistory } = require("../../services/booking");
        const history = await getBookingHistory();
        const pendingBooking = Array.isArray(history)
          ? history.find(b => b.payment_status === "PENDING" || b.booking_status === "PENDING")
          : null;

        if (pendingBooking && pendingBooking.id) {
          setActiveBookingId(pendingBooking.id);
          loadBookingDetails(pendingBooking.id);
        }
      } catch (historyErr) {
        console.log("Auto-recovery history fetch error:", historyErr.message);
      }
    }

    initPayment();
  }, [bookingId, loadBookingDetails]);

  // Payment Verification Handler
  const handlePaymentSuccess = async (data, sessionDataToUse) => {
    setRazorpayModalVisible(false);
    setProcessingModalVisible(true);
    setLoading(true);

    const activeSession = sessionDataToUse || currentSessionData;
    const targetBookingId = activeBookingId || bookingId;

    try {
      if (!data?.razorpay_order_id || !data?.razorpay_payment_id || !data?.razorpay_signature) {
        throw new Error("Missing authentic Razorpay payment signature details.");
      }

      const verifyData = {
        bookingId: targetBookingId,
        razorpay_order_id: data.razorpay_order_id || activeSession?.order_id || orderId,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
        isSettlement: Boolean(isSettlement)
      };

      console.log("[PAYMENT_SCREEN] Verifying payment with backend:", JSON.stringify(verifyData, null, 2));
      const verifyResult = await verifyPaymentSignature(verifyData);

      if (!verifyResult || (verifyResult.success === false && !verifyResult.already_processed)) {
        throw new Error(verifyResult?.message || "Payment verification failed on backend.");
      }

      setLoading(false);
      setProcessingModalVisible(false);

      const resolvedCode = bookingCode || booking?.booking_code || booking?.booking_number || `MG-${targetBookingId || 'SUCCESS'}`;

      if (isSettlement) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "BookingDetails",
              params: {
                bookingId: targetBookingId
              }
            }
          ]
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "BookingSuccess",
              params: {
                bookingCode: resolvedCode,
                bookingId: targetBookingId
              }
            }
          ]
        });
      }
    } catch (verifyErr) {
      setLoading(false);
      setProcessingModalVisible(false);
      console.error("[PAYMENT_SCREEN] Verification error:", verifyErr.message);
      Alert.alert("Payment Verification Notice", verifyErr.message || "We could not verify your payment. If amount was deducted, it will automatically update shortly.");
    }
  };

  const handlePaymentFailure = (error) => {
    setRazorpayModalVisible(false);
    setProcessingModalVisible(false);
    setLoading(false);
    const errorMsg = error?.description || error?.message || "Payment cancelled or could not be completed.";
    console.log("[PAYMENT_SCREEN] Payment failed/cancelled:", errorMsg);
    Alert.alert("Payment Incomplete", errorMsg);
  };

  const handlePaymentDismiss = () => {
    setRazorpayModalVisible(false);
    setProcessingModalVisible(false);
    setLoading(false);
  };

  // CASH PAYMENT SELECTION
  const handleSelectCash = async () => {
    const targetBookingId = activeBookingId || bookingId;
    if (!targetBookingId) {
      Alert.alert("Error", "No active booking selected.");
      return;
    }

    setLoading(true);
    try {
      await selectCashPayment(targetBookingId);
      setLoading(false);
      Alert.alert(
        "Cash Payment Selected 💵",
        "Your booking is confirmed! Please pay the remaining amount directly to the artist upon service completion.",
        [
          {
            text: "View Booking",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: "BookingDetails",
                    params: { bookingId: targetBookingId }
                  }
                ]
              });
            }
          }
        ]
      );
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.message || "Failed to select cash payment.");
    }
  };

  const handlePay = async () => {
    if (loading) return; // Prevent double-tap clicks

    if (selectedMethod === "cash") {
      await handleSelectCash();
      return;
    }

    const targetBookingId = activeBookingId || bookingId;
    if (!targetBookingId) {
      Alert.alert("Error", "No active booking selected for payment.");
      return;
    }

    const paymentMethodType = isSettlement ? "SETTLEMENT" : "ADVANCE_CASH";

    setLoading(true);
    setProcessingModalVisible(true);
    let sessionData = null;
    try {
      sessionData = await createPaymentSession(targetBookingId, paymentMethodType);

      const keyId = sessionData?.key_id || sessionData?.key || sessionData?.keyId;
      const orderIdVal = sessionData?.order_id || sessionData?.orderId;
      const amountPaise = Number(sessionData?.amount);

      const isValidRazorpayKey =
        typeof keyId === "string" &&
        (keyId.startsWith("rzp_test_") || keyId.startsWith("rzp_live_"));

      if (!sessionData || !isValidRazorpayKey) {
        setLoading(false);
        setProcessingModalVisible(false);
        Alert.alert("Checkout Error", `Invalid Razorpay Public Key ID: ${keyId}`);
        return;
      }

      if (typeof orderIdVal !== "string" || !orderIdVal.startsWith("order_")) {
        setLoading(false);
        setProcessingModalVisible(false);
        Alert.alert("Checkout Error", `Invalid Razorpay Order ID: ${orderIdVal}`);
        return;
      }

      if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
        setLoading(false);
        setProcessingModalVisible(false);
        Alert.alert("Checkout Error", `Invalid payable amount: ${amountPaise}`);
        return;
      }

      setOrderId(orderIdVal);
      setRazorpayKeyId(keyId);
      setCurrentSessionData(sessionData);

      const rawPhone = String(booking?.user?.phone || "9829011001");
      const cleanDigits = rawPhone.replace(/[^0-9]/g, "").slice(-10) || "9829011001";
      const cleanPhone = `+91${cleanDigits}`;

      const options = {
        description: `Mehndi Booking #${booking?.booking_code || targetBookingId}`,
        image: "https://api.mehndigo.in/logo.png",
        currency: "INR",
        key: keyId,
        amount: amountPaise,
        name: "MehndiGo",
        order_id: orderIdVal,
        prefill: {
          email: String(booking?.user?.email || "customer@mehndigo.com").trim(),
          contact: cleanPhone,
          name: String(booking?.user?.name || "MehndiGo Customer").trim()
        },
        notes: {
          booking_id: String(targetBookingId),
          service_name: String(booking?.service_title || "Mehndi Service")
        },
        theme: { color: "#E91E63" }
      };

      setRazorpayOptions(options);

      // Attempt native checkout or fallback to in-app webview modal
      await openRazorpayCheckout(options, {
        onSuccess: (data) => handlePaymentSuccess(data, sessionData),
        onFailure: (err) => handlePaymentFailure(err),
        onDismiss: () => handlePaymentDismiss(),
        onWebFallback: () => {
          setProcessingModalVisible(false);
          setRazorpayModalVisible(true);
        }
      });
    } catch (e) {
      setLoading(false);
      setProcessingModalVisible(false);
      Alert.alert("Payment Error", e.message || "Failed to initialize payment gateway.");
    }
  };

  const totalAmount = Number(booking?.total_amount || booking?.final_amount || finalAmount || 0);
  const advanceAmount = Number(booking?.advance_amount || booking?.advance_paid || routeAdvance || Math.round(totalAmount * 0.10));
  const remainingAmount = Number(booking?.remaining_amount !== undefined ? booking?.remaining_amount : (routeRemaining !== undefined ? routeRemaining : (totalAmount - advanceAmount)));

  const payableNow = isSettlement ? remainingAmount : advanceAmount;
  const balanceAfter = isSettlement ? 0 : remainingAmount;

  const displayCode = booking?.booking_code || bookingCode || (activeBookingId ? `MG-${String(activeBookingId).padStart(6, "0")}` : "MG-PENDING");
  const artistName = booking?.artist_name || booking?.artist?.user?.name || routeArtist || "Mehndi Specialist";
  const serviceName = booking?.service_name || booking?.service_title || routeService || "Henna Application";

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#212121" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{isSettlement ? "Final Settlement" : "Secure Payment"}</Text>
          <Text style={styles.headerSubtitle}>#{displayCode}</Text>
        </View>
        <View style={styles.secureBadge}>
          <Ionicons name="lock-closed" size={12} color="#059669" />
          <Text style={styles.secureBadgeText}>256-Bit SSL</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 2. Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.serviceIconBox}>
              <Ionicons name="color-palette" size={22} color="#E91E63" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.serviceName}>{serviceName}</Text>
              <Text style={styles.artistName}>By {artistName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Amount Breakdown Box */}
          <View style={styles.amountGrid}>
            <View style={styles.amountBoxPrimary}>
              <Text style={styles.amountBoxLabel}>
                {isSettlement ? "REMAINING PAYABLE NOW" : "10% ADVANCE DUE TODAY"}
              </Text>
              <Text style={styles.amountBoxValPrimary}>₹{payableNow}</Text>
              <Text style={styles.amountBoxSubPrimary}>
                {isSettlement ? "Final balance to complete booking" : "Held in 100% Secure Escrow"}
              </Text>
            </View>

            <View style={styles.amountBoxSecondary}>
              <View style={styles.amountRowSub}>
                <Text style={styles.subLabel}>Total Booking:</Text>
                <Text style={styles.subVal}>₹{totalAmount}</Text>
              </View>
              <View style={styles.amountRowSub}>
                <Text style={styles.subLabel}>
                  {isSettlement ? "Advance Paid:" : "Remaining Balance:"}
                </Text>
                <Text style={[styles.subVal, { color: isSettlement ? "#059669" : "#701DDB" }]}>
                  ₹{isSettlement ? advanceAmount : balanceAfter}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Payment Method Selection */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
        </View>

        {/* Option A: Pay Online (Razorpay) */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === "online" && styles.methodCardActive]}
          onPress={() => setSelectedMethod("online")}
          activeOpacity={0.8}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIconBox, { backgroundColor: "#FDF2F8" }]}>
              <Ionicons name="card" size={22} color="#E91E63" />
            </View>
            <View style={styles.methodMeta}>
              <View style={styles.methodTitleRow}>
                <Text style={styles.methodTitle}>Pay Online (Instant UPI & Cards)</Text>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Instant</Text>
                </View>
              </View>
              <Text style={styles.methodDesc}>GPay, PhonePe, Paytm, Cards, NetBanking</Text>
            </View>
          </View>
          <Ionicons
            name={selectedMethod === "online" ? "radio-button-on" : "radio-button-off"}
            size={20}
            color={selectedMethod === "online" ? "#E91E63" : "#9CA3AF"}
          />
        </TouchableOpacity>

        {/* Option B: Pay Cash */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === "cash" && styles.methodCardActive]}
          onPress={() => setSelectedMethod("cash")}
          activeOpacity={0.8}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="cash" size={22} color="#059669" />
            </View>
            <View style={styles.methodMeta}>
              <Text style={styles.methodTitle}>Pay Cash to Artist</Text>
              <Text style={styles.methodDesc}>Pay directly to the artist on doorstep arrival</Text>
            </View>
          </View>
          <Ionicons
            name={selectedMethod === "cash" ? "radio-button-on" : "radio-button-off"}
            size={20}
            color={selectedMethod === "cash" ? "#E91E63" : "#9CA3AF"}
          />
        </TouchableOpacity>

        {/* 4. Escrow Security Banner */}
        <View style={styles.escrowCard}>
          <Ionicons name="shield-checkmark" size={24} color="#059669" />
          <View style={styles.escrowMeta}>
            <Text style={styles.escrowTitle}>MehndiGo Escrow Guarantee</Text>
            <Text style={styles.escrowDesc}>
              Your advance payment is held safely in escrow and released to the artist only after service completion.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 6. Bottom Pay CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceInfo}>
          <Text style={styles.bottomPriceLabel}>Total Payable</Text>
          <Text style={styles.bottomPriceVal}>₹{payableNow}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryPayBtn}
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryPayBtnText}>
                {selectedMethod === "cash" ? "Confirm Cash Booking" : `Pay ₹${payableNow} Securely`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Processing Payment Modal Overlay */}
      <Modal visible={processingModalVisible} transparent animationType="fade">
        <View style={styles.processingOverlay}>
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color="#E91E63" />
            <Text style={styles.processingTitle}>
              {orderId ? "Confirming Payment ✨" : "Processing Payment"}
            </Text>
            <Text style={styles.processingSub}>
              {orderId ? "Verifying 100% secure transaction with server..." : "Connecting with Razorpay secure gateway..."}
            </Text>
            <Text style={styles.processingNote}>Please do not close or navigate back.</Text>
          </View>
        </View>
      </Modal>

      {/* In-App Razorpay Checkout Fallback Modal */}
      {razorpayModalVisible && razorpayOptions && (
        <RazorpayCheckoutModal
          visible={razorpayModalVisible}
          options={razorpayOptions}
          onSuccess={(data) => handlePaymentSuccess(data, currentSessionData)}
          onFailure={handlePaymentFailure}
          onDismiss={handlePaymentDismiss}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
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
    fontWeight: "700",
    color: "#E91E63",
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
    paddingBottom: 40
  },
  summaryCard: {
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
  summaryTop: {
    flexDirection: "row",
    alignItems: "center"
  },
  serviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FCE7F3",
    justifyContent: "center",
    alignItems: "center"
  },
  summaryInfo: {
    flex: 1,
    marginLeft: 12
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#212121"
  },
  artistName: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14
  },
  amountGrid: {
    gap: 10
  },
  amountBoxPrimary: {
    backgroundColor: "#FDF2F8",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    alignItems: "center"
  },
  amountBoxLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E91E63",
    letterSpacing: 0.5
  },
  amountBoxValPrimary: {
    fontSize: 28,
    fontWeight: "900",
    color: "#212121",
    marginVertical: 4
  },
  amountBoxSubPrimary: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600"
  },
  amountBoxSecondary: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 6
  },
  amountRowSub: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  subLabel: {
    fontSize: 12,
    color: "#6B7280"
  },
  subVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  sectionHeader: {
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121"
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB"
  },
  methodCardActive: {
    borderColor: "#E91E63",
    backgroundColor: "#FFF5F8"
  },
  methodLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  methodIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  methodMeta: {
    flex: 1,
    marginLeft: 12
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  recommendedBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669"
  },
  methodDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2
  },
  escrowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 12
  },
  escrowMeta: {
    flex: 1
  },
  escrowTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46"
  },
  escrowDesc: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
    lineHeight: 15
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
  bottomPriceInfo: {},
  bottomPriceLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600"
  },
  bottomPriceVal: {
    fontSize: 22,
    fontWeight: "900",
    color: "#212121"
  },
  primaryPayBtn: {
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
  primaryPayBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  processingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320
  },
  processingTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#212121",
    marginTop: 16
  },
  processingSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    textAlign: "center"
  },
  processingNote: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E91E63",
    marginTop: 12,
    textAlign: "center"
  }
});
