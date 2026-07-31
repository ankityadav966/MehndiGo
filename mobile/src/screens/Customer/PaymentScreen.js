import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { createPaymentSession, verifyPaymentSignature, payWithWallet } from "../../services/payment";
import { getBookingDetails, selectCashPayment } from "../../services/booking";
import { getWalletDetails } from "../../services/customer";
import RazorpayCheckout from "react-native-razorpay";


export default function PaymentScreen({ route, navigation }) {
  const { bookingId, bookingCode, finalAmount, isSettlement } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("online");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [orderAmountPaise, setOrderAmountPaise] = useState(0);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);

  const [activeBookingId, setActiveBookingId] = useState(bookingId || null);

  const loadBookingDetails = React.useCallback(async (targetId) => {
    const idToFetch = targetId || activeBookingId;
    if (!idToFetch) return;

    try {
      const details = await getBookingDetails(idToFetch);
      setBooking(details);

      try {
        const walletData = await getWalletDetails();
        setWalletBalance(walletData?.balance || 0);
      } catch (walletErr) {
        console.log("Failed to load wallet balance inside PaymentScreen:", walletErr.message);
      }
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
        } else {
          navigation.navigate("CustomerTabs", { screen: "Bookings" });
        }
      } catch (e) {
        navigation.navigate("CustomerTabs", { screen: "Bookings" });
      }
    }

    initPayment();
  }, [bookingId, loadBookingDetails, navigation]);


  const handlePay = async () => {
    const targetBookingId = activeBookingId || bookingId;
    if (!targetBookingId) {
      Alert.alert("Error", "No active booking selected for payment.");
      return;
    }

    // Both options (Full Online & Advance + Cash) use Razorpay Checkout
    const paymentMethodType = selectedMethod === "online" ? "FULL_ONLINE" : "ADVANCE_CASH";


    setLoading(true);
    let sessionData = null;
    try {
      console.log(`[PAYMENT_SCREEN] Creating Razorpay payment order for booking ID: ${targetBookingId}, mode: ${paymentMethodType}`);
      sessionData = await createPaymentSession(targetBookingId, paymentMethodType);


      console.log("[PAYMENT_SCREEN] Razorpay payment order response data:", JSON.stringify(sessionData, null, 2));

      if (!sessionData || !sessionData.order_id || !sessionData.key_id) {
        setLoading(false);
        Alert.alert("Checkout Error", "Failed to retrieve a valid Razorpay order ID.");

        return;
      }

      setOrderId(sessionData.order_id);
      setRazorpayKeyId(sessionData.key_id);
      setOrderAmountPaise(sessionData.amount);
    } catch (err) {
      setLoading(false);
      Alert.alert("Checkout Error", err.message || "Failed to generate Razorpay payment order.");

      return;
    }

    // Launch Razorpay Native Checkout
    const options = {
      description: `Payment for Booking #${booking?.booking_code || bookingId}`,
      image: "https://mehandigo-api.globalrns.com/logo.png",
      currency: sessionData.currency || "INR",
      key: sessionData.key_id,
      amount: sessionData.amount, // in paise
      name: "MehndiGo",
      order_id: sessionData.order_id,
      prefill: {
        email: booking?.user?.email || "",
        contact: booking?.user?.phone || "",
        name: booking?.user?.name || ""
      },
      theme: { color: Colors.primary }
    };

    console.log("[RAZORPAY CHECKOUT CONFIG]", {
      amount: options.amount,
      currency: options.currency,
      keyEnvironment: "TEST",
      keyPresent: !!options.key,
      orderId: options.order_id
    });

    try {
      RazorpayCheckout.open(options)
        .then(async (data) => {
          console.log("[RAZORPAY SUCCESS] Callback received:", JSON.stringify(data, null, 2));
          try {
            const verifyData = {

              bookingId: bookingId,
              razorpay_order_id: data.razorpay_order_id || sessionData.order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature
            };
            console.log("[PAYMENT_SCREEN] Calling verifyPaymentSignature with payload:", JSON.stringify(verifyData, null, 2));
            const response = await verifyPaymentSignature(verifyData);
            console.log("[PAYMENT_SCREEN] verifyPaymentSignature succeeded:", JSON.stringify(response, null, 2));

            setLoading(false);
            if (isSettlement) {
              navigation.replace("ReviewSubmission", {
                bookingId: bookingId,
                artistName: booking?.artist?.user?.name,
                artistImage: booking?.artist?.user?.profile_image,
                specializationName: booking?.service?.specialization_name
              });
            } else {
              navigation.replace("BookingSuccess", { bookingCode: bookingCode || booking?.booking_code || "success" });
            }
          } catch (verifyErr) {
            setLoading(false);
            console.error("[PAYMENT_SCREEN] Verification API error:", verifyErr.message, verifyErr);
            Alert.alert("Payment Verification Error", verifyErr.message || "Verification failed.");
            navigation.navigate("PaymentFailed", { bookingId, finalAmount });
          }
        })
        .catch((error) => {
          setLoading(false);
          console.log("[RAZORPAY CHECKOUT ERROR / CANCEL]:", JSON.stringify(error));
          if (error && (error.code === 0 || (typeof error.description === "string" && error.description.toLowerCase().includes("cancelled")))) {
            Alert.alert("Payment Cancelled", "You cancelled the payment transaction.");
          } else {
            // Fallback for emulator / live key test mode
            console.log("[RAZORPAY GATEWAY FALLBACK] Opening test payment modal due to gateway error.");
            setCheckoutModalVisible(true);
          }
        });

    } catch (sdkErr) {
      setLoading(false);
      console.log("[RAZORPAY SDK INITIATION ERROR] Falling back to test modal:", sdkErr);
      setCheckoutModalVisible(true);
    }
  };

  const handlePaymentSuccess = async () => {
    console.log("[PAYMENT_SCREEN] Test Simulator success clicked. Verifying Razorpay payment.");
    setCheckoutModalVisible(false);
    setLoading(true);
    try {
      const mockPayId = `pay_sim_${Date.now()}`;
      const verifyData = {
        bookingId: bookingId,
        razorpay_order_id: orderId,
        razorpay_payment_id: mockPayId,
        razorpay_signature: "simulated_test_signature"
      };
      console.log("[PAYMENT_SCREEN] Calling verifyPaymentSignature in Simulator mode with payload:", JSON.stringify(verifyData, null, 2));
      const response = await verifyPaymentSignature(verifyData);
      console.log("[PAYMENT_SCREEN] verifyPaymentSignature (Simulator) succeeded:", JSON.stringify(response, null, 2));

      setLoading(false);
      if (isSettlement) {
        navigation.replace("ReviewSubmission", {
          bookingId: bookingId,
          artistName: booking?.artist?.user?.name,
          artistImage: booking?.artist?.user?.profile_image,
          specializationName: booking?.service?.specialization_name
        });
      } else {
        navigation.replace("BookingSuccess", { bookingCode: bookingCode || booking?.booking_code || `BK-${Math.floor(100000 + Math.random() * 900000)}` });
      }
    } catch (err) {
      setLoading(false);
      console.error("[PAYMENT_SCREEN] Simulator verification API error:", err.message, err);
      navigation.navigate("PaymentFailed", { bookingId, finalAmount });
    }
  };

  const handlePaymentFailure = () => {
    setCheckoutModalVisible(false);
    navigation.navigate("PaymentFailed", { bookingId, finalAmount });
  };

  const methods = [
    { id: "online", title: "Razorpay Online Payment", subtitle: "Pay securely via UPI, Credit/Debit Cards, Net Banking", icon: "card-outline" },

    { 
      id: "wallet", 
      title: "MehndiGo Wallet", 
      subtitle: walletBalance !== undefined && walletBalance !== null
        ? `Pay using your wallet balance (Available: ₹${walletBalance})`
        : "Pay using your internal wallet balance", 
      icon: "wallet-outline" 
    }
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loaderText}>Processing secure gateway...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Secure Checkout</Text>
        <View style={styles.secureBadgeHeader}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
          <Text style={styles.secureHeaderTxt}>Secure</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sslBadge}>
          <Ionicons name="lock-closed" size={14} color="#10B981" />
          <Text style={styles.sslText}>256-Bit SSL Encrypted secure Razorpay connection</Text>
        </View>

        {booking && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>Booking Summary</Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Service Name</Text>
              <Text style={styles.detailsValue}>{booking.service?.specialization_name || "Mehndi Styling Session"}</Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Booking Code</Text>
              <Text style={styles.detailsValue}>#{booking.booking_code}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Artist Specialist</Text>
              <Text style={styles.detailsValue}>{booking.artist?.user?.name || "Professional Specialist"}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Booking Date</Text>
              <Text style={styles.detailsValue}>{booking.slot?.start_time || booking.slot?.date ? new Date(booking.slot.start_time || booking.slot.date).toLocaleDateString() : (booking.reschedule_date || "TBD")}</Text>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Service Price</Text>
              <Text style={styles.detailsValue}>₹{booking.total_price}</Text>
            </View>
            {booking.travel_charges > 0 && (
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Travel Fee</Text>
                <Text style={styles.detailsValue}>₹{booking.travel_charges}</Text>
              </View>
            )}
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Advance Payment (Online)</Text>
              <Text style={[styles.detailsValue, { color: Colors.primary, fontWeight: "700" }]}>₹{booking.advance_amount || Math.min(500, booking.final_amount)}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Remaining Cash (Pay to Artist)</Text>
              <Text style={styles.detailsValue}>₹{booking.remaining_amount || (booking.final_amount - (booking.advance_amount || 500))}</Text>

            </View>
          </View>
        )}

        <View style={styles.amountCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={styles.amountLabel}>Total Service Amount</Text>
              <Text style={styles.amount}>₹{finalAmount || booking?.final_amount || "TBD"}</Text>
            </View>
            <View style={styles.secureTrustCard}>
              <Ionicons name="ribbon-outline" size={24} color={Colors.primary} />
              <Text style={styles.trustText}>Razorpay Verified</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {[
          {
            id: "online",
            title: "Razorpay (Full Online Payment)",
            subtitle: "Pay 100% amount securely via UPI, Cards, Netbanking",
            icon: "card-outline"
          },
          {
            id: "cash",
            title: "Advance Online + Cash (Recommended)",
            subtitle: `Pay ₹${booking?.advance_amount || 500} online advance now, pay remaining ₹${(booking?.final_amount || 5000) - (booking?.advance_amount || 500)} cash directly to artist upon completion`,
            icon: "cash-outline"
          }
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => setSelectedMethod(item.id)}
            style={[styles.paymentCard, selectedMethod === item.id && styles.selectedCard]}
          >
            <View style={styles.methodInfo}>
              <View style={[styles.methodIconWrapper, selectedMethod === item.id && styles.activeIconWrapper]}>
                <Ionicons name={item.icon} size={22} color={selectedMethod === item.id ? Colors.primary : Colors.textTertiary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.methodTitle}>{item.title}</Text>
                <Text style={styles.methodSub}>{item.subtitle}</Text>
              </View>
            </View>
            <View style={[styles.radio, selectedMethod === item.id && styles.radioActive]} />
          </TouchableOpacity>
        ))}



        <View style={styles.securityTrustSection}>
          <View style={styles.trustBadgeRow}>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#4A5568" />
              <Text style={styles.trustBadgeText}>100% Secure Payments</Text>
            </View>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#4A5568" />
              <Text style={styles.trustBadgeText}>PCI-DSS Compliant</Text>
            </View>
          </View>
          <Text style={styles.gatewayDisclaimer}>
            Payments are securely processed by Razorpay. MehndiGo does not store your credit card or banking credentials.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={
            selectedMethod === "online"
              ? `Pay ₹${finalAmount || booking?.final_amount || "0"} & Confirm Booking`
              : `Pay ₹${booking?.advance_amount || Math.min(500, booking?.final_amount || 500)} & Confirm Booking`
          }
          onPress={handlePay}
          disabled={loading}
        />
      </View>


      {/* Razorpay Test Simulator Overlay */}
      <Modal visible={checkoutModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
              <Text style={styles.modalTitle}>Razorpay Checkout</Text>
            </View>
            <Text style={styles.orderLabel}>Order Ref: {orderId}</Text>
            <Text style={styles.modalAmount}>₹{finalAmount}</Text>

            <TouchableOpacity style={styles.successBtn} onPress={handlePaymentSuccess}>
              <Text style={styles.successBtnText}>Simulate Razorpay Success</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.failBtn} onPress={handlePaymentFailure}>
              <Text style={styles.failBtnText}>Simulate Cancel / Failure</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 12, color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  detailsCard: { margin: 16, marginBottom: 4, backgroundColor: Colors.white, borderRadius: 16, padding: 18, elevation: 1 },
  detailsCardTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  detailsRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  detailsLabel: { fontSize: 11, color: Colors.textSecondary },
  detailsValue: { fontSize: 11, fontWeight: "600", color: Colors.text },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 8 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  secureBadgeHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#e6fcf5", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  secureHeaderTxt: { fontSize: 10, color: "#0ca678", fontWeight: "700", marginLeft: 4 },
  sslBadge: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 12, backgroundColor: "#f0fdf4", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#dcfce7" },
  sslText: { fontSize: 10, color: "#166534", fontWeight: "600", marginLeft: 6 },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 100 },
  amountCard: { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 18, elevation: 1 },
  amountLabel: { color: Colors.textSecondary, fontSize: 12 },
  amount: { marginTop: 6, fontSize: 32, fontWeight: "800", color: Colors.primary },
  secureTrustCard: { backgroundColor: "#fff5f5", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: "center" },
  trustText: { fontSize: 8, color: Colors.primary, fontWeight: "700", marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, marginHorizontal: 16, marginBottom: 12 },
  paymentCard: { marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 1 },
  selectedCard: { borderWidth: 1.5, borderColor: Colors.primary },
  methodInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  methodIconWrapper: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center" },
  activeIconWrapper: { backgroundColor: "#fff5f5" },
  textContainer: { marginLeft: 14 },
  methodTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  methodSub: { marginTop: 3, fontSize: 11, color: Colors.textSecondary },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border },
  radioActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  securityTrustSection: { paddingHorizontal: 20, marginVertical: 16, alignItems: "center" },
  trustBadgeRow: { flexDirection: "row", justifyContent: "center", marginBottom: 8 },
  trustBadgeItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 8 },
  trustBadgeText: { fontSize: 10, color: "#4A5568", fontWeight: "600", marginLeft: 4 },
  gatewayDisclaimer: { fontSize: 9, color: Colors.textTertiary, textAlign: "center", lineHeight: 14 },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border }
});
