import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  NativeModules
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { createPaymentSession, verifyPaymentSignature, payWithWallet } from "../../services/payment";
import { getBookingDetails, selectCashPayment } from "../../services/booking";
import { getWalletDetails } from "../../services/customer";
import { secureStorage } from "../../utils/storage";
import { CFPaymentGatewayService } from "react-native-cashfree-pg-sdk";
import { CFSession, CFEnvironment, CFDropCheckoutPayment, CFPaymentComponentBuilder, CFPaymentModes, CFThemeBuilder } from "cashfree-pg-api-contract";
import { BASE_URL } from "../../services/api";


export default function PaymentScreen({ route, navigation }) {
  const { bookingId, bookingCode, finalAmount, isSettlement } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentSessionId, setPaymentSessionId] = useState("");
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const loadBookingDetails = React.useCallback(async () => {
    try {
      const details = await getBookingDetails(bookingId);
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
  }, [bookingId]);

  const loadBookingDetails = React.useCallback(async () => {
    try {
      const details = await getBookingDetails(bookingId);
      setBooking(details);
    } catch (err) {
      console.log("Failed to fetch booking details in PaymentScreen:", err.message);
    }
  }, [bookingId]);

  const initiateOrder = React.useCallback(async () => {
    setLoading(true);
    try {
      await loadBookingDetails();
      console.log("[PAYMENT_SCREEN] Requesting Cashfree payment session for booking ID:", bookingId);
      const sessionData = await createPaymentSession(bookingId);
      console.log("[PAYMENT_SCREEN] Cashfree payment session response data:", JSON.stringify(sessionData, null, 2));

      if (!sessionData || !sessionData.payment_session_id) {
        console.error("[PAYMENT_SCREEN] Error: payment_session_id is null, undefined, or empty");
        Alert.alert("Checkout Error", "Failed to retrieve a valid payment session ID.");
        navigation.goBack();
        return;
      }

      setOrderId(sessionData.order_id);
      setPaymentSessionId(sessionData.payment_session_id);

    } catch (err) {
      Alert.alert("Checkout Error", "Failed to generate Cashfree payment session.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigation, loadBookingDetails]);

  useEffect(() => {
    if (!bookingId) {
      Alert.alert("Error", "Missing booking ID context.");
      navigation.goBack();
      return;
    }
    const timer = setTimeout(() => {
      initiateOrder();
    }, 0);
    return () => clearTimeout(timer);
  }, [bookingId, initiateOrder, navigation]);
 


  const handlePay = async () => {
    if (selectedMethod === "cash") {
      setLoading(true);
      try {
        await selectCashPayment(bookingId);
        setLoading(false);
        Alert.alert(
          "Cash Payment Selected",
          "Please pay the artist in hand. The booking is now awaiting the artist's payment confirmation.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.replace("BookingSuccess", { bookingCode: bookingCode || booking?.booking_code || `BK-${Math.floor(100000 + Math.random() * 900000)}` });
              }
            }
          ]
        );
      } catch (err) {
        setLoading(false);
        Alert.alert("Cash Selection Failed", err.message || "Failed to confirm cash option selection.");
      }
      return;
    }

    if (selectedMethod === "wallet") {
      const payable = Number(finalAmount || booking?.final_amount || 0);
      if (walletBalance < payable) {
        Alert.alert(
          "Insufficient Wallet Balance",
          "Insufficient wallet balance. Please add money to your wallet and try again.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Add Money",
              onPress: () => {
                navigation.navigate("Wallet");
              }
            }
          ]
        );
        return;
      }

      setLoading(true);
      try {
        await payWithWallet(bookingId);
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
        navigation.navigate("PaymentFailed", { bookingId, finalAmount });
      }
      return;
    }

    if (!paymentSessionId) {
      Alert.alert("Error", "Cashfree payment session not initialized yet.");
      return;
    }

    if (paymentSessionId && (paymentSessionId.startsWith("session_mock") || paymentSessionId.startsWith("mock_session"))) {
      setLoading(false);
      setCheckoutModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      const options = {
        description: 'Payment',
        currency: 'INR',
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TG65Zz9HYgFZsj',
        amount: Math.round(finalAmount * 100), // convert to paise
        name: 'MehndiGo',
        order_id: orderId,
        theme: { color: '#ff7e5f' }
      };

      RazorpayCheckout.open(options).then(async (data) => {
        console.log("[PAYMENT_SCREEN] Razorpay Success Callback. data:", data);
        try {
          const verifyData = {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            payment_session_id: paymentSessionId
          };
          console.log("[PAYMENT_SCREEN] Calling verifyPaymentSignature with payload:", JSON.stringify(verifyData, null, 2));
          const response = await verifyPaymentSignature(verifyData);
          console.log("[PAYMENT_SCREEN] verifyPaymentSignature succeeded. Response:", JSON.stringify(response, null, 2));
          
          setLoading(false);
          if (isSettlement) {
            console.log("[PAYMENT_SCREEN] Routing to ReviewSubmission screen.");
            navigation.replace("ReviewSubmission", {
              bookingId: bookingId,
              artistName: booking?.artist?.user?.name,
              artistImage: booking?.artist?.user?.profile_image,
              specializationName: booking?.service?.specialization_name
            });
          } else {
            console.log("[PAYMENT_SCREEN] Routing to BookingSuccess screen.");
            navigation.replace("BookingSuccess", { bookingCode: bookingCode || booking?.booking_code || "success" });
          }
        } catch (verifyErr) {
          setLoading(false);
          console.error("[PAYMENT_SCREEN] Verification API error:", verifyErr.message, verifyErr);
          navigation.navigate("PaymentFailed", { bookingId, finalAmount });
        }
      }).catch(error => {
        setLoading(false);
        console.log("Razorpay Checkout Error Callback:", error);
        if (error && error.code && error.code.toString().includes("UNAVAILABLE")) {
           // Expo Go fallback
           setCheckoutModalVisible(true);
        } else if (error && error.description && error.description.includes("cancelled")) {
          Alert.alert("Payment Cancelled", "You cancelled the payment transaction.");
        } else {
          Alert.alert("Payment Failed", error.description || error.message || "Checkout session failed.");
          navigation.navigate("PaymentFailed", { bookingId, finalAmount });
        }
      });
    } catch (error) {
      setLoading(false);
      console.log("Razorpay SDK Initiation Error (Fallback to Simulation):", error);
      setCheckoutModalVisible(true);
    }
  };

  const handlePaymentSuccess = async () => {
    console.log("[PAYMENT_SCREEN] Simulator success clicked. Bypassing Cashfree SDK and verifying signature.");
    setCheckoutModalVisible(false);
    setLoading(true);
    try {
      const verifyData = {
        cashfree_order_id: orderId,
        payment_session_id: paymentSessionId
      };
      console.log("[PAYMENT_SCREEN] Calling verifyPaymentSignature in Simulator mode with payload:", JSON.stringify(verifyData, null, 2));
      const response = await verifyPaymentSignature(verifyData);
      console.log("[PAYMENT_SCREEN] verifyPaymentSignature (Simulator) succeeded. Response:", JSON.stringify(response, null, 2));

      if (isSettlement) {
        console.log("[PAYMENT_SCREEN] Routing (Simulator) to ReviewSubmission screen.");

        navigation.replace("ReviewSubmission", {
          bookingId: bookingId,
          artistName: booking?.artist?.user?.name,
          artistImage: booking?.artist?.user?.profile_image,
          specializationName: booking?.service?.specialization_name
        });
      } else {
        console.log("[PAYMENT_SCREEN] Routing (Simulator) to BookingSuccess screen.");

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

  const handlePayOffline = () => {
    setCheckoutModalVisible(false);
    navigation.replace("BookingSuccess", { bookingCode: bookingCode || `BK-${Math.floor(100000 + Math.random() * 900000)}` });
  };

  const methods = [
    { id: "upi", title: "Cashfree Online Payment", subtitle: "Pay securely via UPI, Cards, Net Banking", icon: "card-outline" },
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
        {/* SSL indicator badge */}
        <View style={styles.sslBadge}>
          <Ionicons name="lock-closed" size={14} color="#10B981" />
          <Text style={styles.sslText}>256-Bit SSL Encrypted secure connection</Text>
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
              <Text style={styles.detailsLabel}>Base Price</Text>
              <Text style={styles.detailsValue}>₹{booking.total_price}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Platform Convenience Fee</Text>
              <Text style={styles.detailsValue}>₹{booking.platform_fee || 0}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Travel & Booking Fee</Text>
              <Text style={styles.detailsValue}>₹{booking.travel_charges || 0}</Text>

            </View>
          </View>
        )}

        <View style={styles.amountCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={styles.amountLabel}>Total Payable Amount (incl. GST)</Text>
              <Text style={styles.amount}>₹{finalAmount || booking?.final_amount || "TBD"}</Text>
            </View>
            <View style={styles.secureTrustCard}>
              <Ionicons name="ribbon-outline" size={24} color={Colors.primary} />
              <Text style={styles.trustText}>Cashfree Verified</Text>
            </View>
          </View>

        </View>

        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {methods.map((item) => (
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

        {/* Security badges at bottom */}
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
            Payments are securely processed by Cashfree. MehndiGo does not store your credit card or banking credentials.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton title={`Pay Securely ₹${finalAmount || ""}`} onPress={handlePay} disabled={loading} />
      </View>

      {/* Cashfree Simulator Overlay */}
      <Modal visible={checkoutModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
              <Text style={styles.modalTitle}>Cashfree Checkout</Text>
            </View>
            <Text style={styles.orderLabel}>Order Ref: {orderId}</Text>
            <Text style={styles.modalAmount}>₹{finalAmount}</Text>

            <TouchableOpacity style={styles.successBtn} onPress={handlePaymentSuccess}>
              <Text style={styles.successBtnText}>Simulate Success</Text>
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
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.white, width: "85%", borderRadius: 20, padding: 24, alignItems: "center" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginLeft: 8, color: Colors.text },
  orderLabel: { fontSize: 10, color: Colors.textTertiary, marginBottom: 4 },
  modalAmount: { fontSize: 28, fontWeight: "800", color: Colors.primary, marginBottom: 24 },
  successBtn: { width: "100%", height: 46, backgroundColor: Colors.success, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  successBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  failBtn: { width: "100%", height: 46, borderWidth: 1, borderColor: Colors.error, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  failBtnText: { color: Colors.error, fontWeight: "700", fontSize: 13 }
});
